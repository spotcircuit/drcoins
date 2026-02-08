import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { orderId, otp } = await req.json();

    if (!orderId || !otp) {
      return NextResponse.json(
        { error: 'Order ID and OTP are required' },
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

    // Check if OTP exists
    if (!order.otpCode || !order.otpExpiresAt) {
      return NextResponse.json(
        { error: 'No verification code found. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if OTP expired
    if (order.otpExpiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if already verified
    if (order.otpVerified) {
      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Already verified'
      });
    }

    // Check attempts (max 3 attempts)
    if (order.otpAttempts >= 3) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Please request a new verification code.' },
        { status: 429 }
      );
    }

    // Verify OTP
    const hashedOTP = hashOTP(otp);
    const isValid = hashedOTP === order.otpCode;

    if (isValid) {
      // Mark as verified
      await prisma.order.update({
        where: { id: order.id },
        data: {
          otpVerified: true,
          otpAttempts: 0
        }
      });

      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Verification successful'
      });
    } else {
      // Increment attempts
      await prisma.order.update({
        where: { id: order.id },
        data: {
          otpAttempts: order.otpAttempts + 1
        }
      });

      const remainingAttempts = 3 - (order.otpAttempts + 1);
      return NextResponse.json(
        { 
          error: `Invalid verification code. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining.` : 'No attempts remaining. Please request a new code.'}` 
        },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('OTP verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify code' },
      { status: 500 }
    );
  }
}

