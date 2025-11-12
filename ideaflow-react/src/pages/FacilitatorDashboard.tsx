import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService, type ApiSession, type ApiParticipant, type ApiIdea } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { resolveApiBasePath, resolveSocketOrigin } from '../utils/apiBase';
// import { websocketService } from '../services/websocket';
import { Play, Pause, SkipForward, Users, Clock, BarChart3, MessageSquare, Lightbulb, GitBranch } from 'lucide-react';
import IdeaFlowChart from '../components/IdeaFlowChart';
import { io, Socket } from 'socket.io-client';

const FacilitatorDashboard: React.FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState<ApiSession | null>(null);
  const [participants, setParticipants] = useState<ApiParticipant[]>([]);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [submittedIdeas, setSubmittedIdeas] = useState<ApiIdea[]>([]);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
  const [timerInterval, setTimerInterval] = useState<number | null>(null);
  const [voteResults, setVoteResults] = useState<Record<string, number>>({});
  const [votes, setVotes] = useState<any[]>([]);
  const [selectedIdeas, setSelectedIdeas] = useState<Set<string>>(new Set());
  const [themes, setThemes] = useState<any[]>([]);
  const [ideasByTheme, setIdeasByTheme] = useState<Record<string, any[]>>({});
  const [isGeneratingThemes, setIsGeneratingThemes] = useState(false);
  const [flowchartData, setFlowchartData] = useState<any>(null);
  const [showFlowchart, setShowFlowchart] = useState(false);
  const [isGeneratingFlowchart, setIsGeneratingFlowchart] = useState(false);

  const phases = [
    { id: 1, name: 'Setup', description: 'Session configuration and participant joining' },
    { id: 2, name: 'Generate Ideas', description: 'Anonymous idea submission phase' },
    { id: 3, name: 'Review Ideas', description: 'Collaborative idea review and discussion' },
    { id: 4, name: 'Vote on Ideas', description: 'Participants vote on their favorite ideas' },
    { id: 5, name: 'AI Analysis', description: 'AI groups ideas into themes and provides insights' },
    { id: 6, name: 'Action Planning', description: 'Create actionable next steps from top ideas' }
  ];

  // Load session data and set up real-time updates
  useEffect(() => {
    // Validate sessionId - redirect if invalid
    if (!sessionId || sessionId === 'false' || sessionId === 'undefined' || sessionId === 'null') {
      console.error('Invalid session ID:', sessionId);
      navigate('/dashboard');
      return;
    }

    const loadSessionData = async () => {
      if (sessionId) {

        try {
          const sessionData = await apiService.getSession(sessionId);
          if (sessionData) {
            setSession(sessionData);
            setCurrentPhase(sessionData.phase);
          } else {
            // Session not found, redirect to dashboard
            console.error('Session not found');
            navigate('/dashboard');
            return;
          }
          
          const participantData = await apiService.getParticipants(sessionId);
          setParticipants(participantData);
        } catch (error) {
          console.error('Error loading session data:', error);
          navigate('/dashboard');
        }
      }
    };

    loadSessionData();

    // Set up WebSocket for real-time participant updates
    const socketOrigin = resolveSocketOrigin();

    const socket: Socket = io(socketOrigin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    socket.on('connect', () => {
      console.log('[FacilitatorDashboard] WebSocket connected:', socket.id);
      socket.emit('join_session', {
        session_id: sessionId,
        user_id: user?.id,
        is_facilitator: true
      });
      console.log('[FacilitatorDashboard] join_session emitted', {
        session_id: sessionId,
        user_id: user?.id,
        is_facilitator: true
      });
    });
      
      // Listen for new participants joining
      socket.on('participant_joined', (participantData: any) => {
        console.log('Participant joined:', participantData);
        setParticipants(prev => {
          // Check if participant already exists
          if (prev.some(p => p.id === participantData.id)) {
            return prev;
          }
          console.log('[WebSocket] Existing participants before join:', prev);
          const updatedList = [...prev, participantData];
          console.log('[WebSocket] Participant list after join:', updatedList.length);
          return updatedList;
        });

        // Fetch authoritative participant list to avoid drift
        if (sessionId) {
          apiService.getParticipants(sessionId).then(updatedParticipants => {
            console.log('[WebSocket] Refreshed participants after join event:', updatedParticipants.length, updatedParticipants);
            setParticipants(updatedParticipants);
          }).catch(err => console.error('[WebSocket] Error refreshing participants after join:', err));
        }
      });
      
      // Listen for full participant list updates
      socket.on('participants_updated', (data: any) => {
        console.log('[WebSocket] Participants updated broadcast:', data?.participants?.length, data);
        if (data?.participants) {
          setParticipants(data.participants);
        }
      });
      
      // Listen for participants leaving
      socket.on('participant_left', (participantData: any) => {
        console.log('Participant left event received:', participantData);
        setParticipants(prev => {
          const filtered = prev.filter(p => p.id !== participantData.id);
          console.log(`Participant ${participantData.id} removed. Count: ${prev.length} -> ${filtered.length}`);
          return filtered;
        });
        // Force immediate refresh from API to ensure consistency
        if (sessionId) {
          apiService.getParticipants(sessionId).then(updatedParticipants => {
            console.log('Refreshed participants after leave event:', updatedParticipants.length);
            setParticipants(updatedParticipants);
          }).catch(err => console.error('Error refreshing participants:', err));
        }
      });
      
      // Listen for timer_started event (synchronized timer start)
      socket.on('timer_started', (timerData: any) => {
        console.log('Timer started:', timerData);
        const duration = timerData.duration || 300;
        const startedAt = new Date(timerData.started_at).getTime();
        const elapsed = (Date.now() - startedAt) / 1000;
        const remaining = Math.max(0, Math.floor(duration - elapsed));
        setTimeRemaining(remaining);
        setIsTimerRunning(true);
      });

      // Listen for timer_update event (pause/resume/stop)
      socket.on('timer_update', (timerData: any) => {
        console.log('Timer update received:', timerData);
        setTimeRemaining(timerData.remaining || 0);
        setIsTimerRunning(timerData.is_running || false);
      });
      
      // Listen for idea_submitted events (replace polling)
      socket.on('idea_submitted', (ideaData: any) => {
        console.log('[WebSocket] Idea submitted:', ideaData);
        setSubmittedIdeas(prev => {
          // Check if idea already exists
          if (prev.some(i => i.id === ideaData.id)) {
            return prev;
          }
          const newIdeas = [...prev, {
            id: ideaData.id,
            content: ideaData.content,
            sessionId: ideaData.session_id || sessionId || '',
            authorName: ideaData.author_name,
            authorId: ideaData.author_id,
            roundNumber: ideaData.round_number || 1,
            createdAt: ideaData.created_at
          }];
          console.log(`[WebSocket] Ideas updated: ${prev.length} -> ${newIdeas.length}`);
          return newIdeas;
        });
        
        // Update current round if needed
        const roundNumber = ideaData.round_number || 1;
        setSession(prev => {
          if (prev) {
            const currentRound = prev.currentRound || 1;
            const newRound = Math.max(currentRound, roundNumber);
            return { ...prev, currentRound: newRound };
          }
          return prev;
        });
      });
      
      // Listen for vote_updated events (replace polling)
      socket.on('vote_updated', async (voteData: any) => {
        console.log('[WebSocket] Vote updated:', voteData);
        // Fetch updated vote results from API
        try {
          const voteResults = await apiService.getVotes(sessionId!);
          const voteMap: Record<string, number> = {};
          voteResults.forEach((result: any) => {
            voteMap[result.id] = result.total_points || 0;
          });
          setVoteResults(voteMap);
          setVotes(voteResults);
          console.log('[WebSocket] Vote results updated');
        } catch (error) {
          console.error('[WebSocket] Error fetching vote results:', error);
        }
      });
      
      // Listen for themes_generated events (replace polling)
      socket.on('themes_generated', (themesData: any) => {
        console.log('[WebSocket] Themes generated:', themesData);
        setThemes(themesData.themes || []);
        setIdeasByTheme(themesData.ideas_by_theme || {});
        console.log(`[WebSocket] Themes updated: ${themesData.themes?.length || 0} themes`);
      });
      
      // Enhance phase_changed listener to update session data
      socket.on('phase_changed', async (phaseData: any) => {
        console.log('[WebSocket] Phase changed:', phaseData);
        const newPhase = phaseData.phase;
        setCurrentPhase(newPhase);
        
        // Fetch updated session data
        try {
          const sessionData = await apiService.getSession(sessionId!);
          if (sessionData) {
            setSession(sessionData);
            console.log('[WebSocket] Session data updated after phase change');
          }
        } catch (error) {
          console.error('[WebSocket] Error fetching session data:', error);
        }
      });
      
    socket.on('connect_error', (err) => {
      console.error('[FacilitatorDashboard] WebSocket connection error:', err);
    });

    // Cleanup
    return () => {
      socket.emit('leave_session', {
        session_id: sessionId,
        user_id: user?.id
      });
      console.log('[FacilitatorDashboard] leave_session emitted', {
        session_id: sessionId,
        user_id: user?.id
      });
      socket.disconnect();
    };

    // Polling removed - all updates now come via WebSocket events
    // WebSocket listeners handle:
    // - idea_submitted -> updates ideas list
    // - vote_updated -> updates vote results
    // - themes_generated -> updates themes
    // - phase_changed -> updates session phase
    // - participant_joined/left -> updates participants list
    console.log('[FacilitatorDashboard] WebSocket listeners initialized - polling disabled');
  }, [sessionId, navigate, user?.id]);

  // Timer effect
  useEffect(() => {
    if (isTimerRunning && timeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setTimerInterval(interval);
      return () => clearInterval(interval);
    } else if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  }, [isTimerRunning, timeRemaining]);

  const handlePhaseChange = async (newPhase: number) => {
    if (sessionId) {
      try {
        await apiService.updateSessionPhase(sessionId, newPhase);
        setCurrentPhase(newPhase);
        setTimeRemaining(300); // Reset timer
        setIsTimerRunning(false);
      } catch (error) {
        console.error('Error updating phase:', error);
        alert('Failed to update phase. Please try again.');
      }
    }
  };

  const toggleTimer = async () => {
    if (!sessionId) return;
    
    try {
      const token = localStorage.getItem('ideaflow_access_token');
      console.log('[toggleTimer] Token exists:', !!token, 'Token length:', token?.length);
      if (!token) {
        console.error('[toggleTimer] No auth token found in localStorage');
        alert('You are not authenticated. Please log in again.');
        return;
      }

      const apiBase = resolveApiBasePath();
      if (!isTimerRunning) {
        // Start timer - use current timeRemaining if it's been set, otherwise default to 300
        // If timeRemaining is 0 or very low, it might be from a previous timer that expired
        const duration = (timeRemaining > 60) ? timeRemaining : 300;
        const url = `${apiBase}/sessions/${sessionId}/timer`;
        console.log('[toggleTimer] Starting timer, duration:', duration, 'timeRemaining:', timeRemaining, 'URL:', url);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'start',
            duration: duration
          })
        });
        
        console.log('[toggleTimer] Response status:', response.status);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('[toggleTimer] Error response:', errorData);
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('[toggleTimer] Timer started successfully:', result);
        setTimeRemaining(duration);
        setIsTimerRunning(true);
      } else {
        // Pause timer
        const url = `${apiBase}/sessions/${sessionId}/timer`;
        console.log('[toggleTimer] Pausing timer, URL:', url);
        
        const response = await fetch(url, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            remaining: timeRemaining,
            is_running: false
          })
        });
        
        console.log('[toggleTimer] Pause response status:', response.status);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('[toggleTimer] Pause error response:', errorData);
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        setIsTimerRunning(false);
      }
    } catch (error) {
      console.error('[toggleTimer] Error updating timer:', error);
      alert(`Failed to update timer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const resetTimer = async () => {
    if (!sessionId) return;
    
    try {
      const token = localStorage.getItem('ideaflow_access_token');
      if (!token) {
        console.error('No auth token found');
        return;
      }

      await fetch(`/api/sessions/${sessionId}/timer`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          remaining: 0,
          is_running: false
        })
      });
      setIsTimerRunning(false);
      setTimeRemaining(300); // 5 minutes
    } catch (error) {
      console.error('Error resetting timer:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleIdeaSelection = (ideaId: string, selected: boolean) => {
    setSelectedIdeas(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(ideaId);
      } else {
        newSet.delete(ideaId);
      }
      return newSet;
    });
  };

  const handleSendSelectedIdeasAsPrompts = async () => {
    if (!sessionId || !session || selectedIdeas.size === 0) return;
    
    try {
      const selectedIdeaIds = Array.from(selectedIdeas);
      await apiService.sendSelectedIdeasAsPrompts(sessionId, selectedIdeaIds);
      
      // Clear selection
      setSelectedIdeas(new Set());
      
      // Automatically move back to Phase 2 (Generate Ideas) to see real-time submissions
      await apiService.updateSessionPhase(sessionId, 2);
      
      // Reload session data to reflect the updated phase
      const updatedSession = await apiService.getSession(sessionId);
      if (updatedSession) {
        setSession(updatedSession);
        setCurrentPhase(2); // Set to Phase 2 immediately
      }
      
      alert(`New brainstorming round started with ${selectedIdeaIds.length} selected ideas! Session moved to Generate Ideas phase - you can now see real-time submissions.`);
    } catch (error) {
      console.error('Error sending selected ideas as prompts:', error);
      alert('Failed to send selected ideas. Please try again.');
    }
  };

  const handleGenerateThemes = async () => {
    if (submittedIdeas.length === 0) {
      alert('No ideas available for analysis. Ideas must be submitted first.');
      return;
    }
    
    setIsGeneratingThemes(true);
    try {
      const response = await apiService.generateThemes(sessionId!);
      if (response.themes) {
        const themesData = await apiService.getThemes(sessionId!);
        setThemes(themesData.themes || []);
        setIdeasByTheme(themesData.ideas_by_theme || {});
        alert(`Successfully generated ${response.themes.length} themes from ${submittedIdeas.length} ideas!`);
      }
    } catch (error) {
      console.error('Error generating themes:', error);
      alert('Failed to generate themes. Please try again.');
    } finally {
      setIsGeneratingThemes(false);
    }
  };

  const handleGenerateFlowchart = async () => {
    if (!sessionId) return;
    
    console.log('=== GENERATING FLOWCHART ===');
    console.log('Session ID:', sessionId);
    
    setIsGeneratingFlowchart(true);
    try {
      console.log('Calling apiService.generateFlowchart...');
      const response = await apiService.generateFlowchart(sessionId);
      console.log('Flowchart response:', response);
      
      if (response.success && response.flowchart) {
        console.log('Setting flowchart data:', response.flowchart);
        setFlowchartData(response.flowchart);
        setShowFlowchart(true);
        console.log('Flowchart modal should now be visible');
        
        // Scroll to the flowchart modal after a short delay
        setTimeout(() => {
          const modal = document.querySelector('[data-flowchart-modal]');
          if (modal) {
            modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      } else {
        console.error('Invalid response format:', response);
        alert('Invalid response from server. Please try again.');
      }
    } catch (error) {
      console.error('Error generating flowchart:', error);
      alert('Failed to generate flowchart. Please try again.');
    } finally {
      setIsGeneratingFlowchart(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Facilitator Dashboard</h1>
          <p className="text-gray-600 mt-1">Session ID: {sessionId}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary-600">
            Phase {currentPhase}: {phases[currentPhase - 1]?.name}
          </div>
          <p className="text-gray-600">{phases[currentPhase - 1]?.description}</p>
        </div>
      </div>

      {/* Phase Controls */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Phase Controls</h2>
        
        <div className="grid grid-cols-6 gap-2 mb-6">
          {phases.map((phase) => (
            <button
              key={phase.id}
              onClick={() => handlePhaseChange(phase.id)}
              className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                currentPhase === phase.id
                  ? 'bg-primary-600 text-white'
                  : currentPhase > phase.id
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="font-semibold">{phase.id}</div>
              <div className="text-xs">{phase.name}</div>
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-gray-500" />
            <span className="text-lg font-mono">{formatTime(timeRemaining)}</span>
          </div>
          
          <button
            onClick={toggleTimer}
            className={`btn-primary flex items-center space-x-2 ${
              isTimerRunning ? 'bg-red-600 hover:bg-red-700' : ''
            }`}
          >
            {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isTimerRunning ? 'Pause Timer' : 'Start Timer'}</span>
          </button>

          <select
            onChange={(e) => {
              const minutes = parseInt(e.target.value);
              if (minutes > 0) {
                // Just set the duration, don't start the timer yet
                setTimeRemaining(minutes * 60);
                console.log('[Timer Select] Set duration to', minutes, 'minutes (', minutes * 60, 'seconds)');
              }
              // Reset select to default
              e.target.value = '';
            }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            value=""
          >
            <option value="">Set Timer</option>
            <option value="3">3 min</option>
            <option value="5">5 min</option>
            <option value="10">10 min</option>
            <option value="15">15 min</option>
          </select>

          <button
            onClick={resetTimer}
            className="btn-secondary text-sm px-3 py-2"
          >
            Reset
          </button>

          <button
            onClick={() => handlePhaseChange(Math.min(currentPhase + 1, 6))}
            className="btn-secondary flex items-center space-x-2"
            disabled={currentPhase === 6}
          >
            <SkipForward className="w-4 h-4" />
            <span>Next Phase</span>
          </button>
        </div>
      </div>



      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Participants</h3>
              <p className="text-2xl font-bold text-blue-600">{participants.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Ideas Submitted</h3>
              <p className="text-2xl font-bold text-green-600">{submittedIdeas.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Total Votes</h3>
              <p className="text-2xl font-bold text-purple-600">
                {votes.reduce((total: number, vote: any) => total + (vote.total_points || 0), 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Active Users</h3>
              <p className="text-2xl font-bold text-yellow-600">
                {participants.filter(p => p.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Participants */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Participants</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Ideas</th>
                <th className="text-left py-3 px-4">Votes Cast</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((participant) => (
                <tr key={participant.id} className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">{participant.name}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      participant.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {participant.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {participant.ideas || 0}
                  </td>
                  <td className="py-3 px-4">
                    {participant.votes_cast || 0}
                  </td>
                </tr>
              ))}
              {participants.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 px-4 text-center text-gray-500">
                    No participants have joined yet. Share the session ID with participants to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-time Idea Monitoring - Phase 2 */}
      {currentPhase === 2 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <span>Submitted Ideas ({submittedIdeas.length})</span>
            </h2>
            <div className="text-sm text-gray-500">Updates every 2 seconds</div>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {submittedIdeas.map((idea) => (
              <div key={idea.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {idea.authorName || 'Anonymous'}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                      Round {(() => {
                        const displayRound = idea.roundNumber || 1;
                        console.log('Display round for idea (phase 3):', {
                          content: idea.content?.substring(0, 30),
                          ideaRoundNumber: idea.roundNumber,
                          finalDisplay: displayRound
                        });
                        return displayRound;
                      })()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {idea.createdAt ? new Date(idea.createdAt).toLocaleTimeString() : 'Just now'}
                    </span>
                  </div>
                </div>
                <p className="text-gray-800">{idea.content}</p>
              </div>
            ))}
            {submittedIdeas.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>No ideas submitted yet. Participants can submit ideas during this phase.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phase 3: Review Submitted Ideas */}
      {currentPhase === 3 && (
        <div className="card">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Review Submitted Ideas</h2>
            <p className="text-gray-600">Review all ideas submitted by participants. This is a read-only phase to review submissions before moving to voting.</p>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {submittedIdeas.map((idea) => {
              const voteCount = voteResults[idea.id] || 0;
              return (
                <div key={idea.id} className="p-4 border border-gray-200 rounded-lg bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {idea.authorName || 'Anonymous'}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                        Round {(() => {
                          const displayRound = idea.roundNumber || 1;
                          console.log('Display round for idea (phase 3-2):', {
                            content: idea.content?.substring(0, 30),
                            ideaRoundNumber: idea.roundNumber,
                            finalDisplay: displayRound
                          });
                          return displayRound;
                        })()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {idea.createdAt ? new Date(idea.createdAt).toLocaleTimeString() : 'Just now'}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-800">{idea.content}</p>
                  {voteCount > 0 && (
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Votes:</span>
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
                        {voteCount}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
            {submittedIdeas.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>No ideas have been submitted yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phase 4: Voting Interface */}
      {currentPhase === 4 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <span>Voting Results ({submittedIdeas.length} ideas)</span>
            </h2>
            <div className="text-sm text-gray-500">Real-time voting data</div>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {submittedIdeas
              .sort((a, b) => (voteResults[b.id] || 0) - (voteResults[a.id] || 0))
              .map((idea, index) => (
              <div key={idea.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {idea.authorName || 'Anonymous'}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                      Round {(() => {
                        const displayRound = idea.roundNumber || session?.currentRound || 1;
                        console.log('Display round for idea:', {
                          content: idea.content?.substring(0, 30),
                          ideaRoundNumber: idea.roundNumber,
                          sessionCurrentRound: session?.currentRound,
                          finalDisplay: displayRound
                        });
                        return displayRound;
                      })()}
                    </span>
                    <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded">
                      Rank #{index + 1}
                    </span>
                    <span className="text-xs text-gray-500">
                      {idea.createdAt ? new Date(idea.createdAt).toLocaleTimeString() : `Round ${idea.roundNumber || 1}`}
                    </span>
                  </div>
                </div>
                <p className="text-gray-800 mb-2">{idea.content}</p>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-purple-600">
                    Votes: {voteResults[idea.id] || 0}
                  </div>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, ((voteResults[idea.id] || 0) / Math.max(1, Math.max(...Object.values(voteResults)))) * 100)}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
            {submittedIdeas.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>No ideas available for voting.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Analysis Phase - Phase 5 */}
      {currentPhase === 5 && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                <span>AI Theme Analysis</span>
              </h2>
              <button 
                onClick={handleGenerateThemes}
                disabled={isGeneratingThemes || submittedIdeas.length === 0}
                className={`btn-primary ${(isGeneratingThemes || submittedIdeas.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isGeneratingThemes ? 'Generating...' : 'Generate Analysis'}
              </button>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">AI-Powered Theme Clustering</h3>
                  <p className="text-sm text-blue-700">
                    Our AI analyzes all submitted ideas and groups them into meaningful themes using natural language processing. 
                    This helps identify common patterns and prioritize focus areas.
                  </p>
                </div>
              </div>
            </div>

            {themes.length > 0 ? (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  {themes.map((theme, index) => {
                    const themeIdeas = ideasByTheme[theme.id] || [];
                    const colors = [
                      'border-blue-400 bg-blue-50',
                      'border-green-400 bg-green-50', 
                      'border-yellow-400 bg-yellow-50',
                      'border-purple-400 bg-purple-50',
                      'border-red-400 bg-red-50',
                      'border-indigo-400 bg-indigo-50'
                    ];
                    const color = colors[index % colors.length];
                    
                    return (
                      <div key={theme.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-900">{theme.name}</h3>
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                            {theme.idea_count} ideas
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {theme.description}
                        </p>
                        <div className="space-y-2">
                          {themeIdeas.slice(0, 5).map((idea) => (
                            <div key={idea.id} className={`text-sm p-2 rounded border-l-2 ${color}`}>
                              {idea.content.length > 80 ? idea.content.substring(0, 80) + '...' : idea.content}
                              <span className="text-xs text-gray-500 ml-2">({idea.votes} votes)</span>
                            </div>
                          ))}
                          {themeIdeas.length > 5 && (
                            <div className="text-xs text-gray-500 text-center py-1">
                              +{themeIdeas.length - 5} more ideas
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Analysis Summary */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">Analysis Summary</h3>
                      <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded">
                        AI Insights
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 mb-1">Themes Identified:</div>
                        <ul className="list-disc list-inside text-gray-600 space-y-1">
                          {themes.slice(0, 3).map(theme => (
                            <li key={theme.id}>{theme.name} ({theme.idea_count} ideas, {theme.total_votes} votes)</li>
                          ))}
                        </ul>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 mb-1">Top Themes by Votes:</div>
                        <ol className="list-decimal list-inside text-gray-600 space-y-1">
                          {[...themes]
                            .sort((a, b) => b.total_votes - a.total_votes)
                            .slice(0, 3)
                            .map((theme) => (
                              <li key={theme.id}>{theme.name} ({theme.total_votes} votes)</li>
                            ))}
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : submittedIdeas.length > 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">AI Analysis Ready</h3>
                <p className="text-gray-600 mb-4">
                  {submittedIdeas.length} ideas are ready for AI theme analysis.
                </p>
                <button 
                  onClick={handleGenerateThemes}
                  disabled={isGeneratingThemes}
                  className={`btn-primary ${isGeneratingThemes ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isGeneratingThemes ? 'Generating Themes...' : 'Generate AI Themes'}
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Ideas to Analyze</h3>
                <p className="text-gray-600">
                  Ideas need to be submitted before AI analysis can be performed.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Planning Phase - Phase 6 */}
      {currentPhase === 6 && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-green-500" />
                <span>Action Planning & Session Completion</span>
              </h2>
              <div className="flex space-x-3">
                <button 
                  onClick={handleSendSelectedIdeasAsPrompts}
                  disabled={selectedIdeas.size === 0}
                  className={`btn-primary ${selectedIdeas.size === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Start New Round
                </button>
                <button 
                  onClick={handleGenerateFlowchart}
                  disabled={isGeneratingFlowchart || submittedIdeas.length === 0}
                  className={`btn-secondary flex items-center space-x-2 ${(isGeneratingFlowchart || submittedIdeas.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <GitBranch className="w-4 h-4" />
                  <span>{isGeneratingFlowchart ? 'Generating...' : 'Generate Flowchart'}</span>
                </button>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-green-900 mb-1">Complete Your Ideation Journey</h3>
                  <p className="text-sm text-green-700">
                    Create actionable next steps from your top ideas, or continue exploring with iterative brainstorming rounds. 
                    Generate a visual flowchart to see your complete ideation journey from start to finish.
                  </p>
                </div>
              </div>
            </div>

            {submittedIdeas.length > 0 ? (
              <div className="space-y-6">
                {/* Select Ideas for Next Round */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Select Ideas for Deeper Exploration</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Choose the most promising ideas to send back to participants as new brainstorming prompts. 
                    They will explore these ideas in more detail.
                  </p>
                  <div className="space-y-3">
                    {submittedIdeas
                      .sort((a, b) => (voteResults[b.id] || 0) - (voteResults[a.id] || 0))
                      .map((idea, index) => (
                      <div key={idea.id} className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg border-l-4 border-transparent hover:border-blue-400 transition-colors">
                        <div className="flex-shrink-0 pt-1">
                          <input 
                            type="checkbox" 
                            checked={selectedIdeas.has(idea.id)}
                            onChange={(e) => handleIdeaSelection(idea.id, e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-gray-800 font-medium">{idea.content}</p>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {voteResults[idea.id] || 0} votes
                              </span>
                              {index < 3 && (
                                <span className={`text-xs px-2 py-1 rounded ${
                                  index === 0 ? 'bg-yellow-100 text-yellow-800' : 
                                  index === 1 ? 'bg-gray-100 text-gray-800' : 
                                  'bg-orange-100 text-orange-800'
                                }`}>
                                  #{index + 1}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>By: {idea.authorName || 'Anonymous'}</span>
                            <span>•</span>
                            <span>{new Date(idea.createdAt).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Selected: {selectedIdeas.size} ideas
                    </div>
                    <button 
                      onClick={handleSendSelectedIdeasAsPrompts}
                      disabled={selectedIdeas.size === 0}
                      className={`btn-primary ${selectedIdeas.size === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Send Selected Ideas as New Prompts ({selectedIdeas.size})
                    </button>
                  </div>
                </div>

                {/* Example Flow */}
                <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                    <Lightbulb className="w-5 h-5 text-blue-600" />
                    <span>How Iterative Brainstorming Works</span>
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                      <div>
                        <p className="font-medium text-gray-900">Original Question:</p>
                        <p className="text-gray-700">"How to improve our restaurant?"</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                      <div>
                        <p className="font-medium text-gray-900">Participants Submit Ideas:</p>
                        <p className="text-gray-700">"Add more non-veg items", "Improve service speed", "Update decor"</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                      <div>
                        <p className="font-medium text-gray-900">You Select Top Idea:</p>
                        <p className="text-gray-700">"Add more non-veg items" (highest voted)</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
                      <div>
                        <p className="font-medium text-gray-900">New Round Begins:</p>
                        <p className="text-gray-700">Participants now brainstorm: "What specific non-veg items should we add?"</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</div>
                      <div>
                        <p className="font-medium text-gray-900">Detailed Solutions:</p>
                        <p className="text-gray-700">"Butter chicken", "Lamb biryani", "Fish curry", "Chicken tikka"</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Session Configuration */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Next Round Configuration</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Time Limit for Next Round
                      </label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                        <option>5 minutes</option>
                        <option>10 minutes</option>
                        <option>15 minutes</option>
                        <option>No time limit</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ideas per Participant
                      </label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                        <option>Unlimited</option>
                        <option>1 idea max</option>
                        <option>3 ideas max</option>
                        <option>5 ideas max</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Ideas Available</h3>
                <p className="text-gray-600">
                  Ideas and voting results are needed before starting iterative brainstorming rounds.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Session Information */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Session Information</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Session Title</h3>
            <p className="text-gray-600">{session?.title || 'Untitled Session'}</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Session ID</h3>
            <div className="flex items-center space-x-2">
              <code className="bg-gray-100 px-3 py-1 rounded text-sm font-mono">{sessionId}</code>
              <button
                onClick={() => navigator.clipboard.writeText(sessionId || '')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Copy
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">Share this ID with participants to join</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Description</h3>
            <p className="text-gray-600">{session?.description || 'No description provided'}</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Maximum Participants</h3>
            <p className="text-gray-600">{session?.maxParticipants || 'Not set'}</p>
          </div>
        </div>
      </div>

      {/* Flowchart Modal */}
      {showFlowchart && flowchartData && (
        <div data-flowchart-modal>
          <IdeaFlowChart 
            flowchartData={flowchartData}
            onClose={() => setShowFlowchart(false)}
          />
        </div>
      )}
    </div>
  );
};

export default FacilitatorDashboard;