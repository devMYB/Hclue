import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private sessionId: string | null = null;

  connect(apiUrl: string): Socket {
    if (!this.socket) {
      this.socket = io(apiUrl, {
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        // Join session room if we have a session ID
        if (this.sessionId) {
          this.joinSession(this.sessionId);
        }
      });

      this.socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
      });
    }
    return this.socket;
  }

  joinSession(sessionId: string) {
    this.sessionId = sessionId;
    if (this.socket?.connected) {
      this.socket.emit('join_session', { session_id: sessionId });
    }
  }

  leaveSession() {
    if (this.socket?.connected && this.sessionId) {
      this.socket.emit('leave_session', { session_id: this.sessionId });
    }
    this.sessionId = null;
  }

  onParticipantJoined(callback: (data: any) => void) {
    this.socket?.on('participant_joined', callback);
  }

  onIdeaSubmitted(callback: (data: any) => void) {
    this.socket?.on('idea_submitted', callback);
  }

  onVoteSubmitted(callback: (data: any) => void) {
    this.socket?.on('vote_submitted', callback);
  }

  onPhaseUpdated(callback: (data: any) => void) {
    this.socket?.on('phase_updated', callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.sessionId = null;
  }

  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

export const websocketService = new WebSocketService();