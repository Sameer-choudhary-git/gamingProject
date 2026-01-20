
import hre from "hardhat";

async function main() {
  console.log("Deploying to Base Sepolia...");

  // 1. Deploy GameToken
  console.log("\n1. Deploying GameToken...");
  const GameToken = await hre.ethers.getContractFactory("GameToken");
  const gameToken = await GameToken.deploy(
    "Game Token",           // Token name
    "GAME",                 // Token symbol
    hre.ethers.parseEther("1000000") // Initial supply: 1M tokens
  );
  await gameToken.waitForDeployment();
  const gameTokenAddress = await gameToken.getAddress();
  console.log("GameToken deployed to:", gameTokenAddress);

  // 2. Deploy GamePlatform
  console.log("\n2. Deploying GamePlatform...");
  const [deployer] = await hre.ethers.getSigners();
  const GamePlatform = await hre.ethers.getContractFactory("GamePlatform");
  const gamePlatform = await GamePlatform.deploy(
    gameTokenAddress,        // Platform token address
    deployer.address         // Treasury address (your address)
  );
  await gamePlatform.waitForDeployment();
  const gamePlatformAddress = await gamePlatform.getAddress();
  console.log("GamePlatform deployed to:", gamePlatformAddress);

  // 3. Deploy ChessGame
  console.log("\n3. Deploying ChessGame...");
  const ChessGame = await hre.ethers.getContractFactory("ChessGame");
  const chessGame = await ChessGame.deploy();
  await chessGame.waitForDeployment();
  const chessGameAddress = await chessGame.getAddress();
  console.log("ChessGame deployed to:", chessGameAddress);

  // 4. Deploy PokerGame
  console.log("\n4. Deploying PokerGame...");
  const PokerGame = await hre.ethers.getContractFactory("PokerGame");
  const pokerGame = await PokerGame.deploy(gamePlatformAddress);
  await pokerGame.waitForDeployment();
  const pokerGameAddress = await pokerGame.getAddress();
  console.log("PokerGame deployed to:", pokerGameAddress);

  // 5. Register games in platform
  console.log("\n5. Registering games in platform...");
  await gamePlatform.registerGame(chessGameAddress, "Chess");
  console.log("Chess registered");
  await gamePlatform.registerGame(pokerGameAddress, "Poker");
  console.log("Poker registered");

  // Print all addresses
  console.log("\n===========================================");
  console.log("📝 DEPLOYMENT SUMMARY");
  console.log("===========================================");
  console.log("Network: Base Sepolia");
  console.log("GameToken:", gameTokenAddress);
  console.log("GamePlatform:", gamePlatformAddress);
  console.log("ChessGame:", chessGameAddress);
  console.log("PokerGame:", pokerGameAddress);
  console.log("===========================================");
  console.log("\n⚠️  IMPORTANT: Copy these addresses to your frontend .env file!");
  console.log("\nVITE_GAME_TOKEN_ADDRESS=" + gameTokenAddress);
  console.log("VITE_PLATFORM_CONTRACT_ADDRESS=" + gamePlatformAddress);
  console.log("VITE_CHESS_CONTRACT_ADDRESS=" + chessGameAddress);
  console.log("VITE_POKER_CONTRACT_ADDRESS=" + pokerGameAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



//   # Deploy to Base Sepolia testnet
// npx hardhat run scripts/deploy.js --network baseSepolia