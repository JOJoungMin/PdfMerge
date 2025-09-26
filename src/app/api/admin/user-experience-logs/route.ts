import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const logs = await prisma.userExperienceLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit to last 100 logs
    });

    // BigInt를 문자열로 변환하여 직렬화 문제를 해결합니다.
    const serializedLogs = logs.map(log => ({
      ...log,
      totalFileSizeInBytes: log.totalFileSizeInBytes ? log.totalFileSizeInBytes.toString() : null,
    }));

    return NextResponse.json(serializedLogs);
  } catch (error) {
    console.error('Error fetching user experience logs:', error);
    return NextResponse.json({ error: 'Failed to fetch user experience logs' }, { status: 500 });
  }
}
