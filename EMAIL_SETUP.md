# Email Notification System Setup Guide

## Overview
Your application now has a complete email notification system using **Resend** as the email service provider. Emails are automatically sent for:
- ✅ Booking confirmations
- ✅ Booking cancellations
- ✅ New course announcements (to all staff)

## How It Works

### Architecture
1. **Frontend** → User creates booking/cancels/schedules course
2. **Database** → Booking is saved to Supabase
3. **API Routes** → `/api/send-*` endpoints handle email logic
4. **Resend** → Sends emails via third-party service

### Email Triggers

#### 1. Booking Confirmation
- **When:** Staff member is added to a course
- **Who Gets It:** The booked staff member
- **Content:** Course name, date, time

#### 2. Booking Cancellation
- **When:** Staff member is removed from a booking
- **Who Gets It:** The cancelled staff member
- **Content:** Course name, date, cancellation reason

#### 3. Course Scheduled Announcement
- **When:** New training event is created
- **Who Gets It:** ALL staff members
- **Content:** Course name, date, time, location

## Setup Instructions

### 1. Get a Resend Account
- Go to [resend.com](https://resend.com)
- Sign up for free
- Get your API key from the dashboard

### 2. Update Environment Variables
Add these to your `.env.local` file:

```env
RESEND_API_KEY=re_xxx_your_actual_key_here
NEXT_PUBLIC_EMAIL_TEST_MODE=false
NEXT_PUBLIC_TEST_EMAIL_ADDRESS=your-email@example.com
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Important:** The `SUPABASE_SERVICE_ROLE_KEY` is needed for the API routes to fetch data. Get it from:
- Supabase Dashboard → Settings → API → Service Role Key

### 3. Test Mode (Recommended for Development)

During development, use test mode to avoid sending real emails:

```env
NEXT_PUBLIC_EMAIL_TEST_MODE=true
NEXT_PUBLIC_TEST_EMAIL_ADDRESS=your-dev-email@example.com
```

When test mode is ON:
- All emails go to `NEXT_PUBLIC_TEST_EMAIL_ADDRESS`
- Subject lines are prefixed with `[TEST]`
- Emails show they were intended for the original recipient

### 4. Production Setup

Once ready to go live:

```env
NEXT_PUBLIC_EMAIL_TEST_MODE=false
# Remove the test email or update as needed
```

## API Endpoints

### POST `/api/send-booking-confirmation`
Sends booking confirmation email

**Request Body:**
```json
{
  "staffId": "uuid",
  "eventId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent"
}
```

### POST `/api/send-booking-cancellation`
Sends booking cancellation email

**Request Body:**
```json
{
  "staffId": "uuid",
  "eventId": "uuid",
  "reason": "Optional cancellation reason"
}
```

### POST `/api/send-course-notification`
Sends course announcement to all staff

**Request Body:**
```json
{
  "eventId": "uuid",
  "notifyAllStaff": true
}
```

## Email Template Customization

Edit email templates in `src/lib/email.ts`:

### Booking Confirmation
- Located in `sendBookingEmail()` function
- Customize the HTML template to match your branding

### Booking Cancellation
- Located in `sendBookingCancellationEmail()` function
- Change colors (currently using red theme)

### Course Announcement
- Located in `sendCourseScheduledEmail()` and `sendBulkEmail()` functions
- Update with your company logo, colors, etc.

### From Address
All emails currently use: `Training Team <onboarding@resend.dev>`

To use your own domain:
1. Verify domain in Resend dashboard
2. Update the `from` field in email functions to: `Training Team <noreply@yourdomain.com>`

## Error Handling

The system gracefully handles email failures:

1. **Booking/Cancellation Emails** → User sees error if email fails to send
2. **Course Announcements** → Event is created even if emails fail (non-blocking)

To debug email issues:
1. Check browser console for errors
2. Check Resend dashboard for bounce/delivery logs
3. Verify API keys are correct
4. Ensure database records exist for staff/events

## Database Requirements

For emails to work, ensure your database has:

### profiles table (required fields)
- `id` (UUID)
- `email` (string, not null)
- `full_name` (string)

### training_events table (required fields)
- `id` (UUID)
- `event_date` (date)
- `start_time` (time)
- `end_time` (time)
- `location` (string)
- `course_id` (FK to courses)

### courses table (required field)
- `name` (string)

### bookings table (required fields)
- `id` (UUID)
- `event_id` (FK to training_events)
- `profile_id` (FK to profiles)

## Advanced Features You Can Add

### 1. Reminder Emails
Send reminder emails X days before training:
```typescript
// Create scheduled job to check upcoming events
// Send reminder 3 days before
```

### 2. Attendance Confirmation
Send email after course completion asking for feedback

### 3. Roster Changes Notification
Notify managers when roster changes

### 4. Absence Notifications
Email staff when marked absent with reason

## Troubleshooting

### "Email not found" error
- Ensure staff member has email in profiles table
- Check Supabase permissions

### "Event not found" error
- Verify event was created successfully
- Check event_id is correct UUID

### Emails not sending in production
1. Verify `SUPABASE_SERVICE_ROLE_KEY` in production environment
2. Check Resend API key is valid
3. Review Resend dashboard for delivery logs
4. Ensure email addresses are valid

### Test emails working but production not working
- Verify `NEXT_PUBLIC_EMAIL_TEST_MODE=false` in production
- Check all environment variables are set in production platform

## Monitoring & Analytics

View email delivery stats in:
1. **Resend Dashboard** → Emails section
2. Check bounces, complaints, delivery rates
3. Monitor API usage

## Next Steps

Consider implementing:
- [ ] Email templates stored in database for easy editing
- [ ] Email logs table to track all sent emails
- [ ] Unsubscribe functionality
- [ ] Email preference settings per staff member
- [ ] Scheduled reminder emails
- [ ] HTML email builder for admin customization
- [ ] Email preview functionality in modals

## Support

For Resend API help: https://resend.com/docs
For email template examples: https://react-email.com
