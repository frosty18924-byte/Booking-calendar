# Email Notifications - Complete File Structure

## New & Modified Files at a Glance

### 📝 Documentation Files (NEW)
```
├── EMAIL_SETUP.md                    ← Comprehensive setup guide
├── EMAIL_QUICK_START.md              ← 2-minute quick start
├── EMAIL_TESTING_GUIDE.md            ← Testing procedures
├── EMAIL_ARCHITECTURE.md             ← System design & diagrams
├── EMAIL_CHECKLIST.md                ← Implementation checklist
├── EMAIL_VISUAL_GUIDE.md             ← Visual walkthrough
├── README_EMAIL_NOTIFICATIONS.md     ← Overview & summary
└── .env.example                      ← Environment template
```

### 💻 Code Files (NEW)
```
src/
└── app/
    ├── api/
    │   ├── send-booking-confirmation/
    │   │   └── route.ts              ← NEW API route
    │   ├── send-booking-cancellation/
    │   │   └── route.ts              ← NEW API route
    │   └── send-course-notification/
    │       └── route.ts              ← NEW API route
    │
    └── lib/
        └── emailUtils.ts             ← NEW helper utilities
```

### 🔧 Code Files (MODIFIED)
```
src/
├── lib/
│   └── email.ts                      ← MODIFIED (added 3 functions)
│       ├── sendBookingEmail()        ✓ (existing)
│       ├── sendBookingCancellationEmail() ← NEW
│       ├── sendCourseScheduledEmail()     ← NEW
│       └── sendBulkEmail()                ← NEW
│
└── app/
    └── components/
        ├── BookingModal.tsx          ← MODIFIED (added email triggers)
        │   ├── handleBooking()       ← Now sends confirmation emails
        │   └── handleRemoveStaff()   ← Now sends cancellation emails
        │
        └── ScheduleModal.tsx         ← MODIFIED (added email trigger)
            └── handleSubmit()        ← Now sends announcement emails
```

---

## Directory Tree (Full Structure)

```
booking-calendar/
│
├── 📄 Root Config Files
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── postcss.config.mjs
│   ├── eslint.config.mjs
│   ├── .env.example             ← NEW
│   └── .gitignore
│
├── 📚 Documentation (NEW)
│   ├── README.md                ← Original README
│   ├── EMAIL_SETUP.md           ← NEW Comprehensive setup
│   ├── EMAIL_QUICK_START.md     ← NEW Quick start
│   ├── EMAIL_TESTING_GUIDE.md   ← NEW Testing guide
│   ├── EMAIL_ARCHITECTURE.md    ← NEW Architecture
│   ├── EMAIL_CHECKLIST.md       ← NEW Checklist
│   ├── EMAIL_VISUAL_GUIDE.md    ← NEW Visual guide
│   └── README_EMAIL_NOTIFICATIONS.md ← NEW Overview
│
├── 📁 public/
│   └── [static assets]
│
├── 📁 src/
│   │
│   ├── 📁 app/
│   │   ├── 📁 api/              ← Backend routes
│   │   │   ├── 📁 add-staff/
│   │   │   │   └── route.ts
│   │   │   ├── 📁 auth/
│   │   │   │   └── callback/route.ts
│   │   │   ├── 📁 send-booking-confirmation/     ← NEW
│   │   │   │   └── route.ts
│   │   │   ├── 📁 send-booking-cancellation/     ← NEW
│   │   │   │   └── route.ts
│   │   │   └── 📁 send-course-notification/      ← NEW
│   │   │       └── route.ts
│   │   │
│   │   ├── 📁 components/       ← React components
│   │   │   ├── MainHeader.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── BookingModal.tsx       ← MODIFIED
│   │   │   ├── BookingChecklistModal.tsx
│   │   │   ├── ScheduleModal.tsx      ← MODIFIED
│   │   │   ├── CourseManagerModal.tsx
│   │   │   ├── CourseOverrideModal.tsx
│   │   │   ├── LocationManagerModal.tsx
│   │   │   ├── RosterModal.tsx
│   │   │   ├── SpaceManagerModal.tsx
│   │   │   └── AddStaffModal.tsx
│   │   │
│   │   ├── 📁 admin/
│   │   │   └── page.tsx
│   │   ├── 📁 analytics/
│   │   │   └── page.tsx
│   │   ├── 📁 login/
│   │   │   ├── page.tsx
│   │   │   └── actions.ts
│   │   │
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── 📁 lib/                  ← Utility functions
│   │   ├── email.ts             ← MODIFIED (added 3 functions)
│   │   ├── emailUtils.ts        ← NEW helper utilities
│   │   ├── permissions.ts
│   │   └── supabase.ts
│   │
│   └── middleware.ts
│
├── 📁 supabase/                 ← Database migrations
│   └── 📁 migrations/
│       ├── 20260120000000_add_roster_details.sql
│       ├── 20260120000001_add_lateness_reason.sql
│       ├── 20260120000002_add_office_region_mapping.sql
│       ├── 20260120000003_add_accessible_office_regions.sql
│       ├── 20260120000004_add_booking_checklists.sql
│       └── 20260120000005_add_checklist_value_field.sql
│
└── node_modules/                ← Dependencies
    ├── next/
    ├── react/
    ├── @supabase/
    ├── date-fns/
    └── ...
```

