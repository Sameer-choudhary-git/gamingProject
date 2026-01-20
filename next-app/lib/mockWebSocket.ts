// Mock WebSocket for simulating real-time multiplayer
type MessageHandler = (data: any) => void;
type EventType = 'game_update' | 'player_joined' | 'player_left' | 'chat_message' | 'ready_status' | 'game_start' | 'game_end';

interface MockWebSocketMessage {
  type: EventType;
  payload: any;
}

class MockWebSocket {
  private handlers: Map<EventType, MessageHandler[]> = new Map();
  private connected: boolean = false;
  private roomId: string | null = null;

  connect(roomId: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.connected = true;
        this.roomId = roomId;
        console.log(`[MockWS] Connected to room: ${roomId}`);
        resolve();
      }, 100);
    });
  }

  disconnect(): void {
    this.connected = false;
    this.roomId = null;
    this.handlers.clear();
    console.log('[MockWS] Disconnected');
  }

  on(event: EventType, handler: MessageHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  off(event: EventType, handler: MessageHandler): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event: EventType, payload: any): void {
    if (!this.connected) {
      console.warn('[MockWS] Not connected');
      return;
    }

    console.log(`[MockWS] Emitting ${event}:`, payload);
    
    // Simulate network delay
    setTimeout(() => {
      // Echo back to self (simulate server broadcast)
      this.receive({ type: event, payload });
    }, 50);
  }

  private receive(message: MockWebSocketMessage): void {
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => handler(message.payload));
    }
  }

  // Simulate receiving a message from another player
  simulateOpponent(event: EventType, payload: any, delay: number = 500): void {
    setTimeout(() => {
      this.receive({ type: event, payload });
    }, delay);
  }

  isConnected(): boolean {
    return this.connected;
  }

  getRoomId(): string | null {
    return this.roomId;
  }
}

// Singleton instance
export const mockWebSocket = new MockWebSocket();

// Helper hook for using websocket in components
export const useWebSocket = () => {
  return {
    connect: (roomId: string) => mockWebSocket.connect(roomId),
    disconnect: () => mockWebSocket.disconnect(),
    on: (event: EventType, handler: MessageHandler) => mockWebSocket.on(event, handler),
    off: (event: EventType, handler: MessageHandler) => mockWebSocket.off(event, handler),
    emit: (event: EventType, payload: any) => mockWebSocket.emit(event, payload),
    simulateOpponent: (event: EventType, payload: any, delay?: number) => 
      mockWebSocket.simulateOpponent(event, payload, delay),
    isConnected: () => mockWebSocket.isConnected(),
  };
};
