import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { rbacService, type User } from '../services/rbac';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string, displayName: string, role: 'participant' | 'facilitator') => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  isFacilitator: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('ideaflow_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('ideaflow_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
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
      
      const apiUrl = `${API_BASE_URL}/api`;
      console.log('AUTH: Using API URL:', apiUrl);
      
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        return false;
      }

      const userData = await response.json();
      
      // Store JWT tokens
      localStorage.setItem('ideaflow_access_token', userData.access_token);
      localStorage.setItem('ideaflow_refresh_token', userData.refresh_token);

      const user: User = {
        id: userData.user.id,
        username: userData.user.username,
        displayName: userData.user.display_name,
        role: userData.user.role as 'facilitator' | 'participant'
      };

      setUser(user);
      localStorage.setItem('ideaflow_user', JSON.stringify(user));
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (username: string, password: string, displayName: string, role: 'participant' | 'facilitator' = 'participant'): Promise<boolean> => {
    try {
      const newUser = await rbacService.registerParticipant(username, password, displayName, `${username}@example.com`, role);
      if (newUser) {
        setUser(newUser);
        localStorage.setItem('ideaflow_user', JSON.stringify(newUser));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ideaflow_user');
    localStorage.removeItem('ideaflow_access_token');
    localStorage.removeItem('ideaflow_refresh_token');
    localStorage.removeItem('ideaflow_subscription');
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isLoading,
    isFacilitator: user?.role === 'facilitator'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};