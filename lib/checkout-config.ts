// Checkout Configuration for Digital Products
// This file controls country restrictions and other checkout settings

export const checkoutConfig = {
  // Set to true to allow worldwide ordering, false to restrict to specific countries
  allowWorldwide: true,
  
  // If allowWorldwide is false, specify allowed countries using ISO country codes
  // Full list: https://stripe.com/docs/api/checkout/sessions/create#create_checkout_session-billing_address_collection
  allowedCountries: [
    'US', // United States
    'CA', // Canada
    'GB', // United Kingdom
    'AU', // Australia
    'NZ', // New Zealand
    // Add more country codes as needed
  ],
  
  // Countries to block (only works if you create a Payment Method Configuration in Stripe Dashboard)
  // This takes precedence over allowedCountries
  blockedCountries: [] as string[],
  // To block countries, uncomment and add codes like:
  // blockedCountries: ['KP', 'IR'],
  
  // Collect billing address for payment verification and fraud prevention
  collectBillingAddress: true,
  
  // Collect phone number for customer support
  collectPhoneNumber: true,
  
  // Payment methods to accept
  paymentMethods: ['card', 'cashapp', 'link'],
  
  // Optional: Stripe Payment Method Configuration ID
  // Create this in Stripe Dashboard under Settings > Payment methods > Configurations
  // This allows more granular control over payment methods and countries
  paymentMethodConfigurationId: process.env.STRIPE_PAYMENT_METHOD_CONFIG_ID || null,
};

// Helper function to get billing address collection config
export function getBillingAddressConfig() {
  if (!checkoutConfig.collectBillingAddress) {
    return 'auto'; // Stripe determines if needed
  }
  
  // Note: Stripe doesn't support direct country restrictions in billing_address_collection
  // You need to use Payment Method Configurations for country restrictions
  return 'required';
}

// Helper function to validate if a country is allowed
export function isCountryAllowed(countryCode: string): boolean {
  // If blocked countries are specified, check those first
  if (checkoutConfig.blockedCountries.length > 0) {
    if (checkoutConfig.blockedCountries.includes(countryCode)) {
      return false;
    }
  }
  
  // If worldwide is allowed, return true (unless blocked above)
  if (checkoutConfig.allowWorldwide) {
    return true;
  }
  
  // Otherwise check if country is in allowed list
  return checkoutConfig.allowedCountries.includes(countryCode);
}