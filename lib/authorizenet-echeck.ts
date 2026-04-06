// Authorize.Net ACH (eCheck) — used after Plaid Auth supplies routing/account numbers.
// @ts-ignore - CommonJS module
const authorizenet = require('authorizenet');
const ApiContracts = authorizenet.APIContracts;
const ApiControllers = authorizenet.APIControllers;
const Constants = authorizenet.Constants;

const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
merchantAuthenticationType.setName(process.env.AUTHORIZENET_API_LOGIN_ID!);
merchantAuthenticationType.setTransactionKey(process.env.AUTHORIZENET_TRANSACTION_KEY!);

export const isProduction = process.env.AUTHORIZENET_ENV === 'production';

export interface CreateECheckTransactionData {
  amount: number;
  orderId: string;
  items: Array<{ name: string; price: number; quantity: number }>;
  liveMeId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  routingNumber: string;
  accountNumber: string;
  /** Authorize.Net value: checking | savings | businessChecking */
  accountType: string;
  nameOnAccount: string;
  bankName?: string;
  billingAddress: {
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

export const createECheckTransaction = (
  data: CreateECheckTransactionData
): Promise<{ transactionId: string; responseCode: string; authCode?: string; error?: string }> => {
  return new Promise((resolve, reject) => {
    const transactionRequestType = new ApiContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    transactionRequestType.setAmount(data.amount);

    const order = new ApiContracts.OrderType();
    order.setInvoiceNumber(data.orderId);
    order.setDescription(`Dr. Coins Order - LiveMe ID: ${data.liveMeId}`);
    transactionRequestType.setOrder(order);

    const lineItems = new ApiContracts.ArrayOfLineItem();
    const lineItemArray = data.items.map((item) => {
      const lineItem = new ApiContracts.LineItemType();
      lineItem.setItemId(item.name.substring(0, 31));
      lineItem.setName(item.name.substring(0, 31));
      lineItem.setDescription(item.name);
      lineItem.setQuantity(item.quantity);
      lineItem.setUnitPrice(item.price.toFixed(2));
      return lineItem;
    });
    lineItems.setLineItem(lineItemArray);
    transactionRequestType.setLineItems(lineItems);

    const customerData = new ApiContracts.CustomerDataType();
    customerData.setEmail(data.email);
    transactionRequestType.setCustomer(customerData);

    const billTo = new ApiContracts.CustomerAddressType();
    if (data.firstName) billTo.setFirstName(data.firstName);
    if (data.lastName) billTo.setLastName(data.lastName);
    billTo.setAddress(data.billingAddress.address);
    billTo.setCity(data.billingAddress.city);
    billTo.setState(data.billingAddress.state);
    billTo.setZip(data.billingAddress.zip);
    billTo.setCountry(data.billingAddress.country);
    if (data.phone) billTo.setPhoneNumber(data.phone);
    transactionRequestType.setBillTo(billTo);

    const bankAccount = new ApiContracts.BankAccountType();
    bankAccount.setRoutingNumber(data.routingNumber);
    bankAccount.setAccountNumber(data.accountNumber);
    bankAccount.setNameOnAccount(data.nameOnAccount);
    bankAccount.setAccountType(data.accountType);
    bankAccount.setEcheckType(ApiContracts.EcheckTypeEnum.WEB);
    if (data.bankName) bankAccount.setBankName(data.bankName.substring(0, 50));

    const paymentType = new ApiContracts.PaymentType();
    paymentType.setBankAccount(bankAccount);
    transactionRequestType.setPayment(paymentType);

    const createRequest = new ApiContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequestType);

    const ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());

    if (isProduction) {
      ctrl.setEnvironment(Constants.endpoint.production);
    }

    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();
      const response = new ApiContracts.CreateTransactionResponse(apiResponse);

      if (response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
        const transactionResponse = response.getTransactionResponse();
        if (transactionResponse) {
          const responseCode = transactionResponse.getResponseCode();
          const transId = transactionResponse.getTransId();
          const authCode = transactionResponse.getAuthCode();

          if (responseCode === '1') {
            resolve({
              transactionId: transId || '',
              responseCode: responseCode,
              authCode: authCode || undefined
            });
          } else {
            const errorText = transactionResponse.getErrors()?.[0]?.getErrorText() || 'Transaction declined';
            reject({
              error: errorText,
              responseCode: responseCode
            });
          }
        } else {
          reject({ error: 'No transaction response received' });
        }
      } else {
        const errorMessages = response.getMessages().getMessage();
        reject({ error: errorMessages[0].getText() });
      }
    });
  });
};

export function mapPlaidSubtypeToAuthNetAccountType(subtype: string | null | undefined): string {
  const s = (subtype || 'checking').toLowerCase().replace(/ /g, '_');
  if (s === 'savings' || s === 'money_market') {
    return ApiContracts.BankAccountTypeEnum.SAVINGS;
  }
  if (s.includes('business') || s === 'commercial') {
    return ApiContracts.BankAccountTypeEnum.BUSINESSCHECKING;
  }
  return ApiContracts.BankAccountTypeEnum.CHECKING;
}
