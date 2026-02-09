import { NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    console.log("🧪 Sending test event to Pusher...");
    
    await pusherServer.trigger('test-channel', 'test-event', {
      message: body.message || 'Test message',
      timestamp: new Date().toISOString(),
    });
    
    console.log("✅ Test event sent successfully!");
    
    return NextResponse.json({ 
      success: true, 
      message: 'Event sent to test-channel' 
    });
    
  } catch (error) {
    console.error("❌ Test event error:", error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}