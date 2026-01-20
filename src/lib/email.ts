export async function sendBookingEmail(staffEmail: string, staffName: string, courseName: string, date: string) {
  const isTestMode = process.env.NEXT_PUBLIC_EMAIL_TEST_MODE === 'true';
  const testRecipient = process.env.NEXT_PUBLIC_TEST_EMAIL_ADDRESS;

  // LOGIC: If test mode is on, overwrite the recipient
  const recipient = isTestMode ? testRecipient : staffEmail;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Training Team <onboarding@resend.dev>', // You can use your own domain later
      to: recipient,
      subject: isTestMode ? `[TEST] Booking: ${courseName}` : `Booking Confirmation: ${courseName}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2>Training Booking Confirmation</h2>
          <p>Hi <strong>${staffName}</strong>,</p>
          <p>You have been booked onto the following course:</p>
          <ul>
            <li><strong>Course:</strong> ${courseName}</li>
            <li><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</li>
          </ul>
          <p>Please ensure this is in your calendar.</p>
          ${isTestMode ? `<p style="color: red;"><strong>Note:</strong> This was a test email intended for ${staffEmail}</p>` : ''}
        </div>
      `,
    }),
  });

  return response.ok;
}
