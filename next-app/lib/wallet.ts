import { ethers, BrowserProvider, Contract, Eip1193Provider } from "ethers";

/* =========================================================
   TYPES
   ========================================================= */
declare global {
  interface Window {
    ethereum?:any| Eip1193Provider & {
      isMetaMask?: boolean;
      request: (request: { method: string; params?: any[] }) => Promise<any>;
      on: (eventName: string, callback: (...args: any[]) => void) => void;
      removeListener: (eventName: string, callback: (...args: any[]) => void) => void;
      removeAllListeners: (eventName: string) => void;
    };
  }
}

/* =========================================================
   BASE NETWORK CONFIGURATION
   ========================================================= */

// Base Mainnet
export const BASE_MAINNET = {
  chainId: "0x2105", // 8453
  chainIdDecimal: 8453,
  chainName: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://mainnet.base.org"],
  blockExplorerUrls: ["https://basescan.org"],
};

// Base Sepolia
export const BASE_SEPOLIA = {
  chainId: "0x14a34", // 84532
  chainIdDecimal: 84532,
  chainName: "Base Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia.basescan.org"],
};

/* =========================================================
   ENV CONFIGURATION (Next.js Compatible) - FIXED
   ========================================================= */

// NOTE: In Next.js Client Components, you MUST access process.env.NEXT_PUBLIC_* directly.
// Dynamic access (e.g. process.env[key]) will return undefined at runtime.

const ENV_USE_MAINNET = process.env.NEXT_PUBLIC_USE_MAINNET;
const ENV_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

// Contract Addresses
// We use a helper to ensure undefined values become empty strings for safety
const sanitize = (val: string | undefined) => (val ? val.trim() : "");

export const GAME_TOKEN_ADDRESS = sanitize(process.env.NEXT_PUBLIC_GAME_TOKEN_ADDRESS);
export const PLATFORM_CONTRACT_ADDRESS = sanitize(process.env.NEXT_PUBLIC_PLATFORM_CONTRACT_ADDRESS);
export const CHESS_CONTRACT_ADDRESS = sanitize(process.env.NEXT_PUBLIC_CHESS_CONTRACT_ADDRESS);
export const POKER_CONTRACT_ADDRESS = sanitize(process.env.NEXT_PUBLIC_POKER_CONTRACT_ADDRESS);

const USE_MAINNET = sanitize(ENV_USE_MAINNET) === "true";
export const NETWORK = USE_MAINNET ? BASE_MAINNET : BASE_SEPOLIA;

// Use Env RPC or fallback to Network default
export const RPC_URL = sanitize(ENV_RPC_URL) || NETWORK.rpcUrls[0];

// Validation - Log addresses on module load (browser only)
if (typeof window !== "undefined") {
  console.log("🔍 Wallet Configuration Loaded:");
  console.log("  Network:", NETWORK.chainName);
  console.log("  RPC URL:", RPC_URL);
  
  const addresses = [
    { name: "GAME_TOKEN", value: GAME_TOKEN_ADDRESS },
    { name: "PLATFORM", value: PLATFORM_CONTRACT_ADDRESS },
    { name: "CHESS", value: CHESS_CONTRACT_ADDRESS },
    { name: "POKER", value: POKER_CONTRACT_ADDRESS },
  ];

  let hasError = false;
  addresses.forEach(({ name, value }) => {
    if (!value) {
      console.error(`❌ ${name} address is MISSING! Check .env.local`);
      hasError = true;
    } else if (!ethers.isAddress(value)) {
      console.error(`❌ ${name} is Invalid: ${value}`);
      hasError = true;
    } else {
      console.log(`  ✅ ${name}: ${value}`);
    }
  });

  if (!hasError) console.log("✅ All contract addresses are valid.");
}

/* =========================================================
   CONTRACT ABIs
   ========================================================= */

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

/* =========================================================
   WALLET FUNCTIONS
   ========================================================= */

export const isMetaMaskInstalled = (): boolean => {
  return typeof window !== "undefined" && !!window.ethereum?.isMetaMask;
};

export const shortenAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Get Provider (v6: BrowserProvider)
 */
export const getProvider = (): BrowserProvider => {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No crypto wallet found. Please install MetaMask.");
  }
  return new BrowserProvider(window.ethereum);
};

/**
 * Get Signer (v6: Async)
 */
