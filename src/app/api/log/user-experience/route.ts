import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const metric = await request.json();

    // Basic validation
    if (!metric.metricName || !metric.durationInMs || !metric.path) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await prisma.userExperienceLog.create({
      data: {
        metricName: metric.metricName,
        durationInMs: metric.durationInMs,
        path: metric.path,
        fileCount: metric.fileCount,
        totalFileSizeInBytes: metric.totalFileSizeInBytes ? BigInt(metric.totalFileSizeInBytes) : null,
        githubVersion: metric.githubVersion,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving user experience log:', error);
    return NextResponse.json({ error: 'Failed to save user experience log' }, { status: 500 });
  }
}
