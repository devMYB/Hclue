interface ApiSession {
  id: string;
  title: string;
  description: string;
  facilitatorId: string;
  createdAt: string;
  phase: number;
  maxParticipants: number;
  status: 'active' | 'completed' | 'paused';
  votes_per_participant?: number;
  max_votes_per_idea?: number;
  currentRound?: number;
}

interface ApiParticipant {
  id: string;
  name: string;
  sessionId: string;
  userId: string;
  joinedAt: string;
  status: 'active' | 'disconnected';
  ideas?: number;
  votes_cast?: number;
}

interface CreateSessionRequest {
  title: string;
  description: string;
  maxParticipants: number;
  votes_per_participant?: number;
  max_votes_per_idea?: number;
}

interface ApiIdea {
  id: string;
  content: string;
  sessionId: string;
  authorId: string;
  authorName?: string;
  createdAt: string;
  votes?: number;
  roundNumber?: number;
}

class ApiService {
  private baseUrl: string;
  private eventListeners: Map<string, ((data: any) => void)[]> = new Map();

  constructor() {
    // Use environment variable or fallback to local development
    const isNgrok = window.location.hostname.includes('ngrok');
    const isHttps = window.location.protocol === 'https:';
    
    let API_BASE_URL;
    if (isNgrok || isHttps) {
      // For ngrok or HTTPS, use relative URL (Vite proxy will handle it)
      API_BASE_URL = '';
    } else {
      // For local development, use network IP
      API_BASE_URL = 'http://90.0.0.3:8000';
    }
    
    this.baseUrl = `${API_BASE_URL}/api`;
    console.log('API: Connected to backend at', this.baseUrl);
  }

