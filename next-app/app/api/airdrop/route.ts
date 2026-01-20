import { NextResponse } from "next/server";
import { ethers } from "ethers";

// 1. Setup Environment Variables
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org";
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY as string; 
const GAME_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_GAME_TOKEN_ADDRESS as string;

if (!ADMIN_PRIVATE_KEY || !GAME_TOKEN_ADDRESS) {
  throw new Error("Missing Admin Keys or Token Address");
}

// 2. Minimal ABI for Transfer
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)"
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, email } = body;

    if (!address || !email) {
      return NextResponse.json({ error: "Missing address or email" }, { status: 400 });
    }

    // 3. Connect Admin Wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
    const tokenContract = new ethers.Contract(GAME_TOKEN_ADDRESS, ERC20_ABI, adminWallet);

    // 4. (Optional) Check Admin Balance first
    // const adminBalance = await tokenContract.balanceOf(adminWallet.address);
    // console.log("Admin Balance:", ethers.formatUnits(adminBalance, 18));

    // 5. Send 100 Tokens
    // Assuming your token has 18 decimals. If it has 6 (like USDC), change to 6.
    const amount = ethers.parseUnits("100", 18); 

    console.log(`Sending 100 GAME to ${address} (${email})...`);

    const tx = await tokenContract.transfer(address, amount);
    
    // Note: We don't await tx.wait() here to keep the UI snappy.
    // The transaction will process in the background.

    return NextResponse.json({ 
      success: true, 
      txHash: tx.hash,
      message: "Airdrop initiated!" 
    });

  } catch (error: any) {
    console.error("Airdrop Error:", error);
    return NextResponse.json({ error: "Transaction failed", details: error.message }, { status: 500 });
  }
}