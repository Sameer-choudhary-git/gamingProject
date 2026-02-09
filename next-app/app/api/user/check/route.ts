import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Uncomment when you set up Prisma

export async function POST(request: Request) {
  try {
    const { address, email } = await request.json();

    if (!address || !email) {
      return NextResponse.json(
        { error: 'Wallet address and email are required' },
        { status: 400 }
      );
    }

    
    const user = await prisma.user.findFirst({
      where: { 
        OR: [
          { walletAddress: address.toLowerCase() },
          { email: email.toLowerCase() }
        ],
      },
      select: {
        id: true,
        walletAddress: true,
        email: true,
        username: true,
        hasClaimedAirdrop: true
      }
    });

    return NextResponse.json({
      exists: !!user,
      user: user || null
    });
    

  } catch (error) {
    console.error('Error checking user:', error);
    return NextResponse.json(
      { error: 'Failed to check user' },
      { status: 500 }
    );
  }
}