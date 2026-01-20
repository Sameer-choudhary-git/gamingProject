"use client";

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/ui/button'; 
import { useGameStore } from '@/stores/gameStore';
// 1. UPDATED IMPORTS: Alchemy Hooks
import { useAuthModal, useUser, useLogout, useSignerStatus } from "@account-kit/react";
import { Gamepad2, Users, Trophy, Wallet, Zap, ArrowRight, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  // Alchemy Hooks
  const { openAuthModal } = useAuthModal();
  const user = useUser(); // Alchemy user object (address, email, etc.)
  const { logout } = useLogout();
  const { isInitializing } = useSignerStatus();

  // Game Store (for UI stats only now)
  const { 
    playersOnline, 
    activeGames, 
    totalPrizePool,
  } = useGameStore();

  const [isAirdropping, setIsAirdropping] = useState(false);
  
  // Ref to prevent double-firing API in React Strict Mode
  const hasClaimedRef = useRef(false);

  // 2. EFFECT: Handle Login & Automatic Airdrop
  useEffect(() => {
    // Only proceed if user is fully logged in and we haven't processed them yet
    if (user && user.email && user.address && !hasClaimedRef.current) {
      hasClaimedRef.current = true; // Mark processed immediately

      const handleLoginSequence = async () => {
        setIsAirdropping(true);
        
        try {
          // Call our secure API to claim tokens
          console.log("Checking airdrop eligibility for:", user.email);
          
          const res = await fetch("/api/airdrop", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              address: user.address, 
              email: user.email 
            }),
          });

          const data = await res.json();
          
          if (data.success) {
            toast({
              title: "Welcome Bonus! 🎁",
              description: "100 GAME tokens have been sent to your wallet!",
              variant: "default", 
            });
          } else {
             console.log("Airdrop status:", data.message || "Skipped (already claimed)");
          }

        } catch (error) {
          console.error("Airdrop check failed:", error);
        } finally {
          setIsAirdropping(false);
          // Redirect to dashboard after a short delay for user to see the toast
          setTimeout(() => router.push('/dashboard'), 1000);
        }
      };

      handleLoginSequence();
    }
  }, [user, router, toast]);

  // Handle Logout manually if needed
  const handleLogout = () => {
    logout();
    hasClaimedRef.current = false;
    toast({ title: "Logged out" });
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Background & Effects */}
      <div className="fixed inset-0 bg-hero-pattern opacity-30 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-b from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
      
      {/* Animated blobs */}
      <motion.div
        className="fixed top-20 left-10 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none"
        animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="fixed bottom-20 right-10 w-96 h-96 rounded-full bg-secondary/10 blur-3xl pointer-events-none"
        animate={{ x: [0, -30, 0], y: [0, -50, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <Gamepad2 className="w-10 h-10 text-primary" />
          <span className="font-display text-2xl font-bold text-glow-primary">
            Social Gaming Hub
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {user ? (
            <div className="flex items-center gap-3">
              {/* Wallet Badge */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-background border border-border">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  {user.email ? user.email.split('@')[0] : "Player"}
                </span>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button 
              variant="outline" 
              onClick={openAuthModal}
              disabled={isInitializing}
              className="gap-2"
            >
              <Wallet className="w-4 h-4" />
              {isInitializing ? 'Loading...' : 'Login'}
            </Button>
          )}
        </motion.div>
      </header>

      {/* Main Hero Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight mb-6">
              <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">Play</span>
              <br />
              <span className="text-foreground">Win</span>
              <br />
              <span className="text-yellow-500 bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-600">Earn</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-lg">
              The ultimate multiplayer gaming platform on Base L2. Login now to claim 
              <span className="text-primary font-bold ml-1">100 FREE GAME TOKENS</span>.
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <Button 
                variant="hero" 
                size="lg"
                onClick={user ? () => router.push('/dashboard') : openAuthModal}
                disabled={isInitializing || isAirdropping}
                className="gap-2 text-lg px-8"
              >
                <Zap className="w-5 h-5" />
                {isAirdropping ? 'Claiming Bonus...' : user ? 'Enter Hub' : 'Login & Claim Airdrop'}
                <ArrowRight className="w-5 h-5" />
              </Button>
              
              <Button variant="outline" size="lg" onClick={() => router.push('/tournaments')}>
                <Trophy className="w-5 h-5 mr-2" />
                Tournaments
              </Button>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-3 gap-4">
              <motion.div className="bg-card border border-border p-4 rounded-xl text-center" whileHover={{ scale: 1.02 }}>
                <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                <div className="font-display text-2xl font-bold">{playersOnline.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Players Online</div>
              </motion.div>

              <motion.div className="bg-card border border-border p-4 rounded-xl text-center" whileHover={{ scale: 1.02 }}>
                <Gamepad2 className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <div className="font-display text-2xl font-bold">{activeGames}</div>
                <div className="text-sm text-muted-foreground">Active Games</div>
              </motion.div>

              <motion.div className="bg-card border border-border p-4 rounded-xl text-center" whileHover={{ scale: 1.02 }}>
                <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                <div className="font-display text-2xl font-bold text-yellow-500">${totalPrizePool.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Prize Pool</div>
              </motion.div>
            </div>
          </motion.div>

          {/* Game Preview Cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="relative"
          >
            <div className="grid grid-cols-2 gap-4">
              <motion.div 
                className="bg-card border border-border rounded-xl p-6 col-span-2 hover:border-primary/50 transition-colors cursor-pointer" 
                whileHover={{ scale: 1.02, y: -5 }}
                onClick={() => openAuthModal()} // Trigger login on click
              >
                <div className="text-4xl mb-4">♟️</div>
                <h3 className="font-display text-xl font-bold mb-2">Chess</h3>
                <p className="text-muted-foreground text-sm">Classic strategy game with ranked matchmaking.</p>
                <div className="mt-3 text-xs text-primary font-medium">Low gas • Fast games</div>
              </motion.div>
              <motion.div 
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors cursor-pointer" 
                whileHover={{ scale: 1.02, y: -5 }}
                onClick={() => openAuthModal()}
              >
                <div className="text-4xl mb-4">🃏</div>
                <h3 className="font-display text-xl font-bold mb-2">Poker</h3>
                <p className="text-muted-foreground text-sm">Texas Hold'em with real-time betting.</p>
              </motion.div>
              <motion.div 
                className="bg-card border border-border rounded-xl p-6 opacity-60" 
                whileHover={{ scale: 1.02, y: -5 }}
              >
                <div className="text-4xl mb-4">🎰</div>
                <h3 className="font-display text-xl font-bold mb-2">Blackjack</h3>
                <p className="text-muted-foreground text-sm">Coming soon...</p>
              </motion.div>
            </div>
            
            {/* Network Info Badge */}
            <div className="mt-6 bg-secondary/50 border border-border rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Powered by Base L2
              </div>
              <div className="text-xs text-muted-foreground">
                Fast transactions • Low fees • Ethereum security
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}