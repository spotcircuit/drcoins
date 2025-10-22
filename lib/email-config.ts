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

  // Bulk email templates
  bulkTemplates: {
    specialOffer: {
      subject: 'Special Offer from Dr. Coins',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; text-align: center;">Special Offer!</h1>
          <p>Dear Valued Customer,</p>
          <p>We have an exclusive offer just for you!</p>
          <p>[Your offer details here]</p>
          <p>Thank you for being a loyal customer of Dr. Coins.</p>
          <p style="margin-top: 30px;">Best regards,<br/>The Dr. Coins Team</p>
        </div>
      `,
    },
    serviceUpdate: {
      subject: 'Important Service Update - Dr. Coins',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; text-align: center;">Service Update</h1>
          <p>Dear Customer,</p>
          <p>We wanted to inform you about an important update to our service.</p>
          <p>[Your update details here]</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p style="margin-top: 30px;">Best regards,<br/>The Dr. Coins Team</p>
        </div>
      `,
    },
    thankYou: {
      subject: 'Thank You from Dr. Coins',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; text-align: center;">Thank You!</h1>
          <p>Dear Valued Customer,</p>
          <p>We wanted to take a moment to thank you for your continued support and business.</p>
          <p>Your trust in Dr. Coins means everything to us, and we're committed to providing you with the best service possible.</p>
          <p style="margin-top: 30px;">Best regards,<br/>The Dr. Coins Team</p>
        </div>
      `,
    },
    custom: {
      subject: '',
      html: '',
    },
  },
};

// Helper to get the sender email
export function getSenderEmail(): string {
  // Use environment variable if set, otherwise fall back to config
  return process.env.FROM_EMAIL || emailConfig.fromEmail;
}