"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/gameStore';
import { Button } from '@/ui/button'; // Adjusted path based on your previous fix
import { 
  shortenAddress, 
  getGameBalance, 
  getEthBalance,
  switchToBase,
  isOnCorrectNetwork,
  NETWORK
} from '@/lib/wallet';
import { 
  Gamepad2, Users, Trophy, Wallet, Bell, 
  Settings, LogOut, ChevronRight, 
  Swords, Coins, Loader2, AlertCircle 
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter(); // Changed from navigate
  const [isLoading, setIsLoading] = useState(true);
  const [ethBalance, setEthBalance] = useState('0');
  const [gameBalance, setGameBalance] = useState('0');
  const [wrongNetwork, setWrongNetwork] = useState(false);
  
  const { 
    currentUser, 
    walletAddress, 
    balance,
    friends,
    recentMatches,
    notifications,
    lobbies,
    setCurrentUser,
    setWalletAddress,
    setBalance
  } = useGameStore();

  useEffect(() => {
    const checkSession = async () => {
      // If user is already loaded, just check network
      if (currentUser && walletAddress) {
        await loadBalances(walletAddress);
        setIsLoading(false);
        return;
      }

      // Try to auto-connect
      if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          
          if (accounts.length > 0) {
            const address = accounts[0];
            
            // Check network
            const onCorrectNetwork = await isOnCorrectNetwork();
            if (!onCorrectNetwork) {
              setWrongNetwork(true);
              setIsLoading(false);
              return;
            }
            
            // Check for stored user
            const storedUser = localStorage.getItem(`user_${address}`);
            
            if (storedUser) {
              setWalletAddress(address);
              setCurrentUser(JSON.parse(storedUser));
              await loadBalances(address);
              setIsLoading(false);
              return;
            }
          }
        } catch (error) {
          console.error("Session check failed", error);
        }
      }
      
      // No session found, redirect to landing
      router.push('/');
    };

    checkSession();
  }, [currentUser, walletAddress, router, setCurrentUser, setWalletAddress, setBalance]);

  const loadBalances = async (address: string) => {
    try {
      const [eth, game] = await Promise.all([
        getEthBalance(address),
        getGameBalance(address)
      ]);
      
      setEthBalance(eth);
      setGameBalance(game);
      setBalance(parseFloat(game));
    } catch (error) {
      console.error("Failed to load balances:", error);
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      await switchToBase();
      setWrongNetwork(false);
      if (walletAddress) {
        await loadBalances(walletAddress);
      }
    } catch (error) {
      console.error("Failed to switch network:", error);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setWalletAddress(null);
    setBalance(0);
    router.push('/');
  };

  // Loading state
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

  // Wrong network warning
  if (wrongNetwork) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border p-8 rounded-xl max-w-md w-full text-center shadow-2xl"
        >
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-4">Wrong Network</h2>
          <p className="text-muted-foreground mb-6">
            Please switch to {NETWORK.chainName} to continue using the gaming platform.
          </p>
          <div className="space-y-3">
            <Button 
              variant="hero" 
              className="w-full"
              onClick={handleSwitchNetwork}
            >
              Switch to {NETWORK.chainName}
            </Button>
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => router.push('/')}
            >
              Go Back
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!currentUser) return null;

  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border p-4 flex flex-col z-20">
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
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            {NETWORK.chainName}
          </div>
          <div className="text-xs text-muted-foreground">
            Chain ID: {NETWORK.chainIdDecimal}
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
      <main className="ml-64 p-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">
              Welcome back, <span className="text-primary">{currentUser.username}</span>
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
            <div className="bg-card border border-border rounded-lg px-4 py-2 shadow-sm">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-sm font-medium">{shortenAddress(walletAddress || '')}</div>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                    <span>ETH: {parseFloat(ethBalance).toFixed(4)}</span>
                    <span className="text-primary font-medium">GAME: {parseFloat(gameBalance).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile */}
            <div className="bg-card border border-border rounded-lg px-4 py-2 flex items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors shadow-sm" onClick={() => router.push('/profile')}>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl">
                {currentUser.avatar}
              </div>
              <div>
                <div className="text-sm font-medium">{currentUser.username}</div>
                <div className="text-xs text-muted-foreground">ELO: {currentUser.rating}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Quick Actions */}
        <section className="grid grid-cols-3 gap-6 mb-8">
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
              color: 'text-secondary-foreground', // Adjusted for shadcn theme
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
        <div className="grid grid-cols-3 gap-6">
          {/* Active Lobbies */}
          <div className="col-span-2">
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
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-background" />
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

        {/* Recent Matches */}
        {recentMatches && recentMatches.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-xl font-bold mb-4">Recent Matches</h2>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="space-y-3">
                {recentMatches.slice(0, 5).map((match, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">
                        {match.gameType === 'chess' ? '♟️' : '🃏'}
                      </div>
                      <div>
                        <div className="font-medium">{match.opponent}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(match.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className={`font-bold ${
                      match.result === 'win' ? 'text-success' : 
                      match.result === 'loss' ? 'text-destructive' : 
                      'text-muted-foreground'
                    }`}>
                      {match.result.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}