export const getSigner = async () => {
  const provider = getProvider();
  return await provider.getSigner();
};

/**
 * Switch to Base network
 */
export const switchToBase = async (): Promise<void> => {
  if (!window.ethereum) throw new Error("No wallet found");

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: NETWORK.chainId }],
    });
  } catch (error: any) {
    // Error code 4902 means the chain has not been added to MetaMask
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: NETWORK.chainId,
              chainName: NETWORK.chainName,
              nativeCurrency: NETWORK.nativeCurrency,
              rpcUrls: NETWORK.rpcUrls,
              blockExplorerUrls: NETWORK.blockExplorerUrls,
            },
          ],
        });
      } catch (addError) {
        console.error("Error adding Base network:", addError);
        throw addError;
      }
    } else {
      console.error("Error switching network:", error);
      throw error;
    }
  }
};

/**
 * Connect wallet
 */
export const connectWallet = async (): Promise<string> => {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed.");
  }

  try {
    const provider = getProvider();
    
    // Request accounts
    const accounts = await provider.send("eth_requestAccounts", []);
    
    // Ensure correct network
    await switchToBase();
    
    return accounts[0];
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error("User rejected connection request.");
    }
    console.error("Error connecting wallet:", error);
    throw error;
  }
};

/**
 * Get ETH Balance
 */
export const getEthBalance = async (address: string): Promise<string> => {
  try {
    const provider = getProvider();
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error("Error fetching ETH balance:", error);
    return "0";
  }
};

/**
 * Get GAME Token Balance
 */
export const getGameBalance = async (address: string): Promise<string> => {
  if (!GAME_TOKEN_ADDRESS || !ethers.isAddress(GAME_TOKEN_ADDRESS)) {
    console.warn("Skipping GAME balance: Address invalid or not set.");
    return "0";
  }

  try {
    const provider = getProvider();
    // Check network silently before call to prevent errors on wrong chain
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== NETWORK.chainIdDecimal) {
      return "0"; // Return 0 instead of forcing switch on read-only
    }

    const contract = new Contract(GAME_TOKEN_ADDRESS, ERC20_ABI, provider);
    const balance = await contract.balanceOf(address);
    const decimals = await contract.decimals();

    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    console.error("Error fetching GAME balance:", error);
    return "0";
  }
};

/**
 * Get current network info
 */
export const getCurrentNetwork = async () => {
  try {
    const provider = getProvider();
    const network = await provider.getNetwork();
    return {
      chainId: Number(network.chainId),
      name: network.name,
      isCorrectNetwork: Number(network.chainId) === NETWORK.chainIdDecimal,
    };
  } catch (error) {
    return { chainId: 0, name: "Unknown", isCorrectNetwork: false };
  }
};

export const isOnCorrectNetwork = async (): Promise<boolean> => {
  const { isCorrectNetwork } = await getCurrentNetwork();
  return isCorrectNetwork;
};

/**
 * Listeners
 */
export const onNetworkChange = (callback: (chainId: string) => void): void => {
  if (window.ethereum) {
    window.ethereum.on("chainChanged", callback);
  }
};

export const onAccountChange = (callback: (accounts: string[]) => void): void => {
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", callback);
  }
};

/**
 * Approve Token
 */
export const approveToken = async (
  tokenAddress: string,
  spenderAddress: string,
  amount: string
) => {
  try {
    const signer = await getSigner();
    const contract = new Contract(tokenAddress, ERC20_ABI, signer);
    
    // In v6, decimals() returns a BigInt (or number), ensure compatibility
    const decimals = await contract.decimals(); 
    const amountInWei = ethers.parseUnits(amount, decimals);

    const tx = await contract.approve(spenderAddress, amountInWei);
    return tx;
  } catch (error) {
    console.error("Error approving token:", error);
    throw error;
  }
};

/**
 * Check Allowance
 */
export const checkAllowance = async (
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string
): Promise<string> => {
  try {
    const provider = getProvider();
    const contract = new Contract(tokenAddress, ERC20_ABI, provider);
    
    const allowance = await contract.allowance(ownerAddress, spenderAddress);
    const decimals = await contract.decimals();

    return ethers.formatUnits(allowance, decimals);
  } catch (error) {
    console.error("Error checking allowance:", error);
    return "0";
  }
};