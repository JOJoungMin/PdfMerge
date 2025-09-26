import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const vitals = await prisma.frontendVital.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit to last 100 vitals
    });
    return NextResponse.json(vitals);
  } catch (error) {
    console.error('Error fetching frontend vitals:', error);
    return NextResponse.json({ error: 'Failed to fetch frontend vitals' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const metric = await request.json();

    // Basic validation
    if (!metric.name || metric.value == null || !metric.path) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await prisma.frontendVital.create({
      data: {
        name: metric.name,
        value: metric.value,
        path: metric.path,
        githubVersion: metric.githubVersion, // Add this line
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving frontend vital:', error);
    return NextResponse.json({ error: 'Failed to save frontend vital' }, { status: 500 });
  }
}
