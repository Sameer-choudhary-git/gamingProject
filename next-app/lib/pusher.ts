import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

// Validate environment variables
if (!process.env.PUSHER_APP_ID || !process.env.NEXT_PUBLIC_PUSHER_KEY || 
    !process.env.PUSHER_SECRET || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
  console.error("❌ Missing Pusher environment variables!");
}

export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    authEndpoint: '/api/pusher/auth',
    // Enable detailed logging in development
    ...(process.env.NODE_ENV === 'development' && {
      enabledTransports: ['ws', 'wss'],
      logToConsole: true,
    })
  }
);

// Log on server startup (only in development)
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  console.log("🔧 Pusher Server initialized:", {
    appId: process.env.PUSHER_APP_ID,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  });
}

// Log when client is created (browser only)
if (typeof window !== 'undefined') {
  console.log("🌐 Pusher Client initialized:", {
    key: process.env.NEXT_PUBLIC_PUSHER_KEY,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  });
  
  // Enable Pusher logging globally
  (window as any).Pusher = PusherClient;
  PusherClient.logToConsole = true;
}