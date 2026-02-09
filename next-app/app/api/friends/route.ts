import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch all friends and pending requests
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) return NextResponse.json({ error: "ID required" }, { status: 400 });

  try {
    // 1. Get requests I SENT (Pending or Accepted)
    const outgoing = await prisma.friend.findMany({
      where: { userId },
      include: { friend: true } // Include friend's profile
    });

    // 2. Get requests I RECEIVED (Pending or Accepted)
    const incoming = await prisma.friend.findMany({
      where: { friendId: userId },
      include: { user: true } // Include requester's profile
    });

    // Format Data
    const friends = [
      ...outgoing.filter(f => f.status === 'ACCEPTED').map(f => ({ ...f.friend, relationId: f.id })),
      ...incoming.filter(f => f.status === 'ACCEPTED').map(f => ({ ...f.user, relationId: f.id }))
    ];

    const requests = incoming
      .filter(f => f.status === 'PENDING')
      .map(f => ({ ...f.user, requestId: f.id }));

    return NextResponse.json({ friends, requests });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST: Send Friend Request or Accept/Reject
export async function POST(req: Request) {
  try {
    const { action, userId, targetId, requestId } = await req.json();

    if (action === 'REQUEST') {
      // Check if already friends
      const exists = await prisma.friend.findFirst({
        where: {
          OR: [
            { userId: userId, friendId: targetId },
            { userId: targetId, friendId: userId }
          ]
        }
      });
      
      if (exists) return NextResponse.json({ error: "Request already exists" }, { status: 400 });

      await prisma.friend.create({
        data: { userId, friendId: targetId, status: 'PENDING' }
      });
      return NextResponse.json({ success: true, message: "Request sent" });
    }

    if (action === 'ACCEPT') {
      await prisma.friend.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' }
      });
      return NextResponse.json({ success: true, message: "Friend added" });
    }

    if (action === 'REJECT') {
      await prisma.friend.delete({ where: { id: requestId } });
      return NextResponse.json({ success: true, message: "Request rejected" });
    }

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}