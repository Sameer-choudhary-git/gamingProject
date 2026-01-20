"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/gameStore';
import { Button } from '@/ui/button';
import { ArrowLeft, User, Bell, Volume2, Wallet, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { shortenAddress } from '@/lib/wallet';

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, walletAddress, setCurrentUser, setWalletAddress } = useGameStore();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    if (!currentUser) router.push('/');
  }, [currentUser, router]);

  const handleLogout = () => {
    setCurrentUser(null);
    setWalletAddress(null);
    router.push('/');
    toast({ title: 'Logged out successfully' });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h1 className="font-display text-2xl font-bold">Settings</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="gaming-card p-6">
          <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
            <User className="w-5 h-5" /> Profile
          </h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-3xl">
              {currentUser?.avatar}
            </div>
            <div>
              <div className="font-bold text-lg">{currentUser?.username}</div>
              <div className="text-muted-foreground">ELO: {currentUser?.rating}</div>
            </div>
          </div>
        </div>

        <div className="gaming-card p-6">
          <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5" /> Wallet
          </h2>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Connected</span>
            <span className="font-mono">{shortenAddress(walletAddress || '')}</span>
          </div>
        </div>

        <div className="gaming-card p-6 space-y-4">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Bell className="w-5 h-5" /> Preferences
          </h2>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Volume2 className="w-4 h-4" /> Sound Effects</span>
            <button onClick={() => setSoundEnabled(!soundEnabled)} className={`w-12 h-6 rounded-full ${soundEnabled ? 'bg-primary' : 'bg-muted'}`}>
              <div className={`w-5 h-5 rounded-full bg-foreground transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Bell className="w-4 h-4" /> Notifications</span>
            <button onClick={() => setNotificationsEnabled(!notificationsEnabled)} className={`w-12 h-6 rounded-full ${notificationsEnabled ? 'bg-primary' : 'bg-muted'}`}>
              <div className={`w-5 h-5 rounded-full bg-foreground transition-transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        <Button variant="destructive" className="w-full" onClick={handleLogout}>
          <LogOut className="w-5 h-5 mr-2" /> Disconnect Wallet
        </Button>
      </main>
    </div>
  );
};