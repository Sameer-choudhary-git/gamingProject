"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/gameStore';
import { Button } from '@/ui/button';
import { 
  ArrowLeft, Trophy, Medal, Star, TrendingUp,
  Coins, Gamepad2, Calendar
} from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  player: {
    id: string;
    username: string;
    avatar: string;
  };
  wins: number;
  earnings: number;
  rating: number;
  trend: 'up' | 'down' | 'same';
}

const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, player: { id: '1', username: 'ChessMaster', avatar: '♟️' }, wins: 156, earnings: 12500, rating: 2150, trend: 'up' },
  { rank: 2, player: { id: '2', username: 'CryptoKing', avatar: '👑' }, wins: 142, earnings: 10800, rating: 2050, trend: 'same' },
  { rank: 3, player: { id: '3', username: 'PokerFace', avatar: '🃏' }, wins: 138, earnings: 9500, rating: 1980, trend: 'up' },
  { rank: 4, player: { id: '4', username: 'BlackjackPro', avatar: '🎰' }, wins: 125, earnings: 8200, rating: 1920, trend: 'down' },
  { rank: 5, player: { id: '5', username: 'GrandMaster', avatar: '🏆' }, wins: 118, earnings: 7500, rating: 1890, trend: 'up' },
  { rank: 6, player: { id: '6', username: 'LuckyDraw', avatar: '🍀' }, wins: 110, earnings: 6800, rating: 1850, trend: 'same' },
  { rank: 7, player: { id: '7', username: 'AceHigh', avatar: '🎴' }, wins: 105, earnings: 6200, rating: 1820, trend: 'down' },
  { rank: 8, player: { id: '8', username: 'CardShark', avatar: '🦈' }, wins: 98, earnings: 5500, rating: 1780, trend: 'up' },
  { rank: 9, player: { id: '9', username: 'BluffMaster', avatar: '😎' }, wins: 92, earnings: 4800, rating: 1750, trend: 'same' },
  { rank: 10, player: { id: '10', username: 'ChipLeader', avatar: '💰' }, wins: 88, earnings: 4200, rating: 1720, trend: 'up' },
];

type TimeFilter = 'daily' | 'weekly' | 'alltime';
type SortBy = 'wins' | 'earnings' | 'rating';

