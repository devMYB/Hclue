export interface User {
  id: string;
  username: string;
  displayName: string;
  role: 'facilitator' | 'participant';
  email?: string;
}

export interface FacilitatorCredentials {
  username: string;
  password: string;
  displayName: string;
  email: string;
}

// Hardcoded facilitator accounts
const FACILITATORS: FacilitatorCredentials[] = [
  {
    username: 'facilitator',
    password: 'admin123',
    displayName: 'Main Facilitator',
    email: 'facilitator@ideaflow.com'
  },
  {
    username: 'facilitator2',
    password: 'admin456',
    displayName: 'Secondary Facilitator',
    email: 'facilitator2@ideaflow.com'
  },
  {
    username: 'teamlead',
    password: 'lead789',
    displayName: 'Team Lead',
    email: 'teamlead@ideaflow.com'
  }
];

import { resolveApiBasePath } from '../utils/apiBase';

export class RBACService {
  private static instance: RBACService;
  private participants: Map<string, User> = new Map();
  private baseUrl = resolveApiBasePath();

  static getInstance(): RBACService {
    if (!RBACService.instance) {
      RBACService.instance = new RBACService();
    }
    return RBACService.instance;
  }

  private async fetchApi(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Authenticate user with database backend - determine role based on account type
  async authenticateFacilitator(username: string, password: string): Promise<User | null> {
    try {
      const response = await this.fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      // Check if this user is a known facilitator account
      const isFacilitator = this.isKnownFacilitator(response.username, response.id);
      
      if (!isFacilitator) {
        return null; // Not a facilitator
      }

      return {
        id: response.id,
        username: response.username,
        displayName: response.display_name,
        role: 'facilitator',
      };
    } catch (error) {
      console.error('Authentication failed:', error);
      return null;
    }
  }

  // Register a new participant
  async registerParticipant(username: string, password: string, displayName: string, email?: string, role: 'participant' | 'facilitator' = 'participant'): Promise<User | null> {
    try {
      const response = await this.fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ 
          username, 
          password, 
          display_name: displayName,
          role
        }),
      });

      return {
        id: response.id,
        username: response.username,
        displayName: response.display_name,
        role: role,
        email
      };
    } catch (error) {
      console.error('Registration failed:', error);
      return null;
    }
  }

  // Authenticate participant
  async authenticateParticipant(username: string, password: string): Promise<User | null> {
    try {
      const response = await this.fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      return {
        id: response.id,
        username: response.username,
        displayName: response.display_name,
        role: 'participant',
      };
    } catch (error) {
      console.error('Authentication failed:', error);
      return null;
    }
  }

  // Check if user is a known facilitator account
  isKnownFacilitator(username: string, userId: string): boolean {
    // Check hardcoded facilitator usernames
    const facilitatorUsernames = ['facilitator', 'facilitator2', 'teamlead', 'admin'];
    if (facilitatorUsernames.includes(username.toLowerCase())) {
      return true;
    }
    
    // Check specific facilitator user IDs (admin account we created)
    const facilitatorIds = ['80c96a23-01d2-404d-822c-5a44ef1214af'];
    if (facilitatorIds.includes(userId)) {
      return true;
    }
    
    return false;
  }

  // Check if user is facilitator
  isFacilitator(user: User): boolean {
    return user.role === 'facilitator';
  }

  // Check if user can create sessions
  canCreateSessions(user: User): boolean {
    return this.isFacilitator(user);
  }

  // Get all facilitators (for admin purposes)
  getFacilitators(): FacilitatorCredentials[] {
    return FACILITATORS;
  }

  // Get all participants (for admin purposes)
  getParticipants(): User[] {
    return Array.from(this.participants.values());
  }
}

export const rbacService = RBACService.getInstance();