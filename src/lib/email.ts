export async function sendBookingEmail(staffEmail: string, staffName: string, courseName: string, date: string) {
  const isTestMode = process.env.NEXT_PUBLIC_EMAIL_TEST_MODE === 'true';
  const testRecipient = process.env.NEXT_PUBLIC_TEST_EMAIL_ADDRESS;

  // LOGIC: If test mode is on, overwrite the recipient
  const recipient = isTestMode ? testRecipient : staffEmail;

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Training Team <onboarding@resend.dev>',
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

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Resend API error response:', { status: response.status, data });
      return false;
    }

    console.log('Email sent successfully:', { id: data.id, to: recipient });
    return true;
  } catch (error) {
    console.error('Resend fetch error:', error);
    return false;
  }
}

export async function sendBookingCancellationEmail(staffEmail: string, staffName: string, courseName: string, date: string, reason?: string) {
  const isTestMode = process.env.NEXT_PUBLIC_EMAIL_TEST_MODE === 'true';
  const testRecipient = process.env.NEXT_PUBLIC_TEST_EMAIL_ADDRESS;
  const recipient = isTestMode ? testRecipient : staffEmail;

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Training Team <onboarding@resend.dev>',
        to: recipient,
        subject: isTestMode ? `[TEST] Booking Cancelled: ${courseName}` : `Booking Cancelled: ${courseName}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #fee2e2; border-radius: 10px; background-color: #fef2f2;">
            <h2 style="color: #dc2626;">Booking Cancelled</h2>
            <p>Hi <strong>${staffName}</strong>,</p>
            <p>Your booking for the following course has been cancelled:</p>
            <ul>
              <li><strong>Course:</strong> ${courseName}</li>
              <li><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</li>
              ${reason ? `<li><strong>Reason:</strong> ${reason}</li>` : ''}
            </ul>
            <p>If you have any questions, please contact the training team.</p>
            ${isTestMode ? `<p style="color: red;"><strong>Note:</strong> This was a test email intended for ${staffEmail}</p>` : ''}
          </div>
        `,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Resend API error response:', { status: response.status, data });
      return false;
    }

    console.log('Email sent successfully:', { id: data.id, to: recipient });
    return true;
  } catch (error) {
    console.error('Resend fetch error:', error);
    return false;
  }
}

export async function sendCourseScheduledEmail(staffEmail: string, staffName: string, courseName: string, date: string, startTime: string, endTime: string, location: string) {
  const isTestMode = process.env.NEXT_PUBLIC_EMAIL_TEST_MODE === 'true';
  const testRecipient = process.env.NEXT_PUBLIC_TEST_EMAIL_ADDRESS;
  const recipient = isTestMode ? testRecipient : staffEmail;

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Training Team <onboarding@resend.dev>',
        to: recipient,
        subject: isTestMode ? `[TEST] New Course Scheduled: ${courseName}` : `New Course Scheduled: ${courseName}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #dbeafe; border-radius: 10px; background-color: #f0f9ff;">
            <h2 style="color: #0284c7;">New Training Course Available</h2>
            <p>Hi <strong>${staffName}</strong>,</p>
            <p>A new training course has been scheduled that may be relevant to you:</p>
            <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>📚 Course:</strong> ${courseName}</p>
              <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${new Date(date).toLocaleDateString()}</p>
              <p style="margin: 5px 0;"><strong>⏰ Time:</strong> ${startTime} - ${endTime}</p>
              <p style="margin: 5px 0;"><strong>📍 Location:</strong> ${location}</p>
            </div>
            <p>Log in to the training portal to book your place.</p>
            ${isTestMode ? `<p style="color: red;"><strong>Note:</strong> This was a test email intended for ${staffEmail}</p>` : ''}
          </div>
        `,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Resend API error response:', { status: response.status, data });
      return false;
    }

    console.log('Email sent successfully:', { id: data.id, to: recipient });
    return true;
  } catch (error) {
    console.error('Resend fetch error:', error);
    return false;
  }
}

export async function sendBulkEmail(emails: string[], subject: string, htmlContent: string) {
  const isTestMode = process.env.NEXT_PUBLIC_EMAIL_TEST_MODE === 'true';
  const testRecipient = process.env.NEXT_PUBLIC_TEST_EMAIL_ADDRESS;

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    return false;
  }

  // If test mode, send to test email only
  const recipients = isTestMode ? [testRecipient] : emails;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Training Team <onboarding@resend.dev>',
        to: recipients,
        subject: isTestMode ? `[TEST] ${subject}` : subject,
        html: htmlContent,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Resend API error response:', { status: response.status, data });
      return false;
    }

    console.log('Email sent successfully:', { id: data.id, recipients: recipients.length });
    return true;
  } catch (error) {
    console.error('Resend fetch error:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(staffEmail: string, staffName: string, resetLink: string) {
  const isTestMode = process.env.NEXT_PUBLIC_EMAIL_TEST_MODE === 'true';
  const testRecipient = process.env.NEXT_PUBLIC_TEST_EMAIL_ADDRESS;
  const recipient = isTestMode ? testRecipient : staffEmail;

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Training Team <onboarding@resend.dev>',
        to: recipient,
        subject: isTestMode ? `[TEST] Set Your Password - Training Portal` : `Set Your Password - Training Portal`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #dbeafe; border-radius: 10px; background-color: #f0f9ff;">
            <h2 style="color: #0284c7;">Welcome to the Training Portal</h2>
            <p>Hi <strong>${staffName}</strong>,</p>
            <p>You've been added to the Training Booking Portal. Click the link below to set your password and get started:</p>
            
            <div style="margin: 25px 0; text-align: center;">
              <a href="${resetLink}" style="background-color: #0284c7; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                Set Your Password
              </a>
            </div>

            <p style="font-size: 13px; color: #666;">Or copy and paste this link in your browser:</p>
            <p style="font-size: 12px; word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 5px; color: #374151;">
              ${resetLink}
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            
            <p>Once you've set your password, you can log in and:</p>
            <ul style="color: #374151;">
              <li>View available training courses</li>
              <li>Book courses and manage your schedule</li>
              <li>Track your training progress</li>
            </ul>

            <p style="color: #666; font-size: 13px; margin-top: 20px;">This link will expire in 24 hours. If you have any questions, contact the training team.</p>
            
            ${isTestMode ? `<p style="color: red; margin-top: 15px;"><strong>Note:</strong> This was a test email intended for ${staffEmail}</p>` : ''}
          </div>
        `,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Resend API error response:', { status: response.status, data });
      return false;
    }

    console.log('Email sent successfully:', { id: data.id, to: recipient });
    return true;
  } catch (error) {
    console.error('Resend fetch error:', error);
    return false;
  }
}
