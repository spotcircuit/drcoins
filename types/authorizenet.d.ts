declare module 'authorizenet' {
  // Define the APIContracts namespace with all classes
  namespace APIContracts {
    class MerchantAuthenticationType {
      setName(name: string): void;
      setTransactionKey(key: string): void;
    }

    class TransactionRequestType {
      setTransactionType(type: TransactionTypeEnum): void;
      setAmount(amount: number): void;
      setOrder(order: OrderType): void;
      setLineItems(lineItems: ArrayOfLineItem): void;
      setCustomer(customer: CustomerDataType): void;
      setBillTo(billTo: CustomerAddressType): void;
      setPayment(payment: PaymentType): void;
    }

    class OrderType {
      setInvoiceNumber(invoiceNumber: string): void;
      setDescription(description: string): void;
      getInvoiceNumber(): string | null;
    }

    class LineItemType {
      setItemId(itemId: string): void;
      setName(name: string): void;
      setDescription(description: string): void;
      setQuantity(quantity: number): void;
      setUnitPrice(price: string): void;
    }

    class ArrayOfLineItem {
      getLineItem(): LineItemType[];
    }

    class CustomerDataType {
      setEmail(email: string): void;
    }

    class CustomerAddressType {
      setFirstName(firstName: string): void;
      setLastName(lastName: string): void;
      address?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    }

    class SettingType {
      setSettingName(name: string): void;
      setSettingValue(value: string): void;
    }

    class ArrayOfSetting {
      setSetting(settings: SettingType[]): void;
    }

    class GetHostedPaymentPageRequest {
      setMerchantAuthentication(auth: MerchantAuthenticationType): void;
      setTransactionRequest(request: TransactionRequestType): void;
      setHostedPaymentSettings(settings: ArrayOfSetting): void;
      getJSON(): string;
    }

    class GetHostedPaymentPageResponse {
      constructor(response: any);
      getToken(): string;
      getMessages(): MessagesType;
    }

    class GetTransactionDetailsRequest {
      setMerchantAuthentication(auth: MerchantAuthenticationType): void;
      setTransId(transId: string): void;
      getJSON(): string;
    }

    class GetTransactionDetailsResponse {
      constructor(response: any);
      getMessages(): MessagesType;
      getTransaction(): TransactionType;
    }

    class TransactionType {
      getOrder(): OrderType | null;
      getResponseCode(): number;
      getAuthCode(): string | null;
    }

    class PaymentType {
      setOpaqueData(opaqueData: OpaqueDataType): void;
    }

    class OpaqueDataType {
      setDataDescriptor(descriptor: string): void;
      setDataValue(value: string): void;
    }

    class CreateTransactionRequest {
      setMerchantAuthentication(auth: MerchantAuthenticationType): void;
      setTransactionRequest(request: TransactionRequestType): void;
      getJSON(): string;
    }

    class CreateTransactionResponse {
      constructor(response: any);
      getMessages(): MessagesType;
      getTransactionResponse(): TransactionResponse | null;
    }

    class TransactionResponse {
      getResponseCode(): string;
      getTransId(): string | null;
      getAuthCode(): string | null;
      getErrors(): TransactionError[] | null;
    }

    class TransactionError {
      getErrorText(): string;
      getErrorCode(): string;
    }

    class MessagesType {
      getResultCode(): MessageTypeEnum;
      getMessage(): MessageType[];
    }

    class MessageType {
      getText(): string;
    }

    enum TransactionTypeEnum {
      AUTHCAPTURETRANSACTION = 'authCaptureTransaction'
    }

    enum MessageTypeEnum {
      OK = 'Ok',
      ERROR = 'Error'
    }
  }

  namespace APIControllers {
    class GetHostedPaymentPageController {
      constructor(requestJson: string);
      setEnvironment(endpoint: string): void;
      execute(callback: () => void): void;
      getResponse(): any;
    }

    class GetTransactionDetailsController {
      constructor(requestJson: string);
      setEnvironment(endpoint: string): void;
      execute(callback: () => void): void;
      getResponse(): any;
    }

    class CreateTransactionController {
      constructor(requestJson: string);
      setEnvironment(endpoint: string): void;
      execute(callback: () => void): void;
      getResponse(): any;
    }
  }

  namespace Constants {
    namespace endpoint {
      const production: string;
      const sandbox: string;
    }
  }

  // CommonJS module exports - the module exports an object with APIContracts, APIControllers, and Constants
  interface AuthorizeNetModule {
    APIContracts: typeof APIContracts;
    APIControllers: typeof APIControllers;
    Constants: typeof Constants;
  }

  const moduleExports: AuthorizeNetModule;
  
  // Export as CommonJS (module.exports = { APIContracts, APIControllers })
  export = moduleExports;
}
