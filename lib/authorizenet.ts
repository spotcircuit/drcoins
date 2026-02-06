// The authorizenet module uses CommonJS and exports APIContracts, APIControllers, and Constants
// We use require() to properly handle this CommonJS module in Next.js
// @ts-ignore - CommonJS module, types are defined in types/authorizenet.d.ts
const authorizenet = require('authorizenet');
const ApiContracts = authorizenet.APIContracts;
const ApiControllers = authorizenet.APIControllers;
const Constants = authorizenet.Constants;

// Initialize Authorize.Net
const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
merchantAuthenticationType.setName(process.env.AUTHORIZENET_API_LOGIN_ID!);
merchantAuthenticationType.setTransactionKey(process.env.AUTHORIZENET_TRANSACTION_KEY!);

// Use sandbox or production
export const isProduction = process.env.AUTHORIZENET_ENV === 'production';

export const getHostedPaymentPageRequest = (orderData: {
  orderId: string;
  amount: number;
  items: Array<{ name: string; price: number; quantity: number }>;
  liveMeId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}) => {
  const transactionRequestType = new ApiContracts.TransactionRequestType();
  transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
  transactionRequestType.setAmount(orderData.amount);

  // Set order info
  const order = new ApiContracts.OrderType();
  order.setInvoiceNumber(orderData.orderId);
  order.setDescription(`Dr. Coins Order - LiveMe ID: ${orderData.liveMeId}`);
  transactionRequestType.setOrder(order);

  // Set line items
  const lineItems = new ApiContracts.ArrayOfLineItem();
  const lineItemArray = orderData.items.map(item => {
    const lineItem = new ApiContracts.LineItemType();
    lineItem.setItemId(item.name.substring(0, 31)); // Max 31 chars
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
  customerData.setEmail(orderData.email);
  transactionRequestType.setCustomer(customerData);

  // Set billing info if provided
  if (orderData.firstName && orderData.lastName) {
    const billTo = new ApiContracts.CustomerAddressType();
    billTo.setFirstName(orderData.firstName);
    billTo.setLastName(orderData.lastName);
    transactionRequestType.setBillTo(billTo);
  }

  // Create hosted payment page settings
  const setting1 = new ApiContracts.SettingType();
  setting1.setSettingName('hostedPaymentReturnOptions');
  setting1.setSettingValue(JSON.stringify({
    showReceipt: false,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/authorizenet/return`,
    urlText: 'Continue',
    cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/`,
    cancelUrlText: 'Cancel'
  }));

  const setting2 = new ApiContracts.SettingType();
  setting2.setSettingName('hostedPaymentButtonOptions');
  setting2.setSettingValue(JSON.stringify({
    text: 'Pay'
  }));

  const setting3 = new ApiContracts.SettingType();
  setting3.setSettingName('hostedPaymentStyleOptions');
  setting3.setSettingValue(JSON.stringify({
    bgColor: '#7c3aed' // Purple to match theme
  }));

  const setting4 = new ApiContracts.SettingType();
  setting4.setSettingName('hostedPaymentPaymentOptions');
  setting4.setSettingValue(JSON.stringify({
    cardCodeRequired: true,
    showCreditCard: true,
    showBankAccount: false
  }));

  const setting5 = new ApiContracts.SettingType();
  setting5.setSettingName('hostedPaymentSecurityOptions');
  setting5.setSettingValue(JSON.stringify({
    captcha: false
  }));

  const setting6 = new ApiContracts.SettingType();
  setting6.setSettingName('hostedPaymentShippingAddressOptions');
  setting6.setSettingValue(JSON.stringify({
    show: false,
    required: false
  }));

  const setting7 = new ApiContracts.SettingType();
  setting7.setSettingName('hostedPaymentBillingAddressOptions');
  setting7.setSettingValue(JSON.stringify({
    show: true,
    required: true
  }));

  const setting8 = new ApiContracts.SettingType();
  setting8.setSettingName('hostedPaymentCustomerOptions');
  setting8.setSettingValue(JSON.stringify({
    showEmail: true,
    requiredEmail: true,
    addPaymentProfile: true
  }));

  const setting9 = new ApiContracts.SettingType();
  setting9.setSettingName('hostedPaymentOrderOptions');
  setting9.setSettingValue(JSON.stringify({
    show: true,
    merchantName: 'Dr. Coins'
  }));

  const settingList = [];
  settingList.push(setting1);
  settingList.push(setting2);
  settingList.push(setting3);
  settingList.push(setting4);
  settingList.push(setting5);
  settingList.push(setting6);
  settingList.push(setting7);
  settingList.push(setting8);
  settingList.push(setting9);

  const alist = new ApiContracts.ArrayOfSetting();
  alist.setSetting(settingList);

  const getRequest = new ApiContracts.GetHostedPaymentPageRequest();
  getRequest.setMerchantAuthentication(merchantAuthenticationType);
  getRequest.setTransactionRequest(transactionRequestType);
  getRequest.setHostedPaymentSettings(alist);

  return getRequest;
};

export const getHostedPaymentPage = (
  getRequest: any
): Promise<{ token: string; error?: string }> => {
  return new Promise((resolve, reject) => {
    const ctrl = new ApiControllers.GetHostedPaymentPageController(
      getRequest.getJSON()
    );

    if (isProduction) {
      ctrl.setEnvironment(Constants.endpoint.production);
    }

    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();
      const response = new ApiContracts.GetHostedPaymentPageResponse(apiResponse);

      if (response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
        resolve({ token: response.getToken() });
      } else {
        const errorMessages = response.getMessages().getMessage();
        reject({
          error: errorMessages[0].getText()
        });
      }
    });
  });
};

export const getTransactionDetails = (transId: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const getRequest = new ApiContracts.GetTransactionDetailsRequest();
    getRequest.setMerchantAuthentication(merchantAuthenticationType);
    getRequest.setTransId(transId);

    const ctrl = new ApiControllers.GetTransactionDetailsController(
      getRequest.getJSON()
    );

    if (isProduction) {
      ctrl.setEnvironment(Constants.endpoint.production);
    }

    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();
      const response = new ApiContracts.GetTransactionDetailsResponse(apiResponse);

      if (response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
        resolve(response.getTransaction());
      } else {
        reject({
          error: response.getMessages().getMessage()[0].getText()
        });
      }
    });
  });
};
