"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/gameStore';
import { useUser } from "@account-kit/react"; 
import { usePresence } from '@/components/PresenceProvider'; // <--- NEW IMPORT
import { Button } from '@/ui/button';
import { 
  ArrowLeft, UserPlus, MessageSquare, Swords, 
  Search, Users, Crown, Check, X, Loader2, RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface APIUser {
  id: string;
  username: string;
  avatar: string | null;
  requestId?: string;
  relationId?: string;
  rating?: any[];
}

export default function FriendsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const alchemyUser = useUser();
  const { onlineUserIds } = usePresence(); // <--- Get Real-Time Online List
  
  const { currentUser, setCurrentUser } = useGameStore();
  
  // UI State
  const [activeTab, setActiveTab] = useState<'friends' | 'guilds'>('friends');
  const [searchTerm, setSearchTerm] = useState('');
  const [addQuery, setAddQuery] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  
  // Data State
  const [friendList, setFriendList] = useState<APIUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<APIUser[]>([]);
  const [searchResults, setSearchResults] = useState<APIUser[]>([]);
  
  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  
  // Prevent double-fetching in React Strict Mode
  const hasFetched = useRef(false);

  // --- 1. MASTER INITIALIZATION ---
  const initPage = useCallback(async () => {
    if (friendList.length > 0) setIsLoading(false);

    if (!alchemyUser?.address) {
        setIsLoading(false);
        return;
    }

    try {
      let activeUserId = currentUser?.id;

      // Step A: Hydrate User (If missing from Zustand Store)
      if (!activeUserId) {
         const res = await fetch("/api/user/check", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ address: alchemyUser.address, email :alchemyUser.email }),
         });
         
         const data = await res.json();
         
         if (res.ok && data.exists && data.user) {
           setCurrentUser(data.user);
           activeUserId = data.user.id;
         } else {
           // User check failed, stop here
           return;
         }
      }

      // Step B: Fetch Friends
      if (activeUserId) {
        const res = await fetch(`/api/friends?userId=${activeUserId}`);
        const data = await res.json();
        
        if (data.friends) {
          // We just store the raw user data here.
          // We calculate "isOnline" dynamically in the render loop below.
          const mappedFriends = data.friends.map((f: any) => ({
            ...f,
            avatar: f.avatar || '👾',
          }));
          setFriendList(mappedFriends);
          
          const mappedRequests = data.requests.map((r: any) => ({
            ...r,
            avatar: r.avatar || '👤'
          }));
          setPendingRequests(mappedRequests);
        }
      }

    } catch (e) {
      console.error("Page Load Error:", e);
      toast({ title: "Connection Error", description: "Could not load friends.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [alchemyUser, currentUser?.id, setCurrentUser, toast, friendList.length]);

  // Run Init on Mount
  useEffect(() => {
    if (!hasFetched.current && alchemyUser) {
        hasFetched.current = true;
        initPage();
    }
  }, [initPage, alchemyUser]);


  // --- 2. DYNAMIC SORTING (Real-Time) ---
  // This re-runs instantly whenever `onlineUserIds` changes (Pusher event)
  // or whenever you type in the search bar.
  const processedFriends = useMemo(() => {
    // 1. Map friends with their real-time status
    const withStatus = friendList.map(friend => ({
      ...friend,
      isOnline: onlineUserIds.has(friend.id)
    }));

    // 2. Filter by search term
    const filtered = withStatus.filter(f => 
      f.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 3. Sort: Online friends first, then alphabetical
    return filtered.sort((a, b) => {
      if (a.isOnline === b.isOnline) {
        return a.username.localeCompare(b.username);
      }
      return a.isOnline ? -1 : 1;
    });
  }, [friendList, onlineUserIds, searchTerm]);


  // --- 3. ACTIONS ---

  const handleSearchNewUsers = async () => {
    if (addQuery.length < 3) return;
    setIsSearching(true);
    try {
      const res = await fetch('/api/friends/search', {
        method: 'POST',
        body: JSON.stringify({ query: addQuery, currentUserId: currentUser?.id })
      });
      const data = await res.json();
      setSearchResults(data.users || []);
    } catch (e) {
      toast({ title: "Search failed", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (targetId: string) => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        body: JSON.stringify({ action: 'REQUEST', userId: currentUser.id, targetId })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Request Sent!' });
        setSearchResults(prev => prev.filter(u => u.id !== targetId)); 
      } else {
        toast({ title: 'Error', description: data.error, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: 'Failed to send request', variant: "destructive" });
    }
  };

  const respondToRequest = async (requestId: string, action: 'ACCEPT' | 'REJECT') => {
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        body: JSON.stringify({ action, requestId })
      });
      if (res.ok) {
        toast({ title: action === 'ACCEPT' ? 'Friend Added!' : 'Request Removed' });
        initPage(); // Refresh list to remove request and add friend
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse">Loading social network...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border p-4 sticky top-0 z-10">
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
            Friends ({friendList.length})
          </Button>
          <Button
            variant={activeTab === 'guilds' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('guilds')}
          >
            <Crown className="w-5 h-5 mr-2" />
            Guilds
          </Button>
          <Button variant="ghost" size="icon" onClick={() => initPage()} title="Refresh List">
             <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {activeTab === 'friends' ? (
          <>
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search your friends..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <div className="mb-8">
                <h2 className="font-display text-lg font-bold mb-3 text-yellow-500">Pending Requests</h2>
                <div className="grid md:grid-cols-2 gap-3">
                  {pendingRequests.map((req) => (
                    <motion.div
                      key={req.id}
                      className="gaming-card p-4 flex items-center justify-between border-yellow-500/20"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl">
                          {req.avatar}
                        </div>
                        <div className="font-medium">{req.username}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="success" size="sm" onClick={() => respondToRequest(req.requestId!, 'ACCEPT')}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => respondToRequest(req.requestId!, 'REJECT')}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends List (Now Real-Time) */}
             <div>
                 <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
                    All Friends
                    {processedFriends.some(f => f.isOnline) && (
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                    )}
                 </h2>
                 
                 {processedFriends.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-border rounded-xl">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-muted-foreground">
                        {searchTerm ? "No matches found." : "No friends added yet."}
                      </p>
                      {!searchTerm && (
                        <Button variant="link" onClick={() => setShowAddFriend(true)}>Add someone?</Button>
                      )}
                    </div>
                 ) : (
                   <div className="grid md:grid-cols-2 gap-3">
                      {processedFriends.map(friend => (
                        <FriendCard key={friend.id} friend={friend} />
                      ))}
                   </div>
                 )}
              </div>
          </>
        ) : (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <Crown className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">Guild system coming soon in Phase 2!</p>
          </div>
        )}
      </main>

      {/* Add Friend Modal */}
      {showAddFriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="gaming-card p-6 max-w-md w-full bg-card"
          >
            <div className="flex justify-between items-center mb-4">
               <h2 className="font-display text-2xl font-bold">Find Players</h2>
               <Button variant="ghost" size="sm" onClick={() => setShowAddFriend(false)}><X className="w-4 h-4"/></Button>
            </div>
            
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="Username or address"
                value={addQuery}
                onChange={(e) => setAddQuery(e.target.value)}
                className="flex-1 px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button onClick={handleSearchNewUsers} disabled={isSearching}>
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4"/>}
              </Button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
               {searchResults.length === 0 && !isSearching && addQuery.length > 2 && (
                 <p className="text-center text-sm text-muted-foreground">No users found.</p>
               )}
               {searchResults.map(user => (
                 <div key={user.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-background/50">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          {user.avatar || '👤'}
                       </div>
                       <span className="font-medium">{user.username}</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => sendFriendRequest(user.id)}>
                      Add
                    </Button>
                 </div>
               ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Component for Individual Friend Card
const FriendCard = ({ friend }: { friend: APIUser & { isOnline: boolean } }) => {
  return (
    <motion.div
      className={`gaming-card p-4 flex items-center justify-between transition-all duration-300 ${!friend.isOnline ? 'opacity-70' : 'border-primary/30 bg-primary/5'}`}
      layout
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl">
            {friend.avatar}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background transition-colors duration-500 ${friend.isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-zinc-500'}`} />
        </div>
        <div>
          <div className="font-medium">{friend.username}</div>
          <div className={`text-xs ${friend.isOnline ? 'text-green-400 font-medium' : 'text-muted-foreground'}`}>
            {friend.isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" title="Chat (Coming Soon)">
          <MessageSquare className="w-4 h-4" />
        </Button>
        <Button 
            variant={friend.isOnline ? "default" : "outline"} 
            size="sm" 
            title="Challenge"
            disabled={!friend.isOnline} // Disable challenge if offline
        >
          <Swords className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};