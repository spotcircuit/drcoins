// Email Configuration
// Centralized email settings for the application

export const emailConfig = {
  // Default sender email
  // IMPORTANT: This domain must be verified in your Resend account
  // To verify: Go to Resend Dashboard > Domains > Add Domain
  fromEmail: 'Dr. Coins <onboarding@resend.dev>', // Using Resend's test domain for now
  
  // Production sender email (use after domain verification)
  // fromEmail: 'Dr. Coins <noreply@dr-coins.com>',
  
  // Reply-to email for customer support
  replyTo: 'support@dr-coins.com',
  
  // Email templates
  templates: {
    paymentSuccess: {
      subject: 'Payment Successful - Dr. Coins',
    },
    orderFulfilled: {
      subject: 'Order Fulfilled - Your Coins Have Been Delivered!',
    },
    adminNotification: {
      subject: (liveMeId: string) => `New Order - ${liveMeId || 'No LiveMe ID'}`,
    },
  },
};

// Helper to get the sender email
export function getSenderEmail(): string {
  // You can add logic here to use different emails for dev/staging/production
  if (process.env.NODE_ENV === 'development') {
    return 'Dr. Coins <onboarding@resend.dev>';
  }
  
  // For production, ensure domain is verified
  return emailConfig.fromEmail;
}