# Testing Guide for Booking Calendar

This guide will help you test your deployment on Vercel with your existing Supabase project.

## Prerequisites Checklist

Before testing, ensure you have:
- ✅ Supabase project created and active
- ✅ Vercel account with environment variables configured
- ✅ Database migrations applied

## Step 1: Verify Supabase Configuration

### Check Your Supabase Project

1. **Log into Supabase Dashboard**: https://app.supabase.com
2. **Navigate to your project** (should be named something like "booking-calendar" or "training-portal")
3. **Verify these settings**:

#### A. Check API Credentials
- Go to **Settings > API**
- Verify you have:
  - ✅ Project URL (e.g., `https://xxxxx.supabase.co`)
  - ✅ Anon/Public Key
  - ✅ Service Role Key (keep this secret!)

#### B. Check Database Tables
- Go to **Table Editor**
- Verify these tables exist:
  - ✅ `profiles` - User profiles and roles
  - ✅ `training_events` - Scheduled training sessions
  - ✅ `courses` - Available training courses
  - ✅ `bookings` - User bookings for events

If tables are missing, you need to run the base migrations first (not just the recent roster updates).

#### C. Check Authentication
- Go to **Authentication > Providers**
- Verify:
  - ✅ Email provider is enabled
  - ✅ Google OAuth is configured (if using)
  - ✅ Site URL and Redirect URLs include your Vercel domain

#### D. Apply Latest Migrations
The PR includes these migrations:
- `20260120000000_add_roster_details.sql` - Adds absence tracking
- `20260120000001_add_lateness_reason.sql` - Adds lateness reason

**To apply migrations**:
```sql
-- In Supabase SQL Editor, run each migration file
-- Or use Supabase CLI:
npx supabase db push
```

## Step 2: Verify Vercel Configuration

### Check Environment Variables

1. **Go to Vercel Dashboard**: https://vercel.com
2. **Select your project**
3. **Navigate to Settings > Environment Variables**
4. **Verify these are set for Production, Preview, and Development**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Redeploy if Variables Changed

If you just added or updated environment variables:
1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click the **three dots** menu
4. Select **Redeploy**

## Step 3: Test the Deployment

### Basic Functionality Tests

#### Test 1: Access the Application
1. **Navigate to your Vercel URL** (e.g., `https://your-app.vercel.app`)
2. **Expected**: You should be redirected to `/login`
3. **Screenshot**: You should see the Staff Login page

#### Test 2: Test Authentication
1. **Try to log in** with test credentials
2. **Expected behaviors**:
   - Valid credentials → Redirects to main calendar
   - Invalid credentials → Shows error message
   - Not registered → Shows appropriate error

#### Test 3: Test Main Calendar
1. **After login**, you should see:
   - ✅ Current month calendar grid
   - ✅ Your email in top-left corner
   - ✅ Sign Out button
   - ✅ Theme toggle (sun/moon icon)
2. **Test navigation**:
   - Click left/right arrows to change months
   - Select different courses from dropdown

#### Test 4: Test Booking (Staff Role)
1. **Click on a training event** in the calendar
2. **Expected**: Booking modal should open
3. **Try to book** the session
4. **Verify**: Booking appears in the event

#### Test 5: Test Admin Features (Admin Role)
1. **If you have admin role**, click "Admin" button
2. **Expected**: Admin dashboard loads
3. **Test**:
   - View staff list
   - View course management
   - Test roster tracking features

#### Test 6: Test Analytics
1. **Navigate to** `/analytics`
2. **Expected**: Analytics dashboard loads with charts
3. **Verify**: Data is displaying correctly

## Step 4: Verify Database Changes

### Check Recent Migrations

The recent migrations added:
- `absence_reason` column to bookings
- `lateness_minutes` column to bookings  
- `lateness_reason` column to bookings

**To verify**:
1. Go to Supabase **Table Editor**
2. Open `bookings` table
3. Check that these columns exist

## Step 5: Testing Checklist

Use this checklist to verify everything works:

### Authentication
- [ ] Login page loads without errors
- [ ] Can log in with email/password
- [ ] Can log out successfully
- [ ] Google OAuth works (if configured)
- [ ] Redirects work correctly (logged in → calendar, logged out → login)

### Main Calendar
- [ ] Calendar displays current month
- [ ] Events are visible on correct dates
- [ ] Can navigate between months
- [ ] Can filter by course type
- [ ] Theme toggle works
- [ ] Event colors display correctly

### Bookings
- [ ] Can click on an event to view details
- [ ] Can book an event (if staff)
- [ ] Can cancel a booking
- [ ] Participant count updates correctly
- [ ] Roster tracking works (absence/lateness)

### Admin Dashboard (Admin only)
- [ ] Can access admin dashboard
- [ ] Can view staff list
- [ ] Can add new staff
- [ ] Can manage courses
- [ ] Can schedule training events

### Analytics
- [ ] Analytics page loads
- [ ] Charts display data
- [ ] Filters work correctly

## Troubleshooting

### Issue: Login page shows but can't log in

**Check**:
1. Supabase authentication is enabled
2. User exists in Supabase auth users
3. Environment variables are correct in Vercel
4. Check Vercel deployment logs for errors

**Fix**:
```bash
# Verify in Supabase SQL Editor:
SELECT * FROM auth.users;
```

### Issue: "supabaseUrl is required" error

**Check**:
1. Environment variables in Vercel
2. Variables are set for the correct environment (Production/Preview)

**Fix**:
1. Add missing environment variables in Vercel
2. Redeploy the application

### Issue: Calendar shows but no events appear

**Check**:
1. Database has data in `training_events` table
2. `courses` table has course records
3. Events have valid dates

**Fix**:
```sql
-- Check in Supabase SQL Editor:
SELECT * FROM training_events;
SELECT * FROM courses;
```

### Issue: 500 errors or build failures

**Check**:
1. Vercel build logs (Deployments > Click deployment > View Build Logs)
2. Vercel function logs (Deployments > Click deployment > View Function Logs)
3. Browser console for client-side errors

### Issue: Database tables missing

**Solution**: You need to create the base schema first. The migrations in this repo only add fields to existing tables. Contact your team for the initial schema or check for earlier migration files.

## Getting Database Schema

If you need the full database schema, check:
1. Other migration files in `supabase/migrations/`
2. Supabase dashboard for existing tables
3. Team documentation for schema

## Quick Test Script

Run this in your browser console (F12) after logging in:

```javascript
// Test Supabase connection
console.log('Testing Supabase connection...');
fetch(window.location.origin + '/api/add-staff', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    full_name: 'Test User',
    email: 'test@example.com',
    location: 'Test Location',
    role_tier: 'staff'
  })
}).then(r => r.json()).then(console.log);
```

This will test:
- API routes are working
- Database connection is established
- Environment variables are loaded

## Success Criteria

Your deployment is working correctly if:
- ✅ Application loads without errors
- ✅ Authentication works (login/logout)
- ✅ Calendar displays events
- ✅ Can interact with bookings
- ✅ Database operations succeed
- ✅ No console errors in browser
- ✅ All routes are accessible

## Need Help?

If you encounter issues:
1. Check Vercel deployment logs
2. Check Supabase logs (Database > Logs)
3. Check browser console for errors
4. Verify all environment variables are set
5. Ensure database migrations are applied

## Next Steps After Testing

Once testing is complete:
1. Create test users for different roles (staff, scheduler, admin)
2. Add sample courses and training events
3. Test the full booking workflow
4. Configure production domain (if needed)
5. Set up monitoring and alerts
