import { createClient } from '@supabase/supabase-js';

/**
 * Helper utilities for email operations
 * Use these functions to interact with the email API from anywhere in your app
 */

export async function sendBookingConfirmation(staffId: string, eventId: string) {
  try {
    const response = await fetch('/api/send-booking-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId, eventId })
    });
    const data = await response.json();
    return { success: response.ok, ...data };
  } catch (error) {
    console.error('Error sending booking confirmation:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

export async function sendBookingCancellation(staffId: string, eventId: string, reason?: string) {
  try {
    const response = await fetch('/api/send-booking-cancellation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId, eventId, reason })
    });
    const data = await response.json();
    return { success: response.ok, ...data };
  } catch (error) {
    console.error('Error sending cancellation email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

export async function sendCourseNotification(eventId: string) {
  try {
    const response = await fetch('/api/send-course-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, notifyAllStaff: true })
    });
    const data = await response.json();
    return { success: response.ok, ...data };
  } catch (error) {
    console.error('Error sending course notification:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send multiple booking confirmations in parallel
 * Useful for bulk booking operations
 */
export async function sendBulkBookingConfirmations(staffIds: string[], eventId: string) {
  const promises = staffIds.map(staffId => sendBookingConfirmation(staffId, eventId));
  const results = await Promise.all(promises);
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  return {
    total: staffIds.length,
    successful,
    failed,
    results
  };
}

/**
 * Retry failed email with exponential backoff
 * Useful for handling temporary failures
 */
export async function retryEmailWithBackoff(
  emailFn: () => Promise<{ success: boolean }>,
  maxRetries: number = 3,
  initialDelay: number = 1000
) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await emailFn();
      if (result.success) return { success: true, attempt };
      
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return { success: false, attempt: maxRetries };
}

/**
 * Get email delivery status from logs
 * Can be implemented if you add email logs table to database
 */
export async function getEmailDeliveryStatus(emailId: string) {
  // TODO: Implement when adding email logs table
  console.log('Email delivery status tracking coming soon');
}

/**
 * Send password reset email to a staff member
 * Generates a magic link for them to set their password
 */
export async function sendPasswordReset(email: string, staffName: string) {
  try {
    const response = await fetch('/api/send-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, staffName })
    });
    const data = await response.json();
    return { success: response.ok, ...data };
  } catch (error) {
    console.error('Error sending password reset:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Send password reset emails to multiple staff members
 * Useful for bulk invitations
 */
export async function sendBulkPasswordResets(staffList: Array<{ email: string; full_name: string }>) {
  const promises = staffList.map(staff => 
    sendPasswordReset(staff.email, staff.full_name)
  );
  const results = await Promise.all(promises);
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  return {
    total: staffList.length,
    successful,
    failed,
    results
  };
}
