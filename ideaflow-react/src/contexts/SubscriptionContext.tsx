import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { resolveApiBasePath } from '../utils/apiBase';

interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  sessionsPerMonth: number;
  maxParticipants: number;
  features: string[];
}

interface Subscription {
  tier: string;
  sessionsUsed: number;
  upgradeDate?: string;
  isActive: boolean;
  maxSessions?: number;
  maxParticipants?: number;
  canCreateSession?: boolean;
}

interface SubscriptionContextType {
  subscription: Subscription;
  subscriptionTiers: SubscriptionTier[];
  upgradeTo: (tierId: string) => Promise<boolean>;
  canCreateSession: () => boolean;
  canAddParticipants: (currentCount: number) => boolean;
  getRemainingSessionCount: () => number;
  refreshSubscription: () => void;
}

const subscriptionTiers: SubscriptionTier[] = [
  {
    id: 'free',
    name: 'Free Trial',
    price: 0,
    sessionsPerMonth: 1,
    maxParticipants: 5,
    features: [
      '1 Session/Month',
      '5 Max Participants/Session',
      'Basic ideation workflow',
      'Try before you buy'
    ]
  },
  {
    id: 'basic',
    name: 'Basic Plan',
    price: 10,
    sessionsPerMonth: 4,
    maxParticipants: 10,
    features: [
      '4 Sessions/Month',
      '10 Max Participants/Session',
      'Basic ideation workflow',
      'Standard templates',
      'AI-powered analysis'
    ]
  },
  {
    id: 'pro',
    name: 'Unlimited Plan',
    price: 14.99,
    sessionsPerMonth: 999999, // Unlimited
    maxParticipants: 999999, // Unlimited
    features: [
      'Unlimited Sessions',
      'Unlimited Participants',
      'AI-powered analysis',
      'Advanced templates',
      'Export results',
      'Priority support'
    ]
  }
];

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription>({
    tier: 'basic',
    sessionsUsed: 0,
    isActive: true,
    maxSessions: 4,
    maxParticipants: 10,
    canCreateSession: true
  });

  useEffect(() => {
    if (user) {
      // Load subscription data from API
      fetchSubscriptionStatus();
    }
  }, [user]);

  const fetchSubscriptionStatus = async () => {
    try {
      const apiBase = resolveApiBasePath();
      const token = localStorage.getItem('ideaflow_access_token');
      const response = await fetch(`${apiBase}/subscription/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-User-ID': user?.id || ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Subscription data received:', data);
        setSubscription({
          tier: data.subscription.tier,
          sessionsUsed: data.subscription.sessions_used_this_month,
          isActive: data.subscription.status === 'active',
          maxSessions: data.subscription.max_sessions_per_month,
          maxParticipants: data.subscription.max_participants_per_session,
          canCreateSession: data.subscription.can_create_session
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch subscription status:', response.status, errorData);
      }
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
    }
  };

  // Expose refresh function for manual updates
  const refreshSubscription = async () => {
    if (user) {
      await fetchSubscriptionStatus();
    }
  };

  const upgradeTo = async (tierId: string): Promise<boolean> => {
    try {
      // This will be implemented in Phase 2 with Stripe integration
      console.log(`Upgrade to ${tierId} - Stripe integration coming in Phase 2`);
      return false;
    } catch (error) {
      console.error('Upgrade error:', error);
      return false;
    }
  };

  const canCreateSession = (): boolean => {
    return subscription.canCreateSession ?? true;
  };

  const canAddParticipants = (currentCount: number): boolean => {
    const maxParticipants = subscription.maxParticipants ?? 10;
    return currentCount < maxParticipants;
  };

  const getRemainingSessionCount = (): number => {
    const maxSessions = subscription.maxSessions ?? 4;
    return Math.max(0, maxSessions - subscription.sessionsUsed);
  };

  const value: SubscriptionContextType = {
    subscription,
    subscriptionTiers,
    upgradeTo,
    canCreateSession,
    canAddParticipants,
    getRemainingSessionCount,
    refreshSubscription
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};