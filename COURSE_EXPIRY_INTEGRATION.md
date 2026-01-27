# Course Expiry Checker - Integration Guide

## Quick Start: Connecting Your Google Sheets Data

The Course Expiry Checker component is ready to display data. Follow these steps to integrate with your Google Sheets data source.

## Option 1: Create API Routes (Recommended)

### Step 1: Create API route for fetching course data

Create file: `src/app/api/courses/expiring/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // TODO: Fetch data from your Google Sheets
    // Example using googleapis library:
    
    const data = [
      {
        name: 'John Smith',
        course: 'First Aid',
        expiry: '15/02/2026',
        expiryTime: new Date(2026, 1, 15).getTime(),
        location: 'Banks House School',
        delivery: 'Face to Face',
        awaitingTrainingDate: false,
        isOneOff: false,
      },
      // ... more records
    ];

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}
```

### Step 2: Create similar routes for other queries

- `src/app/api/courses/awaiting-training/route.ts`
- `src/app/api/courses/expired/route.ts`

### Step 3: Update CourseExpiryChecker component

Update `src/app/components/CourseExpiryChecker.tsx`:

```typescript
async function fetchExpiringCourses() {
  if (!startDate || !endDate) {
    setStatus('Please select both dates');
    return;
  }

  setLoading(true);
  setStatus('Fetching expiring courses...');
  setActiveTab('expiring');

  try {
    const response = await fetch(
      `/api/courses/expiring?startDate=${startDate}&endDate=${endDate}`
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch');
    }

    setAllData(data);
    buildFilterOptions(data);
    setStatus(`Found ${data.length} expiring courses`);
  } catch (error) {
    console.error('Error fetching courses:', error);
    setStatus('Error loading courses');
  } finally {
    setLoading(false);
  }
}
```

## Option 2: Direct Supabase Integration

If you store course data in Supabase:

```typescript
async function fetchExpiringCourses() {
  if (!startDate || !endDate) {
    setStatus('Please select both dates');
    return;
  }

  setLoading(true);
  setStatus('Fetching expiring courses...');
  setActiveTab('expiring');

  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .gte('expiry_date', startDate)
      .lte('expiry_date', endDate)
      .order('expiry_date');

    if (error) throw error;

    // Transform data to match expected format
    const formattedData = data.map(row => ({
      name: row.staff_name,
      course: row.course_name,
      expiry: new Date(row.expiry_date).toLocaleDateString('en-GB'),
      expiryTime: new Date(row.expiry_date).getTime(),
      location: row.location,
      delivery: row.delivery_type,
      awaitingTrainingDate: false,
      isOneOff: false,
    }));

    setAllData(formattedData);
    buildFilterOptions(formattedData);
    setStatus(`Found ${formattedData.length} expiring courses`);
  } catch (error) {
    console.error('Error fetching courses:', error);
    setStatus('Error loading courses');
  } finally {
    setLoading(false);
  }
}
```

## Option 3: Using Google Sheets API (Your Current Setup)

### Step 1: Set up environment variables

In `.env.local`:
```
GOOGLE_SHEETS_API_KEY=your_api_key
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
```

### Step 2: Create API route to query Google Sheets

Create: `src/app/api/courses/query/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query'); // 'expiring', 'awaiting', 'expired'

    // Call your Google Apps Script deployment or Google Sheets API
    // Your Apps Script already has functions like:
    // - getExpiringCourses(startDate, endDate, locationFilter)
    // - getAwaitingTrainingCourses()
    // - getExpiredCourses(locationFilter)

    const baseUrl = 'https://script.google.com/macros/d/{DEPLOYMENT_ID}/usercache';
    
    let params = '?action=' + query;
    if (query === 'expiring') {
      params += `&startDate=${searchParams.get('startDate')}`;
      params += `&endDate=${searchParams.get('endDate')}`;
    }

    const response = await fetch(baseUrl + params);
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error querying courses:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}
```

## Data Format Reference

The CourseExpiryChecker expects data in this format:

```typescript
interface CourseData {
  name: string;              // Staff member name
  course: string;            // Course name
  expiry: string;            // Date string "DD/MM/YYYY HH:mm:ss"
  expiryTime?: number;       // Timestamp in milliseconds
  location: string;          // Location/School name
  delivery: string;          // "Face to Face", "Online", or "Atlas"
  awaitingTrainingDate?: boolean;    // true if awaiting training
  isOneOff?: boolean;        // true if one-off course
  expiredSince?: string;     // e.g., "Expired 5 days ago" (for expired view)
}
```

## Filter Options

The component automatically builds filter options from data:

```typescript
interface FilterOptions {
  names: string[];      // Unique staff names
  courses: string[];    // Unique course names
  locations: string[]; // Unique locations
  deliveries: string[]; // Unique delivery types
}
```

## Real-World Example: Using Your Current App Script

Since you already have a working Google Apps Script, you could:

1. **Deploy your Apps Script as a web app** (if not already done):
   - In Apps Script: Deploy → Deploy as → Web App
   - Note the deployment URL

2. **Create an API route** that calls your script:

```typescript
// src/app/api/courses/from-appscript/route.ts
import { NextRequest, NextResponse } from 'next/server';

const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_DEPLOYMENT_URL;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'expiring', 'awaiting', 'expired'

    let functionName = '';
    let params = {};

    switch (type) {
      case 'expiring':
        functionName = 'getExpiringCourses';
        params = {
          startDate: searchParams.get('startDate'),
          endDate: searchParams.get('endDate'),
          locationFilter: null,
        };
        break;
      case 'awaiting':
        functionName = 'getAwaitingTrainingCourses';
        break;
      case 'expired':
        functionName = 'getExpiredCourses';
        params = { locationFilter: null };
        break;
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // Call the Apps Script deployment
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ function: functionName, params }),
    });

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
```

## Testing Your Integration

1. **Check Network Requests**:
   - Open DevTools (F12)
   - Go to Network tab
   - Perform a search
   - Check the API call response

2. **Check Console for Errors**:
   - Look for JavaScript errors
   - Check API error messages

3. **Test with Mock Data**:
   - Verify UI works with current mock data
   - Then gradually swap in real data

## Next Steps

1. Choose which integration method works best for your setup
2. Implement the data fetching functions
3. Test with your actual data
4. Optionally add admin features from your original App Script

## Common Issues & Solutions

### "No data found"
- Check date range is correct
- Verify data exists in your source
- Check console for fetch errors

### "Filter not working"
- Ensure all records have valid location/delivery values
- Check filter values match exactly

### "Slow loading"
- Implement pagination/limiting
- Cache results with shorter expiry
- Add loading indicators

---

For more details, see [MULTI_APP_SETUP.md](./MULTI_APP_SETUP.md)
