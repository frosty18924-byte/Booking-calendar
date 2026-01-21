# Email Notifications - Visual Setup Guide

## 🎯 The Big Picture

Your application now has automatic email notifications that work like this:

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│        STEP 1: YOU CREATE BOOKING                       │
│        ────────────────────────                         │
│        Click: "Book Staff"                              │
│                                                          │
│        ↓                                                 │
│        Email → Staff gets "Booking Confirmation"       │
│        Subject: "Booking Confirmation: React Training" │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                                                          │
│        STEP 2: YOU REMOVE BOOKING                       │
│        ─────────────────────────                        │
│        Click: Remove staff button                       │
│                                                          │
│        ↓                                                 │
│        Email → Staff gets "Booking Cancelled"          │
│        Subject: "Booking Cancelled: React Training"    │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                                                          │
│        STEP 3: YOU SCHEDULE COURSE                      │
│        ───────────────────────────                      │
│        Click: "+ Schedule"                              │
│        Fill in details, submit                          │
│                                                          │
│        ↓                                                 │
│        Email → ALL staff get "New Course Available"    │
│        Subject: "New Course Scheduled: React Training" │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔑 What You Need (3 Things)

### 1️⃣ Resend Account
```
GO TO: https://resend.com
ACTION: Sign up (free)
GET: API Key
LOOKS LIKE: re_abc123def456ghi789...
```

### 2️⃣ Supabase Service Role
```
GO TO: Supabase Dashboard
PATH: Settings → API → Service Role Key
GET: Copy the key
LOOKS LIKE: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3️⃣ Add to .env.local
```env
RESEND_API_KEY=re_abc123def456ghi789...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_EMAIL_TEST_MODE=true
NEXT_PUBLIC_TEST_EMAIL_ADDRESS=your-email@example.com
```

---

## 🧪 Testing It (Super Easy)

### What You're Testing
```
✓ Booking confirmation email works
✓ Booking cancellation email works  
✓ Course announcement email works
✓ Emails arrive in inbox
✓ Content looks good
✓ No errors in console
```

### Test #1: Booking Confirmation (2 min)

```
YOUR ACTIONS:
1. Open your app, log in
2. Navigate to an event
3. Click the event to open modal
4. Switch to "Add Staff" tab
5. Check a staff member name
6. Click "Book Staff" button

WHAT HAPPENS:
→ Booking saved to database
→ Email sent to staff member
→ (Takes 1-5 seconds)

CHECK YOUR EMAIL:
1. Open your test email (check NEXT_PUBLIC_TEST_EMAIL_ADDRESS)
2. Look for email with subject: [TEST] Booking: {CourseName}
3. Verify it has:
   ✓ Course name
   ✓ Date
   ✓ Friendly greeting
   ✓ [TEST] prefix (because NEXT_PUBLIC_EMAIL_TEST_MODE=true)

SUCCESS ✅ means:
- Email arrived
- Subject looks good
- Content looks good
- No errors in console
```

### Test #2: Booking Cancellation (2 min)

```
YOUR ACTIONS:
1. Keep modal open from Test #1
2. Switch to "Roster" tab (shows bookings)
3. Find the staff member you just booked
4. Click the remove/trash button
5. Click "Yes" to confirm

WHAT HAPPENS:
→ Booking deleted from database
→ Email sent to staff member
→ (Takes 1-5 seconds)

CHECK YOUR EMAIL:
1. Open your test email
2. Look for new email with subject: [TEST] Booking Cancelled
3. Verify it has:
   ✓ Course name
   ✓ Date
   ✓ Cancellation notice
   ✓ [TEST] prefix

SUCCESS ✅ means:
- Cancellation email arrived
- Shows course was cancelled
- Different styling (red) than confirmation
- No errors in console
```

### Test #3: Course Announcement (2 min)

```
YOUR ACTIONS:
1. Go back to main calendar view
2. Click "+ Schedule" button (blue)
3. Fill in form:
   - Select a course
   - Select a location
   - Pick a future date
   - Keep default times
4. Click "Submit"

WHAT HAPPENS:
→ Course created in database
→ Email sent to ALL staff
→ (Takes 5-10 seconds for all)

CHECK YOUR EMAIL:
1. Open your test email
2. Look for email with subject: [TEST] New Course Scheduled
3. Verify it has:
   ✓ Course name
   ✓ Date
   ✓ Time
   ✓ Location
   ✓ [TEST] prefix

SUCCESS ✅ means:
- Announcement email arrived
- Shows full course details
- Blue styling indicates new course
- No errors in console
```

---

## 🛠️ Installation Walkthrough

### Before You Start
```
✓ You have .env.local file (check with: cat .env.local)
✓ Your dev server is NOT running (stop with Ctrl+C)
✓ You have Resend API key ready
✓ You have Supabase Service Role Key ready
```

### Step-by-Step

**1. Open .env.local in your editor**
```
mac/linux: nano .env.local
or use: VS Code → File → Open → .env.local
```

**2. Add the lines (at the end):**
```env
RESEND_API_KEY=re_xxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxxxxxxx
NEXT_PUBLIC_EMAIL_TEST_MODE=true
NEXT_PUBLIC_TEST_EMAIL_ADDRESS=your-email@example.com
```

**3. Replace xxxxxxxxxxxx with:**
- Your actual Resend API key
- Your actual Supabase service role key
- Your actual email address

**4. Save the file** (Ctrl+S or Cmd+S)

**5. Start dev server**
```bash
npm run dev
```

**6. Check for errors**
```
Look at terminal output:
✓ Should say "ready in X seconds"
✓ Should show no red errors
✓ Should show the localhost URL
```

**7. Ready to test!**
```
Open: http://localhost:3000
Login to your app
Try the tests above
```

---

## 📧 Email Examples

### Email 1: Booking Confirmation

```
FROM: Training Team <onboarding@resend.dev>
TO: john.doe@company.com
SUBJECT: [TEST] Booking Confirmation: React Training

