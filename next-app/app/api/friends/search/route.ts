import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { query, currentUserId } = await req.json();
    
    if (!query || query.length < 3) return NextResponse.json({ users: [] });

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { 
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { walletAddress: { equals: query, mode: 'insensitive' } }
            ]
          },
          { id: { not: currentUserId } } // Don't find myself
        ]
      },
      select: { id: true, username: true, avatar: true, rating: true }
    });

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ users: [] });
  }
}