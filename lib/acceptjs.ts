// Accept.js transaction processing functions
// The authorizenet module uses CommonJS and exports APIContracts, APIControllers, and Constants
// @ts-ignore - CommonJS module, types are defined in types/authorizenet.d.ts
const authorizenet = require('authorizenet');
const ApiContracts = authorizenet.APIContracts;
const ApiControllers = authorizenet.APIControllers;
const Constants = authorizenet.Constants;

// Initialize Authorize.Net
const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
merchantAuthenticationType.setName(process.env.AUTHORIZENET_API_LOGIN_ID!);
merchantAuthenticationType.setTransactionKey(process.env.AUTHORIZENET_TRANSACTION_KEY!);

export const isProduction = process.env.AUTHORIZENET_ENV === 'production';

export interface OpaqueData {
  dataDescriptor: string;
  dataValue: string;
}

export interface CreateTransactionRequestData {
  amount: number;
  orderId: string;
  items: Array<{ name: string; price: number; quantity: number }>;
  liveMeId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  opaqueData: OpaqueData;
  billingAddress?: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
}

export const createTransactionRequest = (
  data: CreateTransactionRequestData
): Promise<{ transactionId: string; responseCode: string; authCode?: string; error?: string }> => {
  return new Promise((resolve, reject) => {
    // Create transaction request
    const transactionRequestType = new ApiContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    transactionRequestType.setAmount(data.amount);

    // Set order info
    const order = new ApiContracts.OrderType();
    order.setInvoiceNumber(data.orderId);
    order.setDescription(`Dr. Coins Order - LiveMe ID: ${data.liveMeId}`);
    transactionRequestType.setOrder(order);

    // Set line items
    const lineItems = new ApiContracts.ArrayOfLineItem();
    const lineItemArray = data.items.map(item => {
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

    // Set customer info
    const customerData = new ApiContracts.CustomerDataType();
    customerData.setEmail(data.email);
    transactionRequestType.setCustomer(customerData);

    // Set billing address if provided
    if (data.billingAddress || data.firstName || data.lastName) {
      const billTo = new ApiContracts.CustomerAddressType();
      if (data.firstName) billTo.setFirstName(data.firstName);
      if (data.lastName) billTo.setLastName(data.lastName);
      if (data.billingAddress) {
        if (data.billingAddress.address) billTo.address = data.billingAddress.address;
        if (data.billingAddress.city) billTo.city = data.billingAddress.city;
        if (data.billingAddress.state) billTo.state = data.billingAddress.state;
        if (data.billingAddress.zip) billTo.zip = data.billingAddress.zip;
        if (data.billingAddress.country) billTo.country = data.billingAddress.country;
      }
      transactionRequestType.setBillTo(billTo);
    }

    // Set payment data (opaque data from Accept.js)
    const paymentType = new ApiContracts.PaymentType();
    const opaqueDataType = new ApiContracts.OpaqueDataType();
    opaqueDataType.setDataDescriptor(data.opaqueData.dataDescriptor);
    opaqueDataType.setDataValue(data.opaqueData.dataValue);
    paymentType.setOpaqueData(opaqueDataType);
    transactionRequestType.setPayment(paymentType);

    // Create the request
    const createRequest = new ApiContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequestType);

    // Create controller and execute
    const ctrl = new ApiControllers.CreateTransactionController(
      createRequest.getJSON()
    );

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
            // Approved
            resolve({
              transactionId: transId || '',
              responseCode: responseCode,
              authCode: authCode || undefined
            });
          } else {
            // Declined or error
            const errorText = transactionResponse.getErrors()?.[0]?.getErrorText() || 'Transaction declined';
            reject({
              error: errorText,
              responseCode: responseCode
            });
          }
        } else {
          reject({
            error: 'No transaction response received'
          });
        }
      } else {
        const errorMessages = response.getMessages().getMessage();
        reject({
          error: errorMessages[0].getText()
        });
      }
    });
  });
};

