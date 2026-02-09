import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; 
import { ethers } from 'ethers';

export async function POST(request: Request) {
  try {
    const { address, email, name, username } = await request.json();

    // Validation
    if (!address || !email || !name || !username) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate username format (alphanumeric, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { success: false, message: 'Username must be 3-20 characters (letters, numbers, underscores only)' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { walletAddress: address.toLowerCase() }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Wallet address already registered' },
        { status: 409 }
      );
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username }
    });
    
    if (existingUsername) {
      return NextResponse.json(
        { success: false, message: 'Username already taken' },
        { status: 409 }
      );
    }

    // send tokens here
    const transactionDetail = await sendTokensToWallet(address, 100); // Airdrop 100 GAME tokens

    const newUser = await prisma.user.create({
      data: {
        walletAddress: address.toLowerCase(),
        email,
        username,
        hasClaimedAirdrop: true,
      }
    });


    //inconsistency here => transaction is done but server crashed... solution =>  transaction logger or microservice 
    await prisma.transaction.create({
      data: {
        txHash: transactionDetail.txHash,
        userId: newUser.id,
        type: 'JOIN_AIRDROP',
        amount: '100',
        status: transactionDetail.status
      }
    });

    

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: newUser.id,
        walletAddress: newUser.walletAddress,
        email: newUser.email,
        username: newUser.username,
        hasClaimedAirdrop: newUser.hasClaimedAirdrop
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to register user' },
      { status: 500 }
    );
  }
}

async function sendTokensToWallet(address: string, amount: number) {
  const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org";
  const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
  const GAME_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_GAME_TOKEN_ADDRESS;

  if (!ADMIN_PRIVATE_KEY || !GAME_TOKEN_ADDRESS) {
    throw new Error("Server configuration missing: ADMIN_PRIVATE_KEY or TOKEN_ADDRESS not set.");
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);

  const abi = [
    "function transfer(address to, uint256 amount) returns (bool)"
  ];
  
  let tx;
  try {
    const contract = new ethers.Contract(GAME_TOKEN_ADDRESS, abi, wallet);
    const amountInWei = ethers.parseUnits(amount.toString(), 18);
   tx = await contract.transfer(address, amountInWei);
  } catch (error) {
    console.error("Error sending tokens:", error);
    throw new Error("Token transfer failed.");
  }

  return {
    txHash: tx.hash,
    status: 'SUBMITTED' 
  };
}