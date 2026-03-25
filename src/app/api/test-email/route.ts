import { NextResponse } from 'next/server';
import { getEmailSendOptionsFromHeaders, sendBulkEmailDetailed } from '@/lib/email';
import { requireRole } from '@/lib/apiAuth';

export async function POST(request: Request) {
  const authz = await requireRole(['admin', 'scheduler']);
  if ('error' in authz) return authz.error;

  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 });
    }

    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
        
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1e40af; font-size: 28px; margin: 0; font-weight: bold;">📧 Email Test</h1>
          <p style="color: #64748b; font-size: 16px; margin: 8px 0 0 0;">Testing email configuration</p>
        </div>

        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #3b82f6;">
          <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 15px 0;">✅ Email System Working!</h2>
          <p style="color: #64748b; font-size: 16px; margin: 0;">This is a test email to verify that your email configuration is working correctly.</p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            If you receive this email, your email system is configured correctly! 🎉
          </p>
        </div>

      </div>
    `;

    const emailOptions = getEmailSendOptionsFromHeaders(
      request.headers.get('x-email-test-mode'),
      request.headers.get('x-test-email-address')
    );

    const result = await sendBulkEmailDetailed([email], '✅ Email Test - Training Portal', testHtml, emailOptions);

    if (result.success) {
      return NextResponse.json({ 
        message: 'Test email sent successfully!',
        sent_to: email,
        provider: result.provider,
        test_mode: result.testMode,
        delivered_recipients: result.deliveredRecipients,
        message_id: result.messageId || null,
      }, { status: 200 });
    } else {
      return NextResponse.json({ 
        error: 'Failed to send test email',
        provider: result.provider,
        test_mode: result.testMode,
        delivered_recipients: result.deliveredRecipients,
        details: result.errorText || null,
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
