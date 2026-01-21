# Email Notifications Testing Guide

## Test Scenario 1: Booking Confirmation Email

### Prerequisites
- Development environment set up
- `.env.local` configured with test mode enabled
- Test email address configured

### Steps
1. **Start your dev server**
   ```bash
   npm run dev
   ```

2. **Log in to the application**

3. **Navigate to a course event**

4. **Click the event card** to open the booking modal

5. **Add staff members** by:
   - Selecting the "Add Staff" tab
   - Checking boxes next to staff names
   - Clicking "Book Staff"

6. **Check your test email inbox**
   - Should receive confirmation emails
   - Subject should start with `[TEST]` if in test mode
   - Email should show the course name and date

### Expected Result ✅
- One email per booked staff member
- Subject: `[TEST] Booking: {CourseName}`
- Contains course name, date, and confirmation message

### If Not Working 🔧
1. Check browser console for errors
2. Check `.env.local` for correct API key
3. Verify test email address is valid
4. Check Resend dashboard for bounce logs

---

## Test Scenario 2: Booking Cancellation Email

### Prerequisites
- At least one staff member already booked on a course
- Same setup as Test Scenario 1

### Steps
1. **Open the booking modal** for a course with bookings

2. **Switch to "Roster" tab**

3. **Find a booked staff member**

4. **Click the remove button** (trash icon)

5. **Confirm removal** in the dialog

6. **Check your test email inbox**
   - Should receive cancellation email
   - Subject should start with `[TEST]` if in test mode
   - Email should show cancellation notice

### Expected Result ✅
- Email per removed staff member
- Subject: `[TEST] Booking Cancelled: {CourseName}`
- Contains cancellation reason and course details
- Email has red styling indicating cancellation

### If Not Working 🔧
1. Verify booking existed before removal
2. Check that staff member has email in database
3. Review browser console for errors

---

## Test Scenario 3: Course Announcement Email

### Prerequisites
- Multiple staff members in the system
- Same development setup

### Steps
1. **Navigate to the main calendar page**

2. **Click "+ Schedule" button** (if you have permission)

3. **Fill in course details**:
   - Select a course
   - Select a location
   - Pick a date
   - Set start/end times

4. **Submit the form**

5. **Check your test email inbox**
   - Should receive announcement email
   - Subject should start with `[TEST]` if in test mode

### Expected Result ✅
- Single email if test mode (goes to test email)
- Multiple emails in production (goes to all staff)
- Subject: `[TEST] New Course Scheduled: {CourseName}`
- Contains course details, date, time, location
- Email has blue styling for announcement

### If Not Working 🔧
1. Verify course was created successfully
2. Check that all staff have email addresses in profiles table
3. Review database to confirm event was inserted

---

## Test Scenario 4: Test Mode vs Production Mode

### How to Test Different Modes

**Test Mode (Development)**
```env
NEXT_PUBLIC_EMAIL_TEST_MODE=true
NEXT_PUBLIC_TEST_EMAIL_ADDRESS=your-test@example.com
```

- All emails sent to `your-test@example.com`
- Subject lines prefixed with `[TEST]`
- Email footer shows original intended recipient

**Production Mode (Live)**
```env
NEXT_PUBLIC_EMAIL_TEST_MODE=false
```

- Emails sent to actual recipient addresses
- Normal subject lines (no [TEST] prefix)
- No footer notes

### Testing the Switch
1. Test with `NEXT_PUBLIC_EMAIL_TEST_MODE=true`
2. Verify emails go to test email
3. Change to `false`
4. **Restart dev server** (important!)
5. Test again
6. Verify emails go to individual staff members

---

## Test Scenario 5: Error Handling

### Test Email Service Failure

**Scenario: Invalid API Key**
1. Temporarily change `RESEND_API_KEY` to an invalid value
2. Try to create a booking
3. Verify:
   - Booking is still created in database
   - Error is logged to browser console
   - User can still use the app

**Scenario: Missing Staff Email**
1. Open database and remove email from a staff record
2. Try to book that staff member
3. Should see error: "Staff email not found"
4. Restore email in database

**Scenario: Missing Event Data**
1. Try to send email with invalid event ID
2. Should see error: "Event not found"

---

## Monitoring Email Delivery

### Resend Dashboard
1. Go to https://resend.com/dashboard
2. Click on "Emails" section
3. View all sent emails
4. Check delivery status (delivered, bounced, complained)
5. Review email logs for debugging

### Check Email Logs Locally
In browser DevTools (F12):
1. Open Console tab
2. Look for logs from `/api/send-*` calls
3. See request/response details

### Database Query to Check Emails
If you add an email logs table:
```sql
SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 20;
```

---

## Performance Testing

### Test Bulk Bookings
1. Select multiple staff members (10+)
2. Click "Book Staff"
3. Monitor:
   - How many emails are sent
   - Time taken to send all emails
   - Any errors in console

### Test with Large Staff List
1. Course with 50+ staff in database
2. Schedule a new course
3. Verify announcement email doesn't crash
4. Check all staff receive email

---

## Email Content Testing Checklist

For each email type, verify:

- [ ] **Subject line** is clear and relevant
- [ ] **Course name** is correct
- [ ] **Date** is formatted correctly
- [ ] **Time** is shown (if applicable)
- [ ] **Location** is correct (if applicable)
- [ ] **From address** is professional
- [ ] **HTML formatting** looks good
- [ ] **Links work** (if any)
- [ ] **Font sizes** are readable on mobile
- [ ] **Colors** display correctly
- [ ] **Company branding** is consistent

---

## Troubleshooting Checklist

| Symptom | Diagnosis | Fix |
|---------|-----------|-----|
| No emails received | API key invalid | Verify key in .env.local |
| Emails go to wrong address | Test mode is off | Set NEXT_PUBLIC_EMAIL_TEST_MODE=true |
| Emails take 5+ seconds | Timeout or API delay | Check network tab in DevTools |
| Some emails missing | Staff missing email | Check profiles table for null emails |
| Subject lines wrong | Template issue | Check src/lib/email.ts |
| HTML looks broken | Email client issue | Test in Resend dashboard |
| High bounce rate | Invalid email addresses | Validate email format in database |

---

## Automated Testing (Optional)

### Setup Jest Tests for Email Functions
```bash
npm install --save-dev jest @types/jest
```

**Example test:**
```typescript
// __tests__/email.test.ts
import { sendBookingEmail } from '@/lib/email';

describe('Email Functions', () => {
  test('sendBookingEmail returns boolean', async () => {
    const result = await sendBookingEmail(
      'test@example.com',
      'John Doe',
      'React Training',
      '2026-02-01'
    );
    expect(typeof result).toBe('boolean');
  });
});
```

---

## Cleanup After Testing

1. **Delete test bookings** from database
2. **Delete test events** from database
3. **Archive old emails** in Resend (optional)
4. **Review email usage** in Resend dashboard
5. **Update .env.local** before committing code (never commit with test credentials)

---

## Common Test Cases

### Quick Test Workflow
```
1. Add staff to course → Check email ✅
2. Remove staff from course → Check email ✅
3. Schedule new course → Check email ✅
4. Change test mode on/off → Verify behavior ✅
5. Check Resend dashboard → Verify delivery ✅
```

---

## Still Having Issues?

1. **Check logs**: Browser console + Resend dashboard
2. **Verify database**: Ensure all records have required fields
3. **Test API directly**: Use Postman to test endpoints
4. **Check network**: DevTools Network tab to see requests
5. **Review code**: Check EmailUtils imports are correct

Ready to test? Start with Test Scenario 1! 🚀