  private async fetchApi(endpoint: string, options: RequestInit = {}): Promise<any> {
    // Get JWT token from localStorage
    const token = localStorage.getItem('ideaflow_access_token');
    
    const url = `${this.baseUrl}${endpoint}`;
    console.log('[API] Making request to:', url, 'Method:', options.method || 'GET');
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        console.error('[API] Request failed:', response.status, error);
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('[API] Fetch error:', error, 'URL:', url);
      // Check if it's a connection error
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to server. Please check if the backend is running.');
      }
      throw error;
    }
  }

  async createSession(userId: string, data: CreateSessionRequest): Promise<ApiSession> {
    console.log('API: Creating session with database backend');
    const response = await this.fetchApi('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        facilitator_id: userId,
        title: data.title,
        description: data.description,
        votes_per_participant: data.votes_per_participant,
        max_votes_per_idea: data.max_votes_per_idea,
        max_participants: data.maxParticipants,
      }),
    });

    const session: ApiSession = {
      id: response.id,
      title: response.title,
      description: response.description,
      facilitatorId: response.facilitator_id,
      createdAt: response.created_at,
      phase: response.phase || 1,
      maxParticipants: response.max_participants,
      status: response.status,
    };

    this.emit('session-created', session);
    this.emit('stats-updated', this.getStats());
    return session;
  }

  async getSessions(userId: string): Promise<ApiSession[]> {
    try {
      const sessions = await this.fetchApi(`/facilitators/${userId}/sessions`);
      return sessions.map((session: any) => ({
        id: session.id,
        title: session.title,
        description: session.description,
        facilitatorId: userId,
        createdAt: session.created_at,
        phase: session.phase,
        maxParticipants: session.max_participants || 10,
        status: 'active'
      }));
    } catch (error) {
      console.error('Error loading sessions:', error);
      return [];
    }
  }

  async getSession(sessionId: string): Promise<ApiSession | null> {
    console.log('API: Getting session for ID:', sessionId);
    try {
      const response = await this.fetchApi(`/sessions/${sessionId}`);
      const session: ApiSession = {
        id: response.id,
        title: response.name || response.title,
        description: response.question || response.description,
        facilitatorId: response.facilitator_id,
        createdAt: response.created_at,
        phase: response.current_phase || response.phase,
        maxParticipants: response.max_participants,
        status: response.status,
        votes_per_participant: response.votes_per_participant,
        max_votes_per_idea: response.max_votes_per_idea,
      };
      console.log('API: Session found in database:', session);
      return session;
    } catch (error) {
      console.log('API: Session not found:', error);
      return null;
    }
  }

  async getParticipants(sessionId: string): Promise<ApiParticipant[]> {
    try {
      const response = await this.fetchApi(`/sessions/${sessionId}/participants`);
      const participants = response.participants || response;
      return participants.map((p: any) => ({
        id: p.id,
        name: p.name,
        sessionId: p.session_id,
        userId: p.user_id,
        joinedAt: p.joined_at,
        status: p.status || 'active'
      }));
    } catch (error) {
      console.error('API: Error getting participants:', error);
      return [];
    }
  }

  async joinSession(sessionId: string, userName: string, userId?: string): Promise<ApiParticipant> {
    console.log('API: joinSession called with:', { sessionId, userName, userId });
    
    try {
      const response = await this.fetchApi(`/sessions/${sessionId}/participants`, {
        method: 'POST',
        body: JSON.stringify({
          user_name: userName,
          user_id: userId || crypto.randomUUID(),
        }),
      });

      const participant: ApiParticipant = {
        id: response.id,
        name: response.name,
        sessionId: response.session_id,
        userId: response.user_id,
        joinedAt: response.joined_at,
        status: response.status,
      };

      console.log('API: Successfully joined session:', participant);
      this.emit('participant-joined', { sessionId, participant });
      this.emit('stats-updated', this.getStats());
      
      return participant;
    } catch (error) {
      console.error('API: Error joining session:', error);
      throw error;
    }
  }

  async leaveSession(sessionId: string, participantId: string): Promise<void> {
    // In database backend, participant leaving would be handled by API endpoint
    // For now, just emit the event
    this.emit('participant-left', { sessionId, participantId });
    this.emit('stats-updated', this.getStats());
  }

  async updateSessionPhase(sessionId: string, phase: number): Promise<void> {
    try {
      await this.fetchApi(`/sessions/${sessionId}/phase`, {
        method: 'PUT',
        body: JSON.stringify({ phase })
      });
      this.emit('phase-changed', { sessionId, phase });
    } catch (error) {
      console.error('Error updating session phase:', error);
      throw error;
    }
  }

  async updateVotingSettings(sessionId: string, settings: { max_votes_per_idea?: number; votes_per_participant?: number }): Promise<void> {
    await this.fetchApi(`/sessions/${sessionId}/voting-settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async getTimerStatus(sessionId: string): Promise<{ remaining: number; is_running: boolean; duration: number; started_at?: string }> {
    try {
      const response = await this.fetchApi(`/sessions/${sessionId}/timer-status`);
      console.log('[API] Timer status response:', response);
      return response;
    } catch (error) {
      console.error('[API] Error getting timer status:', error);
      return { remaining: 0, is_running: false, duration: 300 };
    }
  }

  async submitVote(sessionId: string, ideaId: string, voterId: string, voterName: string, voteCount?: number): Promise<any> {
    try {
      const response = await this.fetchApi(`/sessions/${sessionId}/votes`, {
        method: 'POST',
        body: JSON.stringify({
          idea_id: ideaId,
          voter_id: voterId,
          voter_name: voterName,
          votes: voteCount || 1
        })
      });
      return response;
    } catch (error) {
      console.error('Error submitting vote:', error);
      throw error;
    }
  }

  async getVotes(sessionId: string, userId?: string): Promise<any[]> {
    try {
      const endpoint = userId 
        ? `/sessions/${sessionId}/votes?voter_id=${userId}`
        : `/sessions/${sessionId}/votes`;
      const response = await this.fetchApi(endpoint);
      return response;
    } catch (error) {
      console.error('Error getting votes:', error);
      throw error;
    }
  }

  async getUserVotes(sessionId: string, userId: string): Promise<any[]> {
    try {
      const response = await this.fetchApi(`/sessions/${sessionId}/votes?voter_id=${userId}`);
      return response;
    } catch (error) {
      console.error('Error getting user votes:', error);
      return [];
    }
  }

  async sendSelectedIdeasAsPrompts(sessionId: string, selectedIdeaIds: string[]): Promise<any> {
    try {
      const response = await this.fetchApi(`/sessions/${sessionId}/iterative-prompt`, {
        method: 'POST',
        body: JSON.stringify({
          selected_idea_ids: selectedIdeaIds
        })
      });
      return response;
    } catch (error) {
      console.error('Error sending selected ideas as prompts:', error);
      throw error;
    }
  }

  async getIterativePrompts(sessionId: string): Promise<any> {
    try {
      const response = await this.fetchApi(`/sessions/${sessionId}/iterative-prompt`);
      return response;
    } catch (error) {
      console.error('Error getting iterative prompts:', error);
      return { prompts: [], round_number: 1 };
    }
  }

  async generateThemes(sessionId: string): Promise<any> {
    try {
      const response = await this.fetchApi(`/sessions/${sessionId}/themes`, {
        method: 'POST'
      });
      return response;
    } catch (error) {
      console.error('Error generating themes:', error);
      throw error;
    }
  }

  async getThemes(sessionId: string): Promise<any> {
    try {
      const response = await this.fetchApi(`/sessions/${sessionId}/themes`);
      return response;
    } catch (error) {
      console.error('Error getting themes:', error);
      throw error;
    }
  }

  async generateFlowchart(sessionId: string): Promise<any> {
    try {
      const response = await this.fetchApi(`/sessions/${sessionId}/flowchart`, {
        method: 'POST'
      });
      return response;
    } catch (error) {
      console.error('Error generating flowchart:', error);
      throw error;
    }
  }

  // Event system for real-time updates
  on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }

  async submitIdea(sessionId: string, content: string, authorId: string, authorName: string): Promise<ApiIdea> {
    const response = await this.fetchApi(`/sessions/${sessionId}/ideas`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        author_id: authorId,
        author_name: authorName
      }),
    });

    const idea: ApiIdea = {
      id: response.id,
      content: response.content,
      sessionId: response.session_id,
      authorId: response.author_id,
      authorName: response.author_name,
      createdAt: response.created_at,
    };

    this.emit('idea-submitted', { sessionId, idea });
    return idea;
  }

  async getIdeas(sessionId: string, includeAuthor: boolean = false): Promise<ApiIdea[]> {
    const response = await this.fetchApi(`/sessions/${sessionId}/ideas?include_author=${includeAuthor}`);
    return response.map((idea: any) => ({
      id: idea.id,
      content: idea.content,
      sessionId: idea.sessionId || sessionId, // Backend sends sessionId, not session_id
      authorId: idea.authorId || idea.author_id, // Backend sends authorId
      authorName: idea.authorName || idea.author_name, // Backend sends authorName
      createdAt: idea.createdAt || idea.created_at, // Backend sends createdAt
      votes: idea.votes || 0
    }));
  }

  // Stats methods
  getStats() {
    // Since we're using database backend, return basic stats
    // In future, these could be fetched from API endpoints
    return {
      totalParticipants: 0,
      activeSessions: 0
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    return this.fetchApi(`/sessions/${sessionId}/delete`, {
      method: 'DELETE'
    });
  }

  async setSessionJoinEnabled(sessionId: string, joinEnabled: boolean): Promise<void> {
    return this.fetchApi(`/sessions/${sessionId}/join-control`, {
      method: 'POST',
      body: JSON.stringify({ join_enabled: joinEnabled })
    });
  }
}

export const apiService = new ApiService();
export type { ApiSession, ApiParticipant, CreateSessionRequest, ApiIdea };