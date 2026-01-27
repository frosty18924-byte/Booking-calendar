# Training Portal - Multi-App Setup Guide

## Overview
Your Training Portal has been successfully upgraded with a **multi-app architecture**. After login, users now land on a **Dashboard** where they can select which app to use via a **sidebar navigation**.

## New Architecture

### File Structure
```
src/app/
├── dashboard/
│   └── page.tsx                    # Landing page with app selection
├── apps/
│   ├── expiry-checker/
│   │   └── page.tsx               # Course Expiry Checker app
│   └── booking-calendar/
│       └── page.tsx               # Booking Calendar app wrapper
├── components/
│   ├── AppSidebar.tsx            # NEW: Sidebar navigation
│   ├── CourseExpiryChecker.tsx    # NEW: Course tracker component
│   ├── ThemeToggle.tsx           # Existing
│   └── ... (other components)
├── page.tsx                        # Calendar page (now used in booking-calendar route)
└── ... (other existing pages)
```

## How It Works

### 1. Authentication Flow
- User logs in at `/login`
- Login redirects to `/dashboard` (via updated `login/actions.ts`)
- Middleware (`src/middleware.ts`) enforces this flow:
  - Unauthenticated users → `/login`
  - Authenticated users on `/` → `/dashboard`
  - Authenticated users on `/login` → `/dashboard`

### 2. Dashboard (`/dashboard`)
- Landing page displaying two app cards
- Shows user's name and greeting
- Users can click an app card to navigate
- No sidebar visible on dashboard (mobile-friendly)

### 3. App Navigation
When a user opens either app:
- **URL**: `/apps/expiry-checker` or `/apps/booking-calendar`
- **Sidebar**: Shows navigation menu with:
  - 🏠 Dashboard (back to app selection)
  - 📅 Course Expiry (Course Expiry Checker)
  - 📆 Booking Calendar
  - 🚪 Sign Out button

### 4. Sidebar Features
- **Collapsible**: Click collapse button to shrink sidebar to icons only
- **Mobile**: Slides in from left on mobile, toggle button in bottom-left
- **Responsive**: 
  - Small screens (mobile): Overlay sidebar with backdrop
  - Large screens (lg+): Fixed sidebar with content offset
- **Dark Mode**: Respects theme setting from ThemeToggle
- **Active State**: Highlights current app in sidebar

## Components

### AppSidebar (`src/app/components/AppSidebar.tsx`)
- **Props**: `isDark` (boolean)
- **Features**:
  - Collapsible navigation
  - Mobile responsive
  - App switching
  - Sign out functionality
  - Theme-aware styling
- **Returns**: `null` if not on app routes (won't show on login/dashboard)

### CourseExpiryChecker (`src/app/components/CourseExpiryChecker.tsx`)
- **Props**: `isDark` (boolean)
- **Features**:
  - Search for expiring courses
  - View courses awaiting training
  - View expired courses
  - Filter by staff, course, location, delivery type
  - Responsive table with dark mode
- **Status**: Currently shows mock data (ready for integration)

### Dashboard (`src/app/dashboard/page.tsx`)
- **Props**: None (client component)
- **Features**:
  - App selection cards
  - User greeting
  - Dark mode toggle
  - Authentication check

## Integration with Google Sheets

### For Course Expiry Data
The `CourseExpiryChecker` component is ready to connect to your Google Sheets data. You'll need to:

1. **Create API Routes** (optional - or fetch directly from Supabase):
   - `src/app/api/courses/expiring/route.ts`
   - `src/app/api/courses/awaiting-training/route.ts`
   - `src/app/api/courses/expired/route.ts`

2. **Replace Mock Data** in `CourseExpiryChecker.tsx`:
   - Replace `fetchExpiringCourses()` function
   - Replace `fetchAwaitingTraining()` function
   - Replace `fetchExpiredCourses()` function

3. **Data Structure Expected**:
   ```typescript
   interface CourseData {
     name: string;
     course: string;
     expiry: string;        // Format: "DD/MM/YYYY"
     expiryTime?: number;   // Timestamp
     location: string;
     delivery: string;      // "Face to Face", "Online", "Atlas"
     awaitingTrainingDate?: boolean;
     isOneOff?: boolean;
     expiredSince?: string; // e.g., "Expired 5 days ago"
   }
   ```

## Styling & Theme

All components use **Tailwind CSS** with dark mode support:
- Dark class: `dark` (applied to `html` element)
- Color scheme detection: Uses browser preference + localStorage
- ThemeToggle button available on all app pages

## URL Routes

| Path | Component | Sidebar |
|------|-----------|---------|
| `/login` | Login page | Hidden |
| `/dashboard` | App selection | Hidden |
| `/apps/expiry-checker` | Course Expiry Checker | Visible |
| `/apps/booking-calendar` | Booking Calendar | Visible |
| `/admin` | Admin page (if exists) | Hidden |
| `/analytics` | Analytics page (if exists) | Hidden |

## Key Changes Made

1. **Updated `src/middleware.ts`**:
   - Root path (`/`) now redirects to `/dashboard`
   - Login now redirects to `/dashboard` instead of `/`

2. **Updated `src/app/login/actions.ts`**:
   - Changed redirect target from `/` to `/dashboard`

3. **Created new files**:
   - `src/app/dashboard/page.tsx` - Landing page
   - `src/app/components/AppSidebar.tsx` - Navigation
   - `src/app/components/CourseExpiryChecker.tsx` - Course tracker
   - `src/app/apps/expiry-checker/page.tsx` - Expiry checker app wrapper
   - `src/app/apps/booking-calendar/page.tsx` - Calendar app wrapper

4. **Minimal changes to existing files**:
   - `src/app/page.tsx` - Added `useRouter` import only
   - Other components remain unchanged

## Next Steps

### To complete the integration:

1. **Connect to Google Sheets data**:
   - Update `fetchExpiringCourses()`, `fetchAwaitingTraining()`, `fetchExpiredCourses()` in CourseExpiryChecker
   - OR create API routes to fetch from your data source

2. **Add Admin Features** (if needed):
   - Permissions management
   - Email notifications
   - Data management

3. **Optional: Add more apps**:
   - Follow the same pattern in `AppSidebar.tsx`
   - Create app pages in `src/app/apps/[app-name]/page.tsx`

## Testing

1. **Login Flow**:
   ```
   Navigate to /login → Enter credentials → Should redirect to /dashboard
   ```

2. **App Navigation**:
   ```
   Click on an app card → Should go to /apps/[app-name]
   Sidebar should appear with navigation options
   ```

3. **Sidebar Functions**:
   ```
   Click app in sidebar → Should navigate
   Click collapse → Sidebar should shrink
   Click Sign Out → Should redirect to /login
   ```

4. **Theme Toggle**:
   ```
   Click theme toggle → Should switch dark/light mode
   Theme should persist across page navigation
   ```

## Troubleshooting

### Sidebar not showing
- Check if you're on a route starting with `/apps/` or `/dashboard`
- Sidebar intentionally hidden on `/login` and other routes

### Theme not persisting
- Check browser localStorage for `theme` key
- Check if `ThemeToggle` is properly rendering

### Redirect loops
- Clear browser cookies
- Check middleware configuration
- Ensure user is authenticated in Supabase

## Support

For questions or issues, check:
1. Console errors (F12 Developer Tools)
2. Network requests (Network tab)
3. Supabase authentication status
4. Theme/localStorage settings
