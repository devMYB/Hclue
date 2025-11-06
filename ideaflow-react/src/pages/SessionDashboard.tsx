import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { apiService, type ApiSession } from '../services/api';
import { rbacService } from '../services/rbac';
import { Plus, Users, Clock, Calendar, ArrowRight, Crown, Trash2, UserPlus, UserMinus } from 'lucide-react';

const SessionDashboard: React.FC = () => {
  const { user, isFacilitator } = useAuth();
  const { subscription, canCreateSession, getRemainingSessionCount } = useSubscription();
  const navigate = useNavigate();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    maxParticipants: 10,
    votes_per_participant: 5,
    max_votes_per_idea: 3
  });
  const [joinSessionId, setJoinSessionId] = useState('');
  const [joinUserName, setJoinUserName] = useState('');
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [stats, setStats] = useState({ totalParticipants: 0, activeSessions: 0 });
  const [participantCounts, setParticipantCounts] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [joinEnabled, setJoinEnabled] = useState<Map<string, boolean>>(new Map());
  const [deletingSession, setDeletingSession] = useState<string | null>(null);

  // Load sessions and set up real-time updates
  useEffect(() => {
    const loadData = async () => {
      if (user?.id) {
        setIsLoading(true);
        try {
          const userSessions = await apiService.getSessions(user.id);
          setSessions(userSessions);
          
          // Load participant counts for each session
          const counts = new Map();
          for (const session of userSessions) {
            const participants = await apiService.getParticipants(session.id);
            counts.set(session.id, participants.filter(p => p.status === 'active').length);
          }
          setParticipantCounts(counts);
          
          // Update stats
          setStats(apiService.getStats());
        } catch (error) {
          console.error('Error loading sessions:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadData();

    // Set up real-time listeners
    const handleStatsUpdate = (newStats: any) => {
      setStats(newStats);
    };

    const handleSessionCreated = (session: ApiSession) => {
      if (session.facilitatorId === user?.id) {
        setSessions(prev => [...prev, session]);
        setParticipantCounts(prev => new Map(prev).set(session.id, 0));
      }
    };

    const handleParticipantJoined = ({ sessionId, participant }: any) => {
      setParticipantCounts(prev => {
        const newCounts = new Map(prev);
        const currentCount = newCounts.get(sessionId) || 0;
        newCounts.set(sessionId, currentCount + 1);
        return newCounts;
      });
    };

    const handleParticipantLeft = ({ sessionId }: any) => {
      setParticipantCounts(prev => {
        const newCounts = new Map(prev);
        const currentCount = newCounts.get(sessionId) || 0;
        newCounts.set(sessionId, Math.max(0, currentCount - 1));
        return newCounts;
      });
    };

    apiService.on('stats-updated', handleStatsUpdate);
    apiService.on('session-created', handleSessionCreated);
    apiService.on('participant-joined', handleParticipantJoined);
    apiService.on('participant-left', handleParticipantLeft);

    return () => {
      apiService.off('stats-updated', handleStatsUpdate);
      apiService.off('session-created', handleSessionCreated);
      apiService.off('participant-joined', handleParticipantJoined);
      apiService.off('participant-left', handleParticipantLeft);
    };
  }, [user?.id]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreateSession()) {
      alert('You have reached your session limit. Please upgrade your plan.');
      navigate('/pricing');
      return;
    }

    if (!isFacilitator) {
      alert('Only facilitators can create sessions.');
      return;
    }

    if (!user?.id) return;

    setIsLoading(true);
    try {
      const session = await apiService.createSession(user.id, {
        title: newSession.title,
        description: newSession.description,
        maxParticipants: newSession.maxParticipants,
        votes_per_participant: newSession.votes_per_participant,
        max_votes_per_idea: newSession.max_votes_per_idea
      });
      
      setShowCreateForm(false);
      setNewSession({ 
        title: '', 
        description: '', 
        maxParticipants: 10,
        votes_per_participant: 5,
        max_votes_per_idea: 3
      });
      
      // Navigate to facilitator dashboard
      navigate(`/facilitator/${session.id}`);
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== JOIN SESSION ATTEMPT ===');
    console.log('User ID:', user?.id);
    console.log('Session ID:', joinSessionId.trim());
    console.log('User Name:', joinUserName.trim());
    
    if (!user?.id) {
      console.log('ERROR: No user ID found');
      return;
    }
    if (!joinSessionId.trim() || !joinUserName.trim()) {
      alert('Please enter both session ID and your name.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Step 1: Checking if session exists...');
      // Check if session exists
      const session = await apiService.getSession(joinSessionId.trim());
      console.log('Session found:', session);
      
      if (!session) {
        console.log('ERROR: Session not found');
        alert('Session not found. Please check the session ID.');
        return;
      }

      console.log('Step 2: Joining session...');
      // Join the session with authenticated user ID
      const participant = await apiService.joinSession(joinSessionId.trim(), joinUserName.trim(), user.id);
      console.log('Participant created:', participant);
      
      setShowCreateForm(false);
      setJoinSessionId('');
      setJoinUserName('');
      
      console.log('Step 3: Navigating to participant view...');
      // Navigate to participant view
      navigate(`/session/${joinSessionId.trim()}`);
    } catch (error) {
      console.error('Error joining session:', error);
      console.error('Error details:', error.message);
      alert(`Failed to join session: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    setDeletingSession(sessionId);
    try {
      await apiService.deleteSession(sessionId);
      
      // Remove session from local state
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setParticipantCounts(prev => {
        const newMap = new Map(prev);
        newMap.delete(sessionId);
        return newMap;
      });
      setJoinEnabled(prev => {
        const newMap = new Map(prev);
        newMap.delete(sessionId);
        return newMap;
      });
      
      alert('Session deleted successfully');
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session. Please try again.');
    } finally {
      setDeletingSession(null);
    }
  };

  const handleToggleJoinEnabled = async (sessionId: string) => {
    const currentStatus = joinEnabled.get(sessionId) ?? true;
    const newStatus = !currentStatus;
    
    try {
      await apiService.setSessionJoinEnabled(sessionId, newStatus);
      
      // Update local state
      setJoinEnabled(prev => new Map(prev).set(sessionId, newStatus));
      
      alert(`Participant joining ${newStatus ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('Error toggling join status:', error);
      alert('Failed to update join status. Please try again.');
    }
  };

  const getPhaseText = (phase: number) => {
    const phases = [
      'Setup', 'Generate Ideas', 'Review', 'Vote', 'Analyze', 'Action Planning'
    ];
    return phases[phase - 1] || 'Setup';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const remainingSessions = getRemainingSessionCount();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.displayName}
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your ideation sessions and track progress
          </p>
        </div>

        <div className="text-right">
          <div className="flex items-center space-x-2 mb-2">
            {subscription.tier !== 'free' && (
              <span className="flex items-center space-x-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm">
                <Crown className="w-4 h-4" />
                <span>{subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}</span>
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {remainingSessions === Infinity 
              ? 'Unlimited sessions remaining'
              : `${remainingSessions} session${remainingSessions !== 1 ? 's' : ''} remaining this month`
            }
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={`grid gap-6 ${isFacilitator ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {/* Only show session creation for facilitators */}
        {isFacilitator && (
          <button
            onClick={() => setShowCreateForm(true)}
            disabled={!canCreateSession()}
            className={`card text-left p-6 transition-all ${
              canCreateSession()
                ? 'hover:shadow-lg border-dashed border-2 border-primary-300 hover:border-primary-500' 
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Plus className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">New Session</h3>
                <p className="text-sm text-gray-600">Start a new ideation session</p>
              </div>
            </div>
          </button>
        )}

        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Total Participants</h3>
              <p className="text-2xl font-bold text-blue-600">
                {stats.totalParticipants}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Active Sessions</h3>
              <p className="text-2xl font-bold text-green-600">
                {stats.activeSessions}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Join Session Interface for Participants */}
      {!isFacilitator && (
        <div className="card">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Join Session</h2>
            <form onSubmit={handleJoinSession} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session ID
                </label>
                <input
                  type="text"
                  value={joinSessionId}
                  onChange={(e) => setJoinSessionId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter session ID"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={joinUserName}
                  onChange={(e) => setJoinUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter your name"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {isLoading ? 'Joining...' : 'Join Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Session Form - Only for Facilitators */}
      {showCreateForm && isFacilitator && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {isFacilitator ? 'Create New Session' : 'Join Session'}
          </h2>
          
          {isFacilitator ? (
            <form onSubmit={handleCreateSession} className="space-y-6">
              <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Session Title
              </label>
              <input
                type="text"
                id="title"
                className="input"
                placeholder="e.g., Product Roadmap Planning"
                value={newSession.title}
                onChange={(e) => setNewSession({...newSession, title: e.target.value})}
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                className="input"
                rows={3}
                placeholder="Describe the session goals and context..."
                value={newSession.description}
                onChange={(e) => setNewSession({...newSession, description: e.target.value})}
                required
              />
            </div>

            <div>
              <label htmlFor="maxParticipants" className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Participants
              </label>
              <input
                type="number"
                id="maxParticipants"
                className="input"
                min="2"
                max={subscription.maxParticipants || 5}
                value={newSession.maxParticipants}
                onChange={(e) => setNewSession({...newSession, maxParticipants: parseInt(e.target.value) || 10})}
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Your plan allows up to {subscription.maxParticipants || 5} participants
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="votesPerParticipant" className="block text-sm font-medium text-gray-700 mb-1">
                  Votes per Participant
                </label>
                <input
                  type="number"
                  id="votesPerParticipant"
                  className="input"
                  min="1"
                  max="20"
                  value={newSession.votes_per_participant}
                  onChange={(e) => setNewSession({...newSession, votes_per_participant: parseInt(e.target.value) || 5})}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  How many votes each participant can cast
                </p>
              </div>

              <div>
                <label htmlFor="maxVotesPerIdea" className="block text-sm font-medium text-gray-700 mb-1">
                  Max Votes per Idea
                </label>
                <input
                  type="number"
                  id="maxVotesPerIdea"
                  className="input"
                  min="1"
                  max="10"
                  value={newSession.max_votes_per_idea}
                  onChange={(e) => setNewSession({...newSession, max_votes_per_idea: parseInt(e.target.value) || 3})}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Maximum votes one idea can receive
                </p>
              </div>
            </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Create Session
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleJoinSession} className="space-y-6">
              <div>
                <label htmlFor="sessionId" className="block text-sm font-medium text-gray-700 mb-1">
                  Session ID
                </label>
                <input
                  type="text"
                  id="sessionId"
                  className="input"
                  placeholder="Enter session ID"
                  value={joinSessionId}
                  onChange={(e) => setJoinSessionId(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  id="userName"
                  className="input"
                  placeholder="Enter your display name"
                  value={joinUserName}
                  onChange={(e) => setJoinUserName(e.target.value)}
                  required
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Join Session
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Sessions List */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Your Sessions</h2>
          {!canCreateSession() && (
            <button
              onClick={() => navigate('/manage-subscription')}
              className="text-primary-600 hover:text-primary-500 text-sm font-medium"
            >
              Upgrade for more sessions →
            </button>
          )}
        </div>

        <div className="grid gap-6">
          {sessions.map((session) => (
            <div key={session.id} className="card">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {session.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{session.description}</p>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>Phase {session.phase}: {getPhaseText(session.phase)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{participantCounts.get(session.id) || 0}/{session.maxParticipants} participants</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Created {new Date(session.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      const route = user?.username === 'facilitator' 
                        ? `/facilitator/${session.id}` 
                        : `/session/${session.id}`;
                      navigate(route);
                    }}
                    className="btn-primary flex items-center space-x-1"
                  >
                    <span>{session.status === 'active' ? 'Continue' : 'View'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  
                  {isFacilitator && (
                    <>
                      <button
                        onClick={() => handleToggleJoinEnabled(session.id)}
                        className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1 ${
                          joinEnabled.get(session.id) !== false
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                        title={joinEnabled.get(session.id) !== false ? 'Disable participant joining' : 'Enable participant joining'}
                      >
                        {joinEnabled.get(session.id) !== false ? (
                          <UserMinus className="w-4 h-4" />
                        ) : (
                          <UserPlus className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">
                          {joinEnabled.get(session.id) !== false ? 'Stop Joining' : 'Allow Joining'}
                        </span>
                      </button>
                      
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        disabled={deletingSession === session.id}
                        className="px-3 py-2 rounded-md text-sm font-medium bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50 flex items-center space-x-1"
                        title="Delete session"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">
                          {deletingSession === session.id ? 'Deleting...' : 'Delete'}
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {sessions.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions yet</h3>
              <p className="text-gray-600 mb-4">Create your first ideation session to get started</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-primary"
                disabled={!canCreateSession()}
              >
                Create Your First Session
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionDashboard;