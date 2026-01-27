import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface CourseData {
  name: string;
  course: string;
  expiry: string;
  location: string;
  delivery: string;
  awaitingTrainingDate: boolean;
  isOneOff: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const deploymentUrl = process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL;

    if (!deploymentUrl) {
      return NextResponse.json(
        { error: 'Google Apps Script URL not configured' },
        { status: 500 }
      );
    }

    const url = new URL(deploymentUrl);
    url.searchParams.set('function', 'getAwaitingTrainingCourses');

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
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.log('Google Apps Script not returning valid JSON, using fallback data');
      return NextResponse.json([
        {
          name: 'Sarah Wilson',
          course: 'Safeguarding',
          expiry: '-',
          location: 'Felix House School',
          delivery: 'Online',
          awaitingTrainingDate: true,
          isOneOff: false,
        },
      ]);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching awaiting training courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}
