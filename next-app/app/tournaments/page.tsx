"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/gameStore';
import { Button } from '@/ui/button';
import { 
  ArrowLeft, Trophy, Users, Coins, Calendar, 
  Clock, ChevronRight, Gamepad2
} from 'lucide-react';

// ... (Keep existing Interfaces & mockTournaments logic same as provided in prompt) ...

interface Tournament {
  id: string;
  name: string;
  gameType: 'chess' | 'poker' | 'blackjack';
  prizePool: number;
  entryFee: number;
  participants: number;
  maxParticipants: number;
  startTime: Date;
  status: 'upcoming' | 'ongoing' | 'finished';
  bracket?: any; // Simplified for brevity in this response
}

const mockTournaments: Tournament[] = [
  // ... your mock data here
  {
    id: '1',
    name: 'Chess Grand Prix',
    gameType: 'chess',
    prizePool: 5000,
    entryFee: 50,
    participants: 12,
    maxParticipants: 16,
    startTime: new Date(Date.now() + 3600000),
    status: 'upcoming',
  },
];

export default function TournamentsPage() {
  const router = useRouter();
  const { currentUser } = useGameStore();
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'finished'>('all');

  useEffect(() => {
    if (!currentUser) {
      router.push('/');
    }
  }, [currentUser, router]);

  const filteredTournaments = mockTournaments.filter(t => 
    filter === 'all' || t.status === filter
  );

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
            <h1 className="font-display text-2xl font-bold">Tournaments</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {selectedTournament ? (
          <TournamentDetail 
            tournament={selectedTournament} 
            onBack={() => setSelectedTournament(null)} 
          />
        ) : (
          <>
            {/* Filters */}
            <div className="flex gap-2 mb-6">
              {(['all', 'upcoming', 'ongoing', 'finished'] as const).map((status) => (
                <Button
                  key={status}
                  variant={filter === status ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>

            {/* Tournament Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTournaments.map((tournament) => (
                <motion.div
                  key={tournament.id}
                  className="gaming-card p-6 cursor-pointer group"
                  whileHover={{ scale: 1.02, y: -5 }}
                  onClick={() => setSelectedTournament(tournament)}
                >
                   {/* ... (Keep existing card content) ... */}
                   <h3>{tournament.name}</h3>
                   <div className="text-sm text-muted-foreground">Prize: ${tournament.prizePool}</div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

interface TournamentDetailProps {
  tournament: Tournament;
  onBack: () => void;
}

const TournamentDetail = ({ tournament, onBack }: TournamentDetailProps) => {
  return (
    <div>
      <Button variant="ghost" onClick={onBack} className="mb-6">
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Tournaments
      </Button>
      {/* Detail Content */}
      <div className="gaming-card p-6">
        <h2 className="text-2xl font-bold">{tournament.name}</h2>
        {/* ... Rest of detail UI ... */}
      </div>
    </div>
  );
};