import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { getSenderEmail } from '@/lib/email-config';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash OTP for storage
function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { orderId, email } = await req.json();

    if (!orderId || !email) {
      return NextResponse.json(
        { error: 'Order ID and email are required' },
        { status: 400 }
      );
    }

    // Find order
    const order = await prisma.order.findUnique({
      where: { orderId }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if OTP was recently sent (rate limiting - max 1 per minute)
    if (order.otpExpiresAt && order.otpExpiresAt > new Date()) {
      const timeLeft = Math.ceil((order.otpExpiresAt.getTime() - Date.now()) / 1000);
      if (timeLeft > 540) { // Less than 1 minute since last OTP
        return NextResponse.json(
          { error: `Please wait ${Math.ceil(timeLeft - 540)} seconds before requesting a new OTP` },
          { status: 429 }
        );
      }
    }

    // Generate OTP
    const otp = generateOTP();
    const hashedOTP = hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update order with OTP
    await prisma.order.update({
      where: { id: order.id },
      data: {
        otpCode: hashedOTP,
        otpExpiresAt: expiresAt,
        otpVerified: false,
        otpAttempts: 0 // Reset attempts
      }
    });

    // Send OTP email
    try {
      await resend.emails.send({
        from: getSenderEmail(),
        to: email,
        subject: 'Your Purchase Verification Code - Dr. Coins',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c3aed;">Purchase Verification Code</h2>
            <p>To complete your purchase, please enter the following verification code:</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h1 style="color: #7c3aed; font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
            </p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              - The Dr. Coins Team
            </p>
          </div>
        `,
        text: `Your purchase verification code is: ${otp}. This code expires in 10 minutes.`
      });
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification code. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email'
    });

  } catch (error: any) {
    console.error('OTP generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate verification code' },
      { status: 500 }
    );
  }
}