export default function LeaderboardPage() {
  const router = useRouter();
  const { currentUser } = useGameStore();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('weekly');
  const [sortBy, setSortBy] = useState<SortBy>('rating');

  useEffect(() => {
    if (!currentUser) {
      router.push('/');
    }
  }, [currentUser, router]);

  const sortedLeaderboard = [...mockLeaderboard].sort((a, b) => {
    switch (sortBy) {
      case 'wins': return b.wins - a.wins;
      case 'earnings': return b.earnings - a.earnings;
      case 'rating': return b.rating - a.rating;
      default: return 0;
    }
  }).map((entry, index) => ({ ...entry, rank: index + 1 }));

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-6 h-6 text-gold" />;
      case 2: return <Medal className="w-6 h-6 text-silver" />;
      case 3: return <Medal className="w-6 h-6 text-bronze" />;
      default: return <span className="w-6 h-6 flex items-center justify-center font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-gold/20 to-transparent border-gold/50';
      case 2: return 'bg-gradient-to-r from-silver/20 to-transparent border-silver/50';
      case 3: return 'bg-gradient-to-r from-bronze/20 to-transparent border-bronze/50';
      default: return 'border-border';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
            <h1 className="font-display text-2xl font-bold">Leaderboard</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        {/* Top 3 Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {sortedLeaderboard.slice(0, 3).map((entry, index) => (
            <motion.div
              key={entry.player.id}
              className={`gaming-card p-6 text-center ${index === 0 ? 'order-2' : index === 1 ? 'order-1' : 'order-3'}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <div className={`relative inline-block mb-4 ${index === 0 ? 'scale-125' : ''}`}>
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-4xl mx-auto">
                  {entry.player.avatar}
                </div>
                <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xl font-bold ${
                  index === 0 ? 'bg-gold text-black' :
                  index === 1 ? 'bg-silver text-black' :
                  'bg-bronze text-black'
                }`}>
                  {entry.rank}
                </div>
              </div>
              
              <h3 className={`font-display text-lg font-bold mb-1 ${index === 0 ? 'gradient-text-gold' : ''}`}>
                {entry.player.username}
              </h3>
              
              <div className="text-2xl font-display font-bold text-primary mb-2">
                {entry.rating} ELO
              </div>
              
              <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Trophy className="w-4 h-4" />
                  {entry.wins}
                </span>
                <span className="flex items-center gap-1">
                  <Coins className="w-4 h-4" />
                  ${entry.earnings}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex gap-2">
            {(['daily', 'weekly', 'alltime'] as TimeFilter[]).map((filter) => (
              <Button
                key={filter}
                variant={timeFilter === filter ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeFilter(filter)}
              >
                {filter === 'daily' && <Calendar className="w-4 h-4 mr-1" />}
                {filter.charAt(0).toUpperCase() + filter.slice(1).replace('alltime', 'All Time')}
              </Button>
            ))}
          </div>

          <div className="flex gap-2 ml-auto">
            <span className="text-sm text-muted-foreground flex items-center mr-2">Sort by:</span>
            {(['rating', 'wins', 'earnings'] as SortBy[]).map((sort) => (
              <Button
                key={sort}
                variant={sortBy === sort ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy(sort)}
              >
                {sort === 'rating' && <Star className="w-4 h-4 mr-1" />}
                {sort === 'wins' && <Trophy className="w-4 h-4 mr-1" />}
                {sort === 'earnings' && <Coins className="w-4 h-4 mr-1" />}
                {sort.charAt(0).toUpperCase() + sort.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="gaming-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground w-20">Rank</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Player</th>
                <th className="text-center p-4 text-sm font-medium text-muted-foreground">Trend</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">Wins</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">Earnings</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">Rating</th>
              </tr>
            </thead>
            <tbody>
              {sortedLeaderboard.map((entry, index) => (
                <motion.tr
                  key={entry.player.id}
                  className={`border-t ${getRankBg(entry.rank)} ${
                    entry.player.id === currentUser?.id ? 'bg-primary/10' : ''
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <td className="p-4">
                    {getRankIcon(entry.rank)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl">
                        {entry.player.avatar}
                      </div>
                      <div>
                        <div className="font-medium">{entry.player.username}</div>
                        {entry.player.id === currentUser?.id && (
                          <span className="text-xs text-primary">(You)</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <TrendingUp className={`w-5 h-5 mx-auto ${
                      entry.trend === 'up' ? 'text-success' :
                      entry.trend === 'down' ? 'text-destructive rotate-180' :
                      'text-muted-foreground rotate-90'
                    }`} />
                  </td>
                  <td className="p-4 text-right font-medium">{entry.wins}</td>
                  <td className="p-4 text-right font-medium text-gold">${entry.earnings.toLocaleString()}</td>
                  <td className="p-4 text-right">
                    <span className="font-display font-bold text-primary">{entry.rating}</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Your Position */}
        {currentUser && (
          <div className="mt-6 gaming-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gamepad2 className="w-5 h-5 text-primary" />
                <span className="text-muted-foreground">Your current position:</span>
              </div>
              <div className="flex items-center gap-6">
                <span className="font-display font-bold">#42</span>
                <span className="flex items-center gap-1">
                  <Trophy className="w-4 h-4" />
                  23 wins
                </span>
                <span className="flex items-center gap-1 text-gold">
                  <Coins className="w-4 h-4" />
                  $850
                </span>
                <span className="font-display text-primary font-bold">
                  {currentUser.rating} ELO
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};