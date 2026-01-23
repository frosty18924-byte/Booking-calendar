# Staff Management Access Control

## Role-Based Permissions

### Staff Members
- **View Access:** Can view staff roster and booking information
- **Remove Access:** ❌ NO - Cannot remove staff from events/roster
- **Edit Access:** ❌ NO - Cannot edit staff information

### Managers  
- **View Access:** Can view all staff  
- **Remove Access:** ✅ YES - Can only remove staff from **their location**
- **Edit Access:** Limited to their location's staff

### Schedulers
- **View Access:** Can view all staff
- **Remove Access:** ✅ YES - Can remove **anyone** from any event
- **Edit Access:** Can edit all staff information

### Admins
- **View Access:** Can view all staff
- **Remove Access:** ✅ YES - Can remove **anyone** from any event
- **Edit Access:** Can edit all staff information, including roles and permissions

## Implementation Details

### Components Updated

**1. RosterModal.tsx**
- Added `userRole` prop (default: 'admin')
- Added `userLocation` prop for manager location filtering
- Remove button now conditionally visible based on role
- Managers can only remove staff with matching location

**2. Soft Delete Feature**
- Deleted staff marked with `is_deleted = true`
- Anonymized to "Deleted User" with system email  
- Location preserved for historical analytics
- Can re-add same email immediately with new profile ID

## Database Schema

Profiles table now includes:
- `is_deleted` (BOOLEAN) - Soft delete flag
- `deleted_at` (TIMESTAMP) - When profile was deleted

## Frontend Filtering

All active staff queries include:
```sql
WHERE is_deleted = false
```

Ensures deleted staff never appear in:
- Roster selections
- Staff lists
- Booking assignments
- Admin interfaces
