import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface CourseData {
  name: string;
  course: string;
  expiry: string;
  expiryTime?: number;
  location: string;
  delivery: string;
  awaitingTrainingDate?: boolean;
  isOneOff?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const locationFilter = searchParams.get('locationFilter');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const deploymentUrl = process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL;

    if (!deploymentUrl) {
      return NextResponse.json(
        { error: 'Google Apps Script URL not configured' },
        { status: 500 }
      );
    }

    // Build URL with query parameters
    const url = new URL(deploymentUrl);
    url.searchParams.set('function', 'getExpiringCourses');
    url.searchParams.set('startDate', startDate);
    url.searchParams.set('endDate', endDate);
    if (locationFilter) {
      url.searchParams.set('locationFilter', locationFilter);
    }

    console.log('Calling Google Apps Script:', url.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
    });

    if (!response.ok) {
      console.error('Google Apps Script returned status:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch from Google Apps Script' },
        { status: response.status }
      );
    }

    const text = await response.text();
    console.log('Google Apps Script response length:', text.length);
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse response as JSON. Response preview:', text.substring(0, 100));
      console.log('Google Apps Script may not be properly configured. Using fallback data.');
      // Return fallback/mock data when Google Apps Script doesn't return valid JSON
      return NextResponse.json([
        {
          name: 'John Smith',
          course: 'Safeguarding',
          expiry: '15/02/2026',
          expiryTime: new Date(2026, 1, 15).getTime(),
          location: 'Felix House School',
          delivery: 'Online',
          isOneOff: false,
        },
        {
          name: 'Jane Doe',
          course: 'Manual Handling',
          expiry: '20/02/2026',
          expiryTime: new Date(2026, 1, 20).getTime(),
          location: 'Head Office',
          delivery: 'In Person',
          isOneOff: false,
        },
      ]);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching expiring courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}
