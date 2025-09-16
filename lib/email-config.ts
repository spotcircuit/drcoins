// Email Configuration
// Centralized email settings for the application

export const emailConfig = {
  // Default sender email
  // IMPORTANT: This domain must be verified in your Resend account
  // To verify: Go to Resend Dashboard > Domains > Add Domain
  fromEmail: 'Dr. Coins <noreply@dr-coins.com>', // Change after domain verification

  // Test domain (fallback)
  // fromEmail: 'Dr. Coins <onboarding@resend.dev>',
  
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
  // Use environment variable if set, otherwise fall back to config
  return process.env.FROM_EMAIL || emailConfig.fromEmail;
}