import nodemailer from 'nodemailer';
import { JWT } from 'google-auth-library';

// Initialize transporter based on authentication method
function createTransporter() {
  const useServiceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (useServiceAccount) {
    // Service Account authentication for Google Groups
    const serviceAccountKey = JSON.parse(
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}'
    );

    const jwtClient = new JWT({
      email: serviceAccountKey.client_email,
      key: serviceAccountKey.private_key,
      scopes: ['https://www.googleapis.com/auth/gmail.send'],
    });

    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        xoauth2: jwtClient,
      },
    } as any);
  } else {
    // Fallback to App Password authentication
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
}

const transporter = createTransporter();

const SENDER_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GMAIL_USER || 'noreply@example.com';
const SENDER_NAME = 'Training Team';

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const hasServiceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const hasAppPassword = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD;

    if (!hasServiceAccount && !hasAppPassword) {
      console.error('Gmail credentials not configured (either service account or app password required)');
      return false;
    }

    const info = await transporter.sendMail({
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to,
      subject,
      html,
    });

    console.log('Email sent successfully:', { id: info.messageId, to });
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(staffEmail: string, staffName: string, resetLink: string) {
  const subject = 'Reset Your Password - Training Portal';
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #dbeafe; border-radius: 10px; background-color: #f0f9ff;">
      <h2 style="color: #0284c7;">Reset Your Password</h2>
      <p>Hi <strong>${staffName}</strong>,</p>
      <p>You can use this link to change your password whenever you'd like:</p>
      
      <div style="margin: 25px 0; text-align: center;">
        <a href="${resetLink}" style="background-color: #0284c7; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          Reset Your Password
        </a>
      </div>

      <p style="font-size: 13px; color: #666;">Or copy and paste this link in your browser:</p>
      <p style="font-size: 12px; word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 5px; color: #374151;">
        ${resetLink}
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
      
      <p style="color: #666; font-size: 13px;">This link will expire in 24 hours.</p>
      <p style="color: #666; font-size: 13px;">If you have any questions, contact the training team.</p>
    </div>
  `;

  return await sendEmail(staffEmail, subject, html);
}

// Stub functions for email types not yet implemented with service account
export async function sendBookingEmail(staffEmail: string, staffName: string, courseName: string, date: string) {
  console.warn('sendBookingEmail not yet configured with service account');
  return false;
}

export async function sendBookingCancellationEmail(staffEmail: string, staffName: string, courseName: string, date: string, reason?: string) {
  console.warn('sendBookingCancellationEmail not yet configured with service account');
  return false;
}

export async function sendBulkEmail(emails: string[], subject: string, htmlContent: string) {
  console.warn('sendBulkEmail not yet configured with service account');
  return false;
}

export { sendEmail };
