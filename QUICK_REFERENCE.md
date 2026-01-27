# Quick Reference - Training Portal Navigation

## 🚀 Quick Start

```
User Flow:
Login (/login) 
    ↓
Dashboard (/dashboard) with app cards
    ↓
[Click an app card]
    ↓
App page with sidebar navigation (/apps/[app-name])
```

## 📱 URLs & Routes

| URL | Name | Purpose | Sidebar |
|-----|------|---------|---------|
| `/login` | Login Page | Authentication | ❌ |
| `/dashboard` | Dashboard | App selection | ❌ |
| `/apps/expiry-checker` | Course Expiry Checker | Track certifications | ✅ |
| `/apps/booking-calendar` | Booking Calendar | Schedule courses | ✅ |
| `/admin` | Admin Dashboard | (existing) | ❌ |
| `/analytics` | Analytics | (existing) | ❌ |

## 🎮 Sidebar Features

### Desktop (lg screens and up)
- Always visible on left
- Width: 256px (w-64)
- Collapse button to minimize (w-20)

### Mobile & Tablet
- Hidden by default
- Toggle button in bottom-left
- Slides in from left (overlay)
- Backdrop overlay

## 🧩 Component Structure

```
AppSidebar (shown only on /apps/* and /dashboard routes)
├── Header
│   ├── "Apps" title
│   ├── Collapse/Expand button
│   └── Close button (mobile)
├── Navigation Menu
│   ├── 🏠 Dashboard
│   ├── 📅 Course Expiry
│   └── 📆 Booking Calendar
└── Footer
    └── 🚪 Sign Out
```

## 🎨 Active App Highlighting

```
If on /apps/expiry-checker:
  "📅 Course Expiry" shows blue background

If on /apps/booking-calendar:
  "📆 Booking Calendar" shows blue background

If on /dashboard:
  "🏠 Dashboard" shows blue background
```

## ⌨️ Keyboard Navigation

- `Tab` → Navigate through sidebar buttons
- `Enter` → Activate button
- `Esc` → Close mobile sidebar (if implemented)

## 🎯 Common Tasks

### Switch Apps
1. Use sidebar navigation buttons
2. Or go back to Dashboard and click new app

### Collapse Sidebar
1. Click collapse button (⟨ or ⟩)
2. Sidebar shrinks to show icons only
3. Click again to expand

### Mobile Menu
1. Click button in bottom-left corner
2. Sidebar slides in
3. Click app or backdrop to close

### Sign Out
1. Click 🚪 Sign Out button in sidebar footer
2. Redirected to login page
3. Session cleared

### Toggle Theme
1. On app pages: Click theme toggle (☀️/🌙)
2. Theme persists across navigation
3. Works on all pages except login

## 📊 Data Filtering

### Course Expiry Checker - Available Filters

```
Filters (can combine):
┌─────────────────────┐
│ All Staff           │ (dropdown)
│ All Courses         │ (dropdown)
│ All Locations       │ (dropdown)
│ All Delivery Types  │ (dropdown)
└─────────────────────┘

Delivery Types:
- Face to Face
- Online
- Atlas
```

## 📋 Search Options

```
1. Expiring Courses
   - Select date range
   - Click "Search Expiring"

2. Awaiting Training
   - No date needed
   - Click "Awaiting Training"

3. Expired Courses
   - No date needed
   - Click "Expired Courses"
```

## 🎨 Styling & Theme

### Light Mode
- White backgrounds
- Dark text
- Light borders

### Dark Mode
- Dark gray backgrounds (#1f2937, #111827)
- Light text
- Dark borders

### Colors Used
- Primary: Blue (#3b82f6)
- Danger: Red (#dc2626)
- Warning: Yellow (#eab308)
- Success: Green (#10b981)

## 📱 Responsive Breakpoints

```
Mobile:     < 640px   (sm)
Tablet:    640-1024px (md)
Desktop:   > 1024px   (lg)

Sidebar behavior:
- Mobile:    Overlay, toggle button
- Tablet:    Overlay, toggle button
- Desktop:   Fixed sidebar, always visible
```

## 🔐 Auth States

```
User NOT logged in:
→ Redirect to /login

User logged in:
→ Can access /dashboard and /apps/*

User tries /login while logged in:
→ Redirect to /dashboard

User accesses /:
→ Redirect to /dashboard

Password needs change:
→ Redirect to /auth/change-password-required
```

## 🛠️ Customization Points

### Change Sidebar Position
Edit `AppSidebar.tsx` and change:
- `fixed left-0 top-0` → position
- `w-64` → sidebar width
- `lg:ml-64` → offset width (in page files)

### Change App List
Edit apps array in `AppSidebar.tsx`:
```typescript
const apps = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '🏠',
    path: '/dashboard',
    description: 'Back to app selection',
  },
  // Add more apps here
];
```

### Change Dashboard Cards
Edit `src/app/dashboard/page.tsx`:
- Colors
- Icons
- Descriptions
- Card styling

### Change Colors
- Primary: Update `bg-blue-*` classes
- Text: Update `text-gray-*` classes
- Borders: Update `border-gray-*` classes

## 📚 Documentation Files

```
├── IMPLEMENTATION_SUMMARY.md     ← Start here
├── MULTI_APP_SETUP.md            ← Architecture guide
├── COURSE_EXPIRY_INTEGRATION.md  ← Data integration
├── FEATURES_OVERVIEW.md          ← All features
└── README.md                      ← Original README
```

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Sidebar not showing | Check if on /apps/* route |
| Redirect loop | Clear cookies, check auth |
| Theme not saving | Check browser localStorage |
| Data not loading | Check console for errors |
| Mobile menu stuck | Refresh page |

## 📞 Quick Links

- **Supabase**: Check authentication status
- **Console**: F12 → Console (see errors)
- **Network**: F12 → Network (check API calls)
- **DevTools**: F12 → toggle device toolbar (mobile view)

---

**Keyboard Shortcut**: F12 = Developer Tools
**Clear Cache**: Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
**Hard Refresh**: Ctrl+Shift+R (or Cmd+Shift+R on Mac)

---

**Last Updated**: January 27, 2026