---

## What Each New File Does

### 📖 Documentation Files

| File | Purpose | Read Time |
|------|---------|-----------|
| `EMAIL_SETUP.md` | Complete setup instructions with troubleshooting | 5 min |
| `EMAIL_QUICK_START.md` | Quick reference for setup and usage | 2 min |
| `EMAIL_TESTING_GUIDE.md` | Step-by-step testing procedures | 10 min |
| `EMAIL_ARCHITECTURE.md` | System design, diagrams, and data flow | 5 min |
| `EMAIL_CHECKLIST.md` | Implementation & deployment checklist | 3 min |
| `EMAIL_VISUAL_GUIDE.md` | Visual walkthrough with examples | 5 min |
| `README_EMAIL_NOTIFICATIONS.md` | Overview and summary | 3 min |
| `.env.example` | Environment variables template | - |

### 💾 API Route Files

| File | Endpoint | What It Does |
|------|----------|-------------|
| `send-booking-confirmation/route.ts` | `POST /api/send-booking-confirmation` | Sends confirmation when staff booked |
| `send-booking-cancellation/route.ts` | `POST /api/send-booking-cancellation` | Sends notice when booking removed |
| `send-course-notification/route.ts` | `POST /api/send-course-notification` | Announces new course to all staff |

### 🛠️ Utility Files

| File | What It Does |
|------|-------------|
| `emailUtils.ts` | Helper functions for email operations |

### 🔄 Modified Files

| File | Changes |
|------|---------|
| `email.ts` | Added 3 new email template functions |
| `BookingModal.tsx` | Added email triggers on booking actions |
| `ScheduleModal.tsx` | Added email trigger on course creation |

---

## API Routes Breakdown

### Route 1: Booking Confirmation
```typescript
// File: src/app/api/send-booking-confirmation/route.ts
// 
// Triggered: When staff member is added to course
// Request: { staffId, eventId }
// Response: { success, message }
// 
// Actions:
// 1. Get staff email from database
// 2. Get event details from database
// 3. Call sendBookingEmail() from email.ts
// 4. Return success/error
```

### Route 2: Booking Cancellation
```typescript
// File: src/app/api/send-booking-cancellation/route.ts
//
// Triggered: When staff member is removed from course
// Request: { staffId, eventId, reason }
// Response: { success, message }
//
// Actions:
// 1. Get staff email from database
// 2. Get event details from database
// 3. Call sendBookingCancellationEmail() from email.ts
// 4. Return success/error
```

### Route 3: Course Notification
```typescript
// File: src/app/api/send-course-notification/route.ts
//
// Triggered: When new course is scheduled
// Request: { eventId, notifyAllStaff }
// Response: { success, message }
//
// Actions:
// 1. Get all staff emails from database
// 2. Get event details from database
// 3. Call sendBulkEmail() from email.ts
// 4. Return success/error with count
```

---

## Email Functions Breakdown

### Function 1: sendBookingEmail() [EXISTING]
```typescript
// src/lib/email.ts
// 
// Purpose: Send booking confirmation
// Called from: /api/send-booking-confirmation
// 
// Parameters:
// - staffEmail: string
// - staffName: string
// - courseName: string
// - date: string
// 
// Returns: boolean (success/failure)
```

