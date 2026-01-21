# Email Notifications Implementation Summary

## What Was Added

Your booking calendar now has a complete email notification system. Here's what was implemented:

### New Files Created:
1. **API Routes** (3 endpoints):
   - `/api/send-booking-confirmation` - Sends confirmation when staff is booked
   - `/api/send-booking-cancellation` - Sends notice when booking is removed
   - `/api/send-course-notification` - Announces new courses to all staff

2. **Utilities**:
   - `src/lib/emailUtils.ts` - Helper functions for email operations
   - `.env.example` - Environment variable template
   - `EMAIL_SETUP.md` - Complete setup guide

### Modified Files:
1. **`src/lib/email.ts`** - Added 3 new email templates
   - `sendBookingCancellationEmail()`
   - `sendCourseScheduledEmail()`
   - `sendBulkEmail()`

2. **`src/app/components/BookingModal.tsx`** - Auto-send emails on:
   - Booking creation → confirmation emails sent to all booked staff
   - Booking removal → cancellation emails sent to removed staff

3. **`src/app/components/ScheduleModal.tsx`** - Auto-send emails:
   - When new course created → announcement sent to all staff

## How to Get It Working

### Step 1: Get Resend API Key
1. Go to https://resend.com
2. Sign up (free tier available)
3. Copy your API key

### Step 2: Update Environment Variables
Add to your `.env.local`:
```env
RESEND_API_KEY=your_api_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_EMAIL_TEST_MODE=true
NEXT_PUBLIC_TEST_EMAIL_ADDRESS=your-email@example.com
```

Get `SUPABASE_SERVICE_ROLE_KEY` from:
- Supabase Dashboard → Settings → API → Service Role Key

### Step 3: Test It
1. Set `NEXT_PUBLIC_EMAIL_TEST_MODE=true` during development
2. All emails will be sent to your test email
3. Try creating a booking - should receive confirmation email
4. Try removing a booking - should receive cancellation email
5. Try creating a course - should receive announcement email

### Step 4: Go Live
1. Set `NEXT_PUBLIC_EMAIL_TEST_MODE=false`
2. Deploy with production environment variables
3. Verify Resend API key is set in your deployment platform

## Email Types

### 1. Booking Confirmation ✅
**Sent to:** Individual staff member
**When:** Immediately after being added to a course
**Content:** Course name, date, time
**Email Variables:** staffEmail, staffName, courseName, date

### 2. Booking Cancellation ✅
**Sent to:** Individual staff member
**When:** Immediately after being removed from a course
**Content:** Course name, date, cancellation reason
**Email Variables:** staffEmail, staffName, courseName, date, reason

### 3. Course Announcement ✅
**Sent to:** ALL staff members
**When:** Immediately after new course is scheduled
**Content:** Course name, date, time, location
**Email Variables:** courseName, date, startTime, endTime, location

## Customization

### Change Email Templates
Edit `src/lib/email.ts`:
- Look for `html:` in each function
- Modify the HTML to match your branding
- Add your company logo/colors

### Change From Address
In `src/lib/email.ts`, find `from:` and update:
```typescript
from: 'Your Company <noreply@yourdomain.com>'
```

First verify your domain in Resend dashboard!

### Add More Email Types
1. Create new function in `src/lib/email.ts`
2. Create new API route in `src/app/api/send-xxx/route.ts`
3. Call from your component using the emailUtils helpers

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Emails not sending" | Check API key is correct in .env.local |
| "Staff email not found" | Verify staff has email in profiles table |
| "Test emails not working" | Ensure NEXT_PUBLIC_EMAIL_TEST_MODE=true |
| "Production emails not working" | Verify env vars are set in production platform |

## Optional Enhancements You Can Add

1. **Email Logs Table**
   - Track all sent emails in database
   - Monitor delivery rates

2. **Scheduled Reminders**
   - Email reminders X days before course
   - Use cron jobs or scheduled functions

3. **Email Preferences**
   - Let staff choose which emails they receive
   - Add preference table to database

4. **HTML Email Builder**
   - Admin UI to customize email templates
   - Store templates in database

5. **Unsubscribe Links**
   - Add unsubscribe functionality
   - Comply with email regulations

## Quick Reference

**To manually send booking confirmation:**
```typescript
import { sendBookingConfirmation } from '@/lib/emailUtils';

await sendBookingConfirmation(staffId, eventId);
```

**To manually send bulk confirmations:**
```typescript
import { sendBulkBookingConfirmations } from '@/lib/emailUtils';

await sendBulkBookingConfirmations([staffId1, staffId2], eventId);
```

**To retry failed emails:**
```typescript
import { retryEmailWithBackoff } from '@/lib/emailUtils';

await retryEmailWithBackoff(() => sendBookingConfirmation(staffId, eventId));
```

## Files You Need to Verify Exist

- ✅ `src/lib/email.ts` (updated)
- ✅ `src/app/api/send-booking-confirmation/route.ts` (new)
- ✅ `src/app/api/send-booking-cancellation/route.ts` (new)
- ✅ `src/app/api/send-course-notification/route.ts` (new)
- ✅ `src/lib/emailUtils.ts` (new)
- ✅ `.env.example` (new)
- ✅ `EMAIL_SETUP.md` (new - comprehensive guide)

## Next Steps

1. ✅ Get Resend API key
2. ✅ Add to `.env.local`
3. ✅ Get SUPABASE_SERVICE_ROLE_KEY
4. ✅ Add to `.env.local`
5. ✅ Test with test mode on
6. ✅ Deploy to production
7. ✅ Monitor email delivery in Resend dashboard
8. (Optional) Add advanced features listed above

## Support Resources

- **Resend Docs:** https://resend.com/docs
- **Email Templates:** https://react-email.com
- **Supabase Docs:** https://supabase.com/docs

You're all set! Your email system is ready to go. 🚀
