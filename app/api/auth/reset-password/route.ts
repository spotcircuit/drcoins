import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateTempPassword(): string {
  return Math.random().toString(36).slice(-8);
}

export async function POST(req: NextRequest) {
  try {
    const { email, newPassword, tempPassword } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email required' },
        { status: 400 }
      );
    }

    // Find customer
    const customers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    if (customers.data.length === 0) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      );
    }

    const customer = customers.data[0];

    // If setting new password with temp password
    if (newPassword && tempPassword) {
      const storedTempPassword = customer.metadata.tempPassword;
      
      if (!storedTempPassword || hashPassword(tempPassword) !== storedTempPassword) {
        return NextResponse.json(
          { error: 'Invalid temporary password' },
          { status: 401 }
        );
      }

      // Set new password
      await stripe.customers.update(customer.id, {
        metadata: {
          ...customer.metadata,
          password: hashPassword(newPassword),
          tempPassword: '' // Clear temp password
        }
      });

      return NextResponse.json({ 
        success: true,
        message: 'Password updated successfully' 
      });
    }

    // Generate and send temp password
    const tempPasswordPlain = generateTempPassword();
    
    await stripe.customers.update(customer.id, {
      metadata: {
        ...customer.metadata,
        tempPassword: hashPassword(tempPasswordPlain),
        tempPasswordExpiry: Date.now() + (3600000) // 1 hour
      }
    });

    // In production, send email here
    // For now, return it (remove this in production!)
    return NextResponse.json({
      success: true,
      message: 'Reset password sent to email',
      tempPassword: tempPasswordPlain // REMOVE IN PRODUCTION - send via email instead
    });

  } catch (error: any) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Password reset failed' },
      { status: 500 }
    );
  }
}