CONTENT:
┌─────────────────────────────────────┐
│ Training Booking Confirmation       │
│                                     │
│ Hi John Doe,                        │
│                                     │
│ You have been booked onto the       │
│ following course:                   │
│                                     │
│ • Course: React Training            │
│ • Date: February 1, 2026            │
│                                     │
│ Please ensure this is in your       │
│ calendar.                           │
│                                     │
│ Note: This was a test email         │
│ intended for john.doe@company.com   │
└─────────────────────────────────────┘
```

### Email 2: Booking Cancellation

```
FROM: Training Team <onboarding@resend.dev>
TO: john.doe@company.com
SUBJECT: [TEST] Booking Cancelled: React Training

CONTENT:
┌─────────────────────────────────────┐
│ Booking Cancelled (red styling)     │
│                                     │
│ Hi John Doe,                        │
│                                     │
│ Your booking for the following      │
│ course has been cancelled:          │
│                                     │
│ • Course: React Training            │
│ • Date: February 1, 2026            │
│ • Reason: Booking removed by admin  │
│                                     │
│ If you have any questions, please   │
│ contact the training team.          │
└─────────────────────────────────────┘
```

### Email 3: Course Announcement

```
FROM: Training Team <onboarding@resend.dev>
TO: all-staff@company.com (and others)
SUBJECT: [TEST] New Course Scheduled: React Training

CONTENT:
┌─────────────────────────────────────┐
│ New Training Available (blue style) │
│                                     │
│ Hi,                                 │
│                                     │
│ A new training course has been      │
│ scheduled:                          │
│                                     │
│ 📚 Course: React Training           │
│ 📅 Date: February 1, 2026           │
│ ⏰ Time: 09:00 - 17:00              │
│ 📍 Location: Hull                   │
│                                     │
│ Log in to the training portal to    │
│ book your place.                    │
└─────────────────────────────────────┘
```

---

## ✅ Verification Checklist

After setup, verify everything works:

```
□ .env.local has RESEND_API_KEY
□ .env.local has SUPABASE_SERVICE_ROLE_KEY
□ .env.local has NEXT_PUBLIC_EMAIL_TEST_MODE=true
□ .env.local has NEXT_PUBLIC_TEST_EMAIL_ADDRESS
□ Dev server started without errors
□ App loads at http://localhost:3000
□ Can log in to app
□ Can open event booking modal
□ Can add staff and click "Book Staff"
□ Received confirmation email within 5 seconds
□ Email subject has [TEST] prefix
□ Email shows course details
□ Can remove booking and click confirm
□ Received cancellation email within 5 seconds
□ Can create new course with "+ Schedule"
□ Received announcement email within 10 seconds
□ Browser console has no errors
□ Resend dashboard shows emails sent
```

---

## 🚨 If Something Doesn't Work

### Email not arriving
```
CHECK:
1. Is NEXT_PUBLIC_EMAIL_TEST_MODE=true?
2. Did you restart dev server after adding env vars?
3. Is NEXT_PUBLIC_TEST_EMAIL_ADDRESS correct?
4. Check email spam folder
5. Try a different email address
6. Check browser console for errors (F12)
```

### Can't find env vars
```
CHECK:
1. Is file named .env.local (not .env)?
2. Are you in the right directory?
3. Did you save the file (Ctrl+S)?
4. Did you restart dev server (npm run dev)?
5. No .gitignore should block .env.local
```

### Dev server won't start
```
CHECK:
1. Did you stop previous server (Ctrl+C)?
2. Are env vars valid format?
3. Try: npm install first
4. Try: delete node_modules and npm install
5. Try: pm2 kill (if using pm2)
```

### Still stuck?
```
1. Check EMAIL_SETUP.md (troubleshooting section)
2. Check browser console for specific error
3. Check Resend dashboard for rejection reasons
4. Verify database has staff email addresses
5. Check Supabase permissions
```

---

## 🎓 Understanding the Flow

### When You Book Staff:
```
1. Click "Book Staff" button
2. System saves to database (booking created)
3. System calls API: /api/send-booking-confirmation
4. API gets staff email from database
5. API gets course details from database
6. API calls Resend with email content
7. Resend sends email to staff
8. Staff receives email in inbox ✅
```

### When You Remove Staff:
```
1. Click remove button
2. System saves to database (booking deleted)
3. System calls API: /api/send-booking-cancellation
4. API gets staff email and course details
5. API calls Resend with cancellation email
6. Resend sends email to staff
7. Staff receives cancellation email ✅
```

### When You Schedule Course:
```
1. Fill form and click "Submit"
2. System saves course to database
3. System calls API: /api/send-course-notification
4. API gets ALL staff emails from database
5. API calls Resend with announcement email
6. Resend sends email to all staff
7. All staff receive announcement ✅
```

---

## 🎉 You're Ready!

Everything is installed and ready. Just:
1. Get your API keys
2. Add to `.env.local`
3. Restart dev server
4. Test the emails
5. Watch them arrive! 📧

**Congratulations on adding email notifications to your app! 🚀**
