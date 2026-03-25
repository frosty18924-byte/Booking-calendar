import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function maskEmail(value: string | undefined) {
  if (!value) return null;
  const at = value.indexOf('@');
  if (at <= 1) return '***';
  return `${value[0]}***${value.slice(at - 1)}`;
}

export async function GET() {
  const authz = await requireRole(['admin']);
  if ('error' in authz) return authz.error;

  const hasSmtpUrl = Boolean(process.env.SMTP_URL);
  const hasSmtpConfig = Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT);
  const hasGmailUser = Boolean(process.env.GMAIL_USER);
  const hasGmailAppPassword = Boolean(process.env.GMAIL_APP_PASSWORD);

  const provider =
    hasSmtpUrl || hasSmtpConfig ? 'smtp' : hasGmailUser && hasGmailAppPassword ? 'gmail_app_password' : 'unknown';

  return NextResponse.json({
    provider,
    hasSmtpUrl,
    hasSmtpConfig,
    hasGmailUser,
    hasGmailAppPassword,
    emailFrom: maskEmail(process.env.EMAIL_FROM),
    gmailUser: maskEmail(process.env.GMAIL_USER),
  });
}

