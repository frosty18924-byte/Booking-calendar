import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface CourseData {
  name: string;
  course: string;
  expiry: string;
  expiryTime?: number;
  location: string;
  delivery: string;
  expiredSince?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationFilter = searchParams.get('locationFilter');

    const deploymentUrl = process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL;

    if (!deploymentUrl) {
      return NextResponse.json(
        { error: 'Google Apps Script URL not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(deploymentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        function: 'getExpiredCourses',
        params: {
          locationFilter: locationFilter || null,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Apps Script error:', response.status, errorText);
      return NextResponse.json(
        { error: `Google Apps Script error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching expired courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}
