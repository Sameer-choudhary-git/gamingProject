"use client";

import { useEffect, useState, createContext, useContext, ReactNode, useRef } from 'react';
import { pusherClient } from '@/lib/pusher';
import { useGameStore } from '@/stores/gameStore';
import { Members, Channel } from 'pusher-js';

type PresenceContextType = {
  onlineUserIds: Set<string>;
  isConnected: boolean;
};

const PresenceContext = createContext<PresenceContextType>({ 
  onlineUserIds: new Set(),
  isConnected: false 
});

export const usePresence = () => useContext(PresenceContext);

export default function PresenceProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useGameStore();
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<Channel | null>(null);
  const authorizerSetRef = useRef(false);

  useEffect(() => {
    if (!currentUser?.id) {
      console.log("⏸️ No user logged in, skipping presence setup");
      return;
    }

    console.log("🔌 Setting up Presence for:", currentUser.username);
    console.log("📊 Pusher connection state:", pusherClient.connection.state);

    // Force connection if not already connected
    if (pusherClient.connection.state === 'initialized' || 
        pusherClient.connection.state === 'disconnected') {
      console.log("⚡ Forcing Pusher connection...");
      pusherClient.connect();
    }

    // 1. Configure Pusher Auth (Only Once)
    if (!authorizerSetRef.current) {
      // Set the auth endpoint explicitly
      (pusherClient as any).config.authEndpoint = '/api/pusher/auth';
      
      // Override the authorizer to add custom headers
      (pusherClient as any).config.authorizer = (channel: { name: string }) => {
        return {
          authorize: async (socketId: string, callback: (error: any, data: any) => void) => {
            try {
              console.log("🔐 Authorizing channel:", channel.name);
              console.log("🔌 Socket ID:", socketId);
              
              const res = await fetch('/api/pusher/auth', {
                method: 'POST',
                headers: {
                  'x-user-id': currentUser.id,
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  socket_id: socketId,
                  channel_name: channel.name,
                }).toString(),
              });

              console.log("📡 Auth response status:", res.status);

              if (!res.ok) {
                const text = await res.text();
                console.error("❌ Auth failed:", res.status, text);
                throw new Error(`Auth failed: ${res.status} ${text}`);
              }

              const data = await res.json();
              console.log("✅ Auth data received:", data);
              callback(null, data);
              
            } catch (err) {
              console.error("💥 Auth error:", err);
              callback(new Error(`Error calling auth endpoint: ${err}`), null);
            }
          },
        };
      };
      authorizerSetRef.current = true;
    }

    // 2. Subscribe to Presence Channel
    console.log("📡 Subscribing to presence-global...");
    const channel = pusherClient.subscribe('presence-global');
    channelRef.current = channel;

    // 3. Event Handlers
    const handleSubscriptionSucceeded = (members: Members) => {
      console.log("✅ Connected to Presence. Total members:", members.count);
      
      const initialMembers = new Set<string>();
      members.each((member: any) => {
        initialMembers.add(member.id);
        console.log("👤 Initial member:", member.info?.username || member.id);
      });
      
      setOnlineUserIds(initialMembers);
      setIsConnected(true);
    };

    const handleSubscriptionError = (status: any) => {
      console.error("❌ Pusher Subscription Failed:", status);
      setIsConnected(false);
    };

    const handleMemberAdded = (member: any) => {
      console.log("🟢 User came online:", member.info?.username || member.id);
      setOnlineUserIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(member.id);
        return newSet;
      });
    };

    const handleMemberRemoved = (member: any) => {
      console.log("🔴 User went offline:", member.info?.username || member.id);
      setOnlineUserIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(member.id);
        return newSet;
      });
    };

    // 4. Bind Events
    channel.bind('pusher:subscription_succeeded', handleSubscriptionSucceeded);
    channel.bind('pusher:subscription_error', handleSubscriptionError);
    channel.bind('pusher:member_added', handleMemberAdded);
    channel.bind('pusher:member_removed', handleMemberRemoved);

    // 5. Cleanup on Unmount
    return () => {
      console.log("🧹 Cleaning up Presence connection");
      
      if (channelRef.current) {
        channelRef.current.unbind('pusher:subscription_succeeded', handleSubscriptionSucceeded);
        channelRef.current.unbind('pusher:subscription_error', handleSubscriptionError);
        channelRef.current.unbind('pusher:member_added', handleMemberAdded);
        channelRef.current.unbind('pusher:member_removed', handleMemberRemoved);
      }
      
      pusherClient.unsubscribe('presence-global');
      setIsConnected(false);
      setOnlineUserIds(new Set());
    };
  }, [currentUser?.id, currentUser?.username]);

  return (
    <PresenceContext.Provider value={{ onlineUserIds, isConnected }}>
      {children}
    </PresenceContext.Provider>
  );
}