"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useGameStore, Player } from '@/stores/gameStore';
import { Button } from '@/ui/button';
import { 
  ArrowLeft, UserPlus, MessageSquare, Swords, 
  Search, Users, Crown, Check, X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Guild {
  id: string;
  name: string;
  tag: string;
  avatar: string;
  members: number;
  maxMembers: number;
  wins: number;
  leader: string;
}

const mockGuilds: Guild[] = [
  { id: '1', name: 'Chess Masters', tag: 'CM', avatar: '♟️', members: 24, maxMembers: 30, wins: 450, leader: 'ChessMaster' },
  { id: '2', name: 'Poker Pros', tag: 'PP', avatar: '🃏', members: 18, maxMembers: 25, wins: 380, leader: 'PokerFace' },
  { id: '3', name: 'Lucky Cards', tag: 'LC', avatar: '🍀', members: 12, maxMembers: 20, wins: 290, leader: 'LuckyDraw' },
];

export default function FriendsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, friends } = useGameStore();
  const [activeTab, setActiveTab] = useState<'friends' | 'guilds'>('friends');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [pendingRequests] = useState<Player[]>([
    { id: 'req1', username: 'NewPlayer', avatar: '🎲', rating: 1400, isReady: false, isOnline: true },
  ]);

  useEffect(() => {
    if (!currentUser) {
      router.push('/');
    }
  }, [currentUser, router]);

  const filteredFriends = friends.filter(f => 
    f.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onlineFriends = filteredFriends.filter(f => f.isOnline);
  const offlineFriends = filteredFriends.filter(f => !f.isOnline);

  const handleChallenge = (friend: Player) => {
    toast({
      title: 'Challenge Sent!',
      description: `Waiting for ${friend.username} to accept...`,
    });
  };

  const handleAcceptRequest = (player: Player) => {
    toast({
      title: 'Friend Added!',
      description: `${player.username} is now your friend`,
    });
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
            <h1 className="font-display text-2xl font-bold">Social</h1>
          </div>
          
          <Button variant="hero" onClick={() => setShowAddFriend(true)}>
            <UserPlus className="w-5 h-5 mr-2" />
            Add Friend
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'friends' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('friends')}
          >
            <Users className="w-5 h-5 mr-2" />
            Friends ({friends.length})
          </Button>
          <Button
            variant={activeTab === 'guilds' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('guilds')}
          >
            <Crown className="w-5 h-5 mr-2" />
            Guilds
          </Button>
        </div>

        {activeTab === 'friends' ? (
          <>
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search friends..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <div className="mb-6">
                <h2 className="font-display text-lg font-bold mb-3">Friend Requests</h2>
                <div className="space-y-2">
                  {pendingRequests.map((player) => (
                    <motion.div
                      key={player.id}
                      className="gaming-card p-4 flex items-center justify-between"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl">
                          {player.avatar}
                        </div>
                        <div>
                          <div className="font-medium">{player.username}</div>
                          <div className="text-sm text-muted-foreground">ELO: {player.rating}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="success" size="sm" onClick={() => handleAcceptRequest(player)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button variant="destructive" size="sm">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Online Friends */}
            <div className="mb-6">
              <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                Online ({onlineFriends.length})
              </h2>
              <div className="grid md:grid-cols-2 gap-3">
                {onlineFriends.map((friend) => (
                  <FriendCard 
                    key={friend.id} 
                    friend={friend} 
                    onChallenge={handleChallenge}
                  />
                ))}
              </div>
              {onlineFriends.length === 0 && (
                <p className="text-muted-foreground text-center py-8">No friends online</p>
              )}
            </div>

            {/* Offline Friends */}
            <div>
              <h2 className="font-display text-lg font-bold mb-3 text-muted-foreground">
                Offline ({offlineFriends.length})
              </h2>
              <div className="grid md:grid-cols-2 gap-3">
                {offlineFriends.map((friend) => (
                  <FriendCard 
                    key={friend.id} 
                    friend={friend} 
                    onChallenge={handleChallenge}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Guilds */}
            <div className="grid md:grid-cols-2 gap-4">
              {mockGuilds.map((guild) => (
                <motion.div
                  key={guild.id}
                  className="gaming-card p-6"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center text-3xl">
                        {guild.avatar}
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-bold">{guild.name}</h3>
                        <span className="text-sm text-muted-foreground">[{guild.tag}]</span>
                      </div>
                    </div>
                    <Crown className="w-5 h-5 text-gold" />
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Members</span>
                      <span className="font-medium">{guild.members}/{guild.maxMembers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Wins</span>
                      <span className="font-medium text-success">{guild.wins}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Leader</span>
                      <span className="font-medium">{guild.leader}</span>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    View Guild
                  </Button>
                </motion.div>
              ))}

              {/* Create Guild Card */}
              <motion.div
                className="gaming-card p-6 flex flex-col items-center justify-center border-dashed cursor-pointer hover:border-primary"
                whileHover={{ scale: 1.02 }}
              >
                <Crown className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-display text-lg font-bold mb-2">Create Guild</h3>
                <p className="text-muted-foreground text-center text-sm mb-4">
                  Start your own gaming community
                </p>
                <Button variant="outline">
                  Create Guild
                </Button>
              </motion.div>
            </div>
          </>
        )}
      </main>

      {/* Add Friend Modal */}
      {showAddFriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="gaming-card p-6 max-w-md w-full mx-4"
          >
            <h2 className="font-display text-2xl font-bold mb-4">Add Friend</h2>
            <p className="text-muted-foreground mb-4">
              Enter a username or wallet address to send a friend request
            </p>
            
            <input
              type="text"
              placeholder="Username or wallet address"
              className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary mb-4"
            />
            
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setShowAddFriend(false)}>
                Cancel
              </Button>
              <Button variant="hero" className="flex-1" onClick={() => {
                toast({ title: 'Friend request sent!' });
                setShowAddFriend(false);
              }}>
                Send Request
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

interface FriendCardProps {
  friend: Player;
  onChallenge: (friend: Player) => void;
}

const FriendCard = ({ friend, onChallenge }: FriendCardProps) => {
  return (
    <motion.div
      className={`gaming-card p-4 flex items-center justify-between ${!friend.isOnline ? 'opacity-60' : ''}`}
      whileHover={{ scale: 1.01 }}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl">
            {friend.avatar}
          </div>
          {friend.isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-background" />
          )}
        </div>
        <div>
          <div className="font-medium">{friend.username}</div>
          <div className="text-sm text-muted-foreground">ELO: {friend.rating}</div>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button variant="ghost" size="sm">
          <MessageSquare className="w-4 h-4" />
        </Button>
        {friend.isOnline && (
          <Button variant="outline" size="sm" onClick={() => onChallenge(friend)}>
            <Swords className="w-4 h-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
};