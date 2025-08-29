import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const performanceLogs = await prisma.performanceLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit to last 100 logs for now
    });

    const serializedLogs = performanceLogs.map((log: typeof performanceLogs[number]) => ({
      ...log,
      totalInputSizeInBytes: log.totalInputSizeInBytes.toString(),
      outputSizeInBytes: log.outputSizeInBytes ? log.outputSizeInBytes.toString() : null,
    }));


    return NextResponse.json(serializedLogs);
  } catch (error) {
    console.error('Error fetching performance logs:', error);
    return NextResponse.json({ error: 'Failed to fetch performance logs' }, { status: 500 });
  }
}