### Function 2: sendBookingCancellationEmail() [NEW]
```typescript
// src/lib/email.ts
//
// Purpose: Send booking cancellation notice
// Called from: /api/send-booking-cancellation
//
// Parameters:
// - staffEmail: string
// - staffName: string
// - courseName: string
// - date: string
// - reason?: string
//
// Returns: boolean (success/failure)
```

### Function 3: sendCourseScheduledEmail() [NEW]
```typescript
// src/lib/email.ts
//
// Purpose: Send course announcement to individual
// Called from: sendBulkEmail() indirectly
//
// Parameters:
// - staffEmail: string
// - staffName: string
// - courseName: string
// - date: string
// - startTime: string
// - endTime: string
// - location: string
//
// Returns: boolean (success/failure)
```

### Function 4: sendBulkEmail() [NEW]
```typescript
// src/lib/email.ts
//
// Purpose: Send email to multiple recipients
// Called from: /api/send-course-notification
//
// Parameters:
// - emails: string[]
// - subject: string
// - htmlContent: string
//
// Returns: boolean (success/failure)
```

---

## Hook Trigger Points

### BookingModal.tsx - handleBooking()
```typescript
// BEFORE:
const handleBooking = async () => {
  const { error } = await supabase.from('bookings').insert(bookingData);
  if (!error) {
    // UI updates
  }
}

// AFTER:
const handleBooking = async () => {
  const { error } = await supabase.from('bookings').insert(bookingData);
  if (!error) {
    // Send confirmation emails for each staff
    for (const staffId of selectedIds) {
      await fetch('/api/send-booking-confirmation', {
        body: JSON.stringify({ staffId, eventId: event.id })
      });
    }
    // UI updates
  }
}
```

### BookingModal.tsx - handleRemoveStaff()
```typescript
// BEFORE:
const handleRemoveStaff = async (bookingId) => {
  await supabase.from('bookings').delete().eq('id', bookingId);
  // UI updates
}

// AFTER:
const handleRemoveStaff = async (bookingId) => {
  const { data: booking } = await supabase
    .from('bookings').select('profile_id').eq('id', bookingId).single();
  
  await supabase.from('bookings').delete().eq('id', bookingId);
  
  // Send cancellation email
  if (booking?.profile_id) {
    await fetch('/api/send-booking-cancellation', {
      body: JSON.stringify({ staffId: booking.profile_id, eventId: event.id })
    });
  }
  // UI updates
}
```

### ScheduleModal.tsx - handleSubmit()
```typescript
// BEFORE:
const { error } = await supabase.from('training_events').insert([...]);
if (!error) {
  onRefresh();
  onClose();
}

// AFTER:
const { data: insertedEvent, error } = await supabase
  .from('training_events').insert([...]).select().single();

if (!error && insertedEvent) {
  // Send course notification
  await fetch('/api/send-course-notification', {
    body: JSON.stringify({ eventId: insertedEvent.id, notifyAllStaff: true })
  });
  
  onRefresh();
  onClose();
}
```

---

## Helper Utilities in emailUtils.ts

```typescript
// Available functions:
export async function sendBookingConfirmation(staffId, eventId)
export async function sendBookingCancellation(staffId, eventId, reason?)
export async function sendCourseNotification(eventId)
export async function sendBulkBookingConfirmations(staffIds, eventId)
export async function retryEmailWithBackoff(emailFn, maxRetries?, initialDelay?)
export async function getEmailDeliveryStatus(emailId)

// Usage:
import { sendBookingConfirmation } from '@/lib/emailUtils';
await sendBookingConfirmation(staffId, eventId);
```

---

## .env.local Structure

```env
# Supabase Configuration (existing)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  ← NEW REQUIREMENT

# Resend Configuration (NEW)
RESEND_API_KEY=re_xxx...             ← NEW REQUIREMENT

# Email Configuration (NEW)
NEXT_PUBLIC_EMAIL_TEST_MODE=true     ← NEW
NEXT_PUBLIC_TEST_EMAIL_ADDRESS=your-email@example.com  ← NEW
```

---

## Summary

**Total New Files:** 8 (7 docs + 1 helper util)
**Total New API Routes:** 3
**Total Modified Components:** 2
**Total New Email Functions:** 3
**Total Updated Utilities:** 1
**Environment Variables Added:** 4

**Status:** ✅ Complete and Ready to Use!
