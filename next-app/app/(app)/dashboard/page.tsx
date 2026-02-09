"use client";

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/gameStore';
// Alchemy Hooks
import { useUser, useLogout, useSmartAccountClient } from "@account-kit/react";
import { Button } from '@/ui/button'; 
import { shortenAddress } from '@/lib/wallet';
import { 
  Gamepad2, Users, Trophy, Wallet, Bell, 
  Settings, ChevronRight, Swords, Coins, 
  Loader2, LogOut 
} from 'lucide-react';

// --- VIEM IMPORTS (Required for reading Smart Contracts) ---
import { createPublicClient, http, parseAbi, formatEther } from 'viem';
import { baseSepolia } from 'viem/chains';

// --- CONFIGURATION ---
const GAME_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_GAME_TOKEN_ADDRESS as `0x${string}`;

// Minimal ABI to read ERC-20 Balance
const ERC20_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
]);

// Create a Read-Only Client (Public Client)
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org")
});

export default function DashboardPage() {
  const router = useRouter();
  
  // Alchemy Hooks
  const user = useUser();
  const { logout } = useLogout();
  const { client } = useSmartAccountClient({ type: "LightAccount" }); 

  // Local UI State
  const [isLoading, setIsLoading] = useState(true);
  const [ethBalance, setEthBalance] = useState('0');
  const [gameBalance, setGameBalance] = useState('0'); // Local state for display
  
  // Zustand Store
  const { 
    currentUser, 
    friends,
    notifications,
    lobbies,
    setCurrentUser,
    setWalletAddress,
    setBalance // Updates global store
  } = useGameStore();

  // --- 1. CORE LOGIC: Initialize Dashboard ---
  const initDashboard = useCallback(async () => {
    if (!user?.address || !client) return;

    try {
      // Step A: Sync Wallet Address
      setWalletAddress(user.address);

      // Step B: Hydrate User Profile
      if (!currentUser) {
        try {
          const res = await fetch("/api/user/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: user.address }),
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.exists && data.user) {
              setCurrentUser(data.user);
            } else {
              router.push('/'); 
              return;
            }
          }
        } catch (err) {
          console.error("Profile fetch failed:", err);
        }
      }

      // Step C: Fetch Balances in Parallel
      // 1. Native ETH Balance (via Smart Account Client)
      const ethPromise = client.getBalance({ address: user.address });
      
      // 2. Game Token Balance (via Public Client)
      const gamePromise = GAME_TOKEN_ADDRESS 
        ? publicClient.readContract({
            address: GAME_TOKEN_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [user.address]
          })
        : Promise.resolve(0); // Default to 0 if no address set

      const [ethBigInt, gameBigInt] = await Promise.all([ethPromise, gamePromise]);

      // Format Results
      const formattedEth = formatEther(ethBigInt);
      const formattedGame = formatEther(gameBigInt as bigint); // Assuming 18 decimals

      setEthBalance(formattedEth);
      setGameBalance(formattedGame);
      setBalance(parseFloat(formattedGame)); // Update global store with GAME token amount

    } catch (error) {
      console.error("Dashboard init error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, client, currentUser, setWalletAddress, setCurrentUser, setBalance, router]);

  useEffect(() => {
    initDashboard();
  }, [initDashboard]);


  // --- 2. HANDLERS ---

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setWalletAddress(null);
    router.push('/');
  };

  // --- 3. RENDER ---

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const displayUser = currentUser || { username: 'Player', avatar: '👾', rating: 0 };
  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-background flex">
      
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border p-4 flex flex-col z-20 hidden md:flex">
        <div className="flex items-center gap-3 mb-8 px-2">
          <Gamepad2 className="w-8 h-8 text-primary" />
          <span className="font-display text-lg font-bold">Gaming Hub</span>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { icon: Gamepad2, label: 'Dashboard', path: '/dashboard', active: true },
            { icon: Swords, label: 'Lobbies', path: '/lobbies' },
            { icon: Trophy, label: 'Tournaments', path: '/tournaments' },
            { icon: Users, label: 'Friends', path: '/friends' },
            { icon: Trophy, label: 'Leaderboard', path: '/leaderboard' },
          ].map((item) => (
            <Button
              key={item.label}
              variant={item.active ? 'gaming' : 'ghost'}
              className="w-full justify-start"
              onClick={() => router.push(item.path)}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </Button>
          ))}
        </nav>

        {/* Network Info */}
        <div className="mb-4 bg-muted/50 rounded-lg p-3 border border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Base Sepolia
          </div>
          <div className="text-xs text-muted-foreground">
            Smart Wallet Active
          </div>
        </div>

        <div className="space-y-2">
          <Button variant="ghost" className="w-full justify-start" onClick={() => router.push('/settings')}>
            <Settings className="w-5 h-5 mr-3" />
            Settings
          </Button>
          <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={handleLogout}>
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 flex-1 p-8 w-full">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">
              Welcome back, <span className="text-primary">{displayUser.username}</span>
            </h1>
            <p className="text-muted-foreground">Ready to play?</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full text-xs flex items-center justify-center text-white">
                  {unreadNotifications}
                </span>
              )}
            </Button>

            {/* Wallet & Balances */}
            <div className="hidden md:block bg-card border border-border rounded-lg px-4 py-2 shadow-sm">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-sm font-medium">{shortenAddress(user?.address || '')}</div>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                    <span>{parseFloat(ethBalance).toFixed(4)} ETH</span>
                    <span className="text-primary font-bold">{parseFloat(gameBalance).toFixed(0)} GAME</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile */}
            <div className="bg-card border border-border rounded-lg px-4 py-2 flex items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors shadow-sm" onClick={() => router.push('/profile')}>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl">
                {displayUser.avatar || '👾'}
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-medium">{displayUser.username}</div>
                <div className="text-xs text-muted-foreground">ELO: {displayUser.rating || 0}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Quick Actions */}
        <section className="grid md:grid-cols-3 gap-6 mb-8">
          {[
            { 
              title: 'Quick Match', 
              description: 'Find an opponent now',
              icon: Swords,
              color: 'text-primary',
              action: () => router.push('/lobbies')
            },
            { 
              title: 'Create Lobby', 
              description: 'Host your own game',
              icon: Users,
              color: 'text-foreground', 
              action: () => router.push('/lobbies?create=true')
            },
            { 
              title: 'Tournaments', 
              description: 'Compete for prizes',
              icon: Trophy,
              color: 'text-yellow-500',
              action: () => router.push('/tournaments')
            },
          ].map((action) => (
            <motion.div
              key={action.title}
              className="bg-card border border-border rounded-xl p-6 cursor-pointer group hover:border-primary/50 hover:shadow-lg transition-all"
              whileHover={{ scale: 1.02, y: -5 }}
              onClick={action.action}
            >
              <action.icon className={`w-10 h-10 ${action.color} mb-4`} />
              <h3 className="font-display text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                {action.title}
              </h3>
              <p className="text-muted-foreground text-sm">{action.description}</p>
              <ChevronRight className="w-5 h-5 text-muted-foreground mt-4 group-hover:text-primary group-hover:translate-x-2 transition-all" />
            </motion.div>
          ))}
        </section>

        {/* Main Dashboard Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Active Lobbies */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">Active Lobbies</h2>
              <Button variant="ghost" size="sm" onClick={() => router.push('/lobbies')}>
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {lobbies.slice(0, 4).map((lobby) => (
                <motion.div
                  key={lobby.id}
                  className="bg-card border border-border rounded-lg p-4 flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors"
                  whileHover={{ scale: 1.01 }}
                  onClick={() => router.push(`/lobbies/${lobby.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-2xl">
                      {lobby.gameType === 'chess' ? '♟️' : lobby.gameType === 'poker' ? '🃏' : '🎰'}
                    </div>
                    <div>
                      <h4 className="font-medium">{lobby.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {lobby.players.length}/{lobby.maxPlayers} players • {lobby.host.username}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {lobby.entryFee > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded-full text-xs font-bold border border-yellow-500/20">
                        <Coins className="w-3 h-3" />
                        <span>{lobby.entryFee} GAME</span>
                      </div>
                    )}
                    <Button variant="outline" size="sm">Join</Button>
                  </div>
                </motion.div>
              ))}
              
              {lobbies.length === 0 && (
                <div className="bg-card border border-border rounded-lg p-8 text-center">
                  <Gamepad2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-4">No active lobbies at the moment</p>
                  <Button onClick={() => router.push('/lobbies?create=true')}>
                    Create Your Own Lobby
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Friends Online */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">Friends Online</h2>
              <Button variant="ghost" size="sm" onClick={() => router.push('/friends')}>
                All
              </Button>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 space-y-4">
              {friends.filter(f => f.isOnline).slice(0, 5).map((friend) => (
                <div key={friend.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg">
                        {friend.avatar}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{friend.username}</div>
                      <div className="text-xs text-muted-foreground">ELO: {friend.rating}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" title="Challenge to game">
                    <Swords className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              {friends.filter(f => f.isOnline).length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">No friends online</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}