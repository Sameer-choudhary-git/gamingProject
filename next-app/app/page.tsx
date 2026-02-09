"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/ui/button'; 
import { useGameStore } from '@/stores/gameStore';
import { useAuthModal, useUser, useLogout, useSignerStatus } from "@account-kit/react";
import { Gamepad2, Users, Trophy, Wallet, Zap, ArrowRight, LogOut, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 10 }
  }
};

const floatAnimation = {
  y: [0, -10, 0],
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

const pulseAnimation = {
  scale: [1, 1.05, 1],
  opacity: [0.5, 1, 0.5],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

export default function LandingPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { openAuthModal } = useAuthModal();
  const user = useUser();
  const { logout } = useLogout();
  const { isInitializing } = useSignerStatus();
  const { playersOnline, activeGames, totalPrizePool } = useGameStore();
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationData, setRegistrationData] = useState({ name: '', username: '' });
  const hasClaimedRef = useRef(false);

  useEffect(() => {
    if (user && user.email && user.address && !hasClaimedRef.current) {
      hasClaimedRef.current = true; 
      const handleLoginSequence = async () => {
        try {
          // Check if wallet exists in database
          const checkRes = await fetch("/api/user/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: user.address, email: user.email }),
          });
          const checkData = await checkRes.json();
          
          if (!checkData.exists) {
            // New user - show registration modal
            setShowRegistration(true);
          } else {
            router.push('/dashboard');
          }
        } catch (error) {
          console.error("User check failed:", error);
          toast({
            title: "Error",
            description: "Failed to verify user. Please try again.",
            variant: "destructive",
          });
        }
      };
      handleLoginSequence();
    }
  }, [user, router, toast]);

  const handleRegistration = async () => {
    if (!registrationData.name || !registrationData.username) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    setIsAirdropping(true);
    try {
      // Register user and airdrop tokens
      const res = await fetch("/api/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: user?.address,
          email: user?.email,
          name: registrationData.name,
          username: registrationData.username,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast({
          title: "Welcome to Social Gaming Hub! 🎁",
          description: "100 GAME tokens have been sent to your wallet!",
          variant: "default",
        });
        setShowRegistration(false);
        setTimeout(() => router.push('/dashboard'), 1000);
      } else {
        toast({
          title: "Registration Failed",
          description: data.message || "Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Registration failed:", error);
      toast({
        title: "Error",
        description: "Failed to complete registration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAirdropping(false);
    }
  };

  const handleLogout = () => {
    logout();
    hasClaimedRef.current = false;
    toast({ title: "Logged out" });
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden relative selection:bg-primary/30">
      
      {/* --- Dynamic Background --- */}
      <div className="fixed inset-0 bg-hero-pattern opacity-20 pointer-events-none mix-blend-overlay" />
      <div className="fixed inset-0 bg-gradient-to-b from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
      
      {/* Animated Blobs */}
      <motion.div
        className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[100px] pointer-events-none"
        animate={{ 
          x: [0, 100, 0], 
          y: [0, 50, 0],
          scale: [1, 1.2, 1] 
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-secondary/10 blur-[120px] pointer-events-none"
        animate={{ 
          x: [0, -100, 0], 
          y: [0, -50, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />

      {/* --- Header --- */}
      <header className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3 group cursor-pointer"
        >
          <div className="relative">
            <Gamepad2 className="w-10 h-10 text-primary transition-transform group-hover:rotate-12 duration-300" />
            <motion.div 
              className="absolute inset-0 bg-primary blur-lg opacity-50"
              animate={pulseAnimation}
            />
          </div>
          <span className="font-display text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 group-hover:to-primary transition-all duration-300">
            Social Gaming Hub
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          {user ? (
            <motion.div 
              className="flex items-center gap-3 bg-card/50 backdrop-blur-md border border-white/10 p-1 pl-4 pr-2 rounded-full"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-full">
                  <Wallet className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground/90">
                  {user.email ? user.email.split('@')[0] : "Player"}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout}
                className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </motion.div>
          ) : (
            <Button 
              variant="outline" 
              onClick={openAuthModal}
              disabled={isInitializing}
              className="gap-2 border-primary/30 hover:bg-primary/10 hover:border-primary/60 transition-all duration-300"
            >
              <Wallet className="w-4 h-4" />
              {isInitializing ? 'Loading...' : 'Connect Wallet'}
            </Button>
          )}
        </motion.div>
      </header>

      {/* --- Main Content --- */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-32">
        <motion.div 
          className="grid lg:grid-cols-2 gap-16 items-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Left Column: Text & CTA */}
          <motion.div variants={itemVariants} className="space-y-8">
            <div className="relative">
              <motion.div 
                className="absolute -top-10 -left-10 text-primary/10 pointer-events-none"
                animate={{ rotate: 360 }}
                transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles size={120} />
              </motion.div>

              <h1 className="font-display text-6xl md:text-8xl font-bold leading-[0.9] tracking-tight">
                <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-300 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                  Play
                </span>
                <br />
                <span className="inline-block text-foreground drop-shadow-xl">
                  Win
                </span>
                <br />
                <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600 drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                  Earn
                </span>
              </h1>
            </div>
            
            <p className="text-xl text-muted-foreground max-w-lg leading-relaxed border-l-4 border-primary/30 pl-6">
              The ultimate multiplayer gaming platform on <span className="text-foreground font-semibold">Base L2</span>. 
              Login now to claim your <span className="text-primary font-bold animate-pulse">100 FREE GAME TOKENS</span>.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button 
                variant="hero" 
                size="lg"
                onClick={user ? () => router.push('/dashboard') : openAuthModal}
                disabled={isInitializing || isAirdropping}
                className="relative overflow-hidden group gap-3 text-lg px-8 py-7 shadow-[0_0_40px_-10px_rgba(6,182,212,0.5)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 ease-in-out" />
                <Zap className="w-6 h-6 fill-current" />
                <span className="font-bold tracking-wide">
                  {isAirdropping ? 'Claiming Bonus...' : user ? 'Enter Hub' : 'Login & Play'}
                </span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg" 
                onClick={() => router.push('/tournaments')}
                className="h-[60px] px-8 border-white/10 hover:bg-white/5 hover:border-white/20"
              >
                <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                Tournaments
              </Button>
            </div>

            {/* Live Stats Row */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-white/5">
              {[
                { icon: Users, label: "Online", value: playersOnline.toLocaleString(), color: "text-primary" },
                { icon: Gamepad2, label: "Games", value: activeGames, color: "text-green-500" },
                { icon: Trophy, label: "Prize Pool", value: `$${totalPrizePool.toLocaleString()}`, color: "text-yellow-500" }
              ].map((stat, idx) => (
                <motion.div 
                  key={idx}
                  className="group p-3 rounded-xl hover:bg-white/5 transition-colors cursor-default"
                  whileHover={{ y: -2 }}
                >
                  <stat.icon className={`w-5 h-5 ${stat.color} mb-2 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all`} />
                  <div className="font-display text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Column: Game Cards */}
          <motion.div 
            variants={containerVariants}
            className="relative"
          >
            {/* Decorative Grid Behind Cards */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] pointer-events-none" />

            <div className="grid grid-cols-2 gap-5 relative z-10 perspective-[1000px]">
              
              {/* Chess Card (Main) */}
              <motion.div 
                variants={itemVariants}
                animate={floatAnimation}
                className="col-span-2 group relative overflow-hidden bg-card/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-primary/50 transition-all duration-500 cursor-pointer shadow-2xl"
                onClick={() => openAuthModal()}
                whileHover={{ scale: 1.02, rotateX: 2, rotateY: 2 }}
              >
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Sparkles size={100} />
                </div>
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-primary/20">
                    <span className="text-4xl filter drop-shadow-lg">♟️</span>
                  </div>
                  <h3 className="font-display text-2xl font-bold mb-2 text-white group-hover:text-primary transition-colors">Chess</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">Master strategy and climb the global leaderboards in real-time matches.</p>
                  
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-primary/10 border border-primary/20 rounded text-[10px] font-bold text-primary uppercase tracking-wide">Ranked</span>
                    <span className="px-2 py-1 bg-secondary/30 border border-white/5 rounded text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Blitz</span>
                  </div>
                </div>
              </motion.div>

              {/* Poker Card */}
              <motion.div 
                variants={itemVariants}
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-card/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition-all cursor-pointer group"
                onClick={() => openAuthModal()}
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">🃏</div>
                <h3 className="font-display text-lg font-bold mb-1 text-white group-hover:text-purple-400">Poker</h3>
                <p className="text-xs text-muted-foreground">Texas Hold'em Stakes.</p>
              </motion.div>

              {/* Blackjack Card */}
              <motion.div 
                variants={itemVariants}
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-card/20 border border-white/5 rounded-2xl p-6 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 group"
              >
                <div className="text-4xl mb-4 group-hover:rotate-180 transition-transform duration-700">🎰</div>
                <h3 className="font-display text-lg font-bold mb-1">Slots</h3>
                <p className="text-xs text-muted-foreground">Coming Soon</p>
              </motion.div>

            </div>

            {/* Network Badge */}
            <motion.div 
              variants={itemVariants}
              className="mt-8 flex justify-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm text-xs font-medium text-muted-foreground hover:bg-white/10 transition-colors">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                Powered by Base L2 • Low Fees • Instant Finality
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </main>

      {/* --- Registration Modal --- */}
      <AnimatePresence>
        {showRegistration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !isAirdropping && setShowRegistration(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-card border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h2 className="font-display text-3xl font-bold mb-2">Welcome! 🎉</h2>
                <p className="text-muted-foreground">Complete your profile to claim 100 GAME tokens</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground/80">Full Name</label>
                  <input
                    type="text"
                    value={registrationData.name}
                    onChange={(e) => setRegistrationData({ ...registrationData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-background/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Enter your name"
                    disabled={isAirdropping}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground/80">Username</label>
                  <input
                    type="text"
                    value={registrationData.username}
                    onChange={(e) => setRegistrationData({ ...registrationData, username: e.target.value })}
                    className="w-full px-4 py-3 bg-background/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Choose a username"
                    disabled={isAirdropping}
                  />
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
                  <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-primary">Welcome Bonus</p>
                    <p className="text-muted-foreground">You'll receive 100 GAME tokens instantly!</p>
                  </div>
                </div>

                <Button
                  onClick={handleRegistration}
                  variant="hero"
                  size="lg"
                  disabled={isAirdropping}
                  className="w-full gap-2 text-base"
                >
                  {isAirdropping ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="w-5 h-5" />
                      </motion.div>
                      Claiming Tokens...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 fill-current" />
                      Claim Tokens & Continue
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}