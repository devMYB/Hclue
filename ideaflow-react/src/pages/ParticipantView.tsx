import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Lightbulb, Clock, Vote, Users, CheckCircle } from 'lucide-react';
import { apiService } from '../services/api';
import type { ApiSession, ApiIdea, ApiParticipant } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { io, Socket } from 'socket.io-client';

const ParticipantView: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<ApiSession | null>(null);
  const [participants, setParticipants] = useState<ApiParticipant[]>([]);
  const [newIdea, setNewIdea] = useState('');
  const [submittedIdeas, setSubmittedIdeas] = useState<ApiIdea[]>([]);
  const [allIdeas, setAllIdeas] = useState<ApiIdea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedVoting, setExpandedVoting] = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [selectedVotes, setSelectedVotes] = useState<Record<string, number>>({});
  const [, setSessionData] = useState<any>(null);
  const [iterativePrompts, setIterativePrompts] = useState<any[]>([]);
  const [phaseTimer, setPhaseTimer] = useState<number>(0);
  const [timerActive, setTimerActive] = useState(false);
  const { user: authenticatedUser } = useAuth();
  const currentUser = authenticatedUser || {
    id: 'guest',
    displayName: 'Guest User'
  };

  const currentPhase = session?.phase || 1;

  // WebSocket connection for real-time timer synchronization
  useEffect(() => {
    if (!sessionId) return;

    // Import Socket.IO and establish connection
    const isNgrok = window.location.hostname.includes('ngrok');
    const isHttps = window.location.protocol === 'https:';
    const socketBaseUrl = (isNgrok || isHttps)
      ? ''
      : 'http://90.0.0.3:8000';

    const socket: Socket = io(socketBaseUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    socket.on('connect', () => {
      console.log('[ParticipantView] WebSocket connected:', socket.id);
      // Join session room for timer updates
      socket.emit('join_session', { 
        session_id: sessionId,
        user_id: currentUser.id,
        is_facilitator: false
      });
      console.log('[ParticipantView] join_session emitted', {
        session_id: sessionId,
        user_id: currentUser.id
      });
    });
      
    socket.on('connect_error', (err) => {
      console.error('[ParticipantView] WebSocket connection error:', err);
    });

    // Listen for timer start from facilitator
      socket.on('timer_started', (timerData: any) => {
        console.log('Timer started event received:', timerData);
        const duration = timerData.duration || 300;
        const startedAt = timerData.started_at ? new Date(timerData.started_at).getTime() : Date.now();
        const elapsed = (Date.now() - startedAt) / 1000;
        const remaining = Math.max(0, Math.floor(duration - elapsed));
        
        console.log('Timer initialized from event:', { duration, elapsed, remaining });
        
        if (remaining > 0) {
          setPhaseTimer(remaining);
          setTimerActive(true);
        } else {
          setPhaseTimer(0);
          setTimerActive(false);
        }
      });

      // Listen for timer updates (pause/stop) from facilitator
      socket.on('timer_update', (timerData: any) => {
        console.log('Timer update received:', timerData);
        if (timerData.is_running) {
          setPhaseTimer(timerData.remaining || 0);
          setTimerActive(true);
        } else {
          setTimerActive(false);
          if (timerData.remaining !== undefined) {
            setPhaseTimer(timerData.remaining);
          }
        }
      });

      // Listen for phase changes that affect timer
      socket.on('phase_changed', (phaseData: any) => {
        console.log('Phase changed:', phaseData);
        // Reset timer when phase changes
        setTimerActive(false);
        setPhaseTimer(0);
      });

      // Listen for new participants joining
      socket.on('participant_joined', (participantData: any) => {
        console.log('Participant joined:', participantData);
        setParticipants(prev => {
          // Check if participant already exists
          if (prev.some(p => p.id === participantData.id)) {
            return prev;
          }
          console.log('[ParticipantView] Existing participants before join:', prev);
          const updatedList = [...prev, participantData];
          console.log('[ParticipantView] Participant list after join:', updatedList.length);
          return updatedList;
        });

        // Also refresh participants from API to ensure consistency
        if (sessionId) {
          apiService.getParticipants(sessionId).then(updatedParticipants => {
            console.log('[ParticipantView] Refreshed participants after join event:', updatedParticipants.length, updatedParticipants);
            setParticipants(updatedParticipants);
          }).catch(err => console.error('[ParticipantView] Error refreshing participants after join:', err));
        }
      });
      
      // Listen for broadcast list updates
      socket.on('participants_updated', (data: any) => {
        console.log('[ParticipantView] Participants updated broadcast:', data?.participants?.length, data);
        if (data?.participants) {
          setParticipants(data.participants);
        }
      });
      
      // Listen for participants leaving
      socket.on('participant_left', (participantData: any) => {
        console.log('[ParticipantView] Participant left event received:', participantData);
        setParticipants(prev => {
          const filtered = prev.filter(p => p.id !== participantData.id);
          console.log(`[ParticipantView] Participant ${participantData.id} removed. Count: ${prev.length} -> ${filtered.length}`);
          return filtered;
        });
      });

    // Cleanup function
    return () => {
      socket.emit('leave_session', { 
        session_id: sessionId,
        user_id: currentUser.id
      });
      console.log('[ParticipantView] leave_session emitted', {
        session_id: sessionId,
        user_id: currentUser.id
      });
      socket.disconnect();
    };
  }, [sessionId, currentUser.id]);

  // Format timer display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!sessionId) return;
    
    const fetchData = async () => {
      try {
        const [sessionData, participantsData, ideasData, promptsData, timerStatus] = await Promise.all([
          apiService.getSession(sessionId),
          apiService.getParticipants(sessionId),
          apiService.getIdeas(sessionId, false), // Don't include author for participants
          apiService.getIterativePrompts(sessionId),
          apiService.getTimerStatus(sessionId) // Fetch current timer status
        ]);
        
        setSession(sessionData);
        setSessionData(sessionData); // Set the voting configuration
        setParticipants(participantsData);
        setIterativePrompts(promptsData?.prompts || [])
        
        // Initialize timer state from fetched status
        console.log('[fetchData] Timer status fetched:', timerStatus);
        if (timerStatus && timerStatus.is_running) {
          let remaining = timerStatus.remaining || 0;
          
          // If we have started_at, recalculate remaining based on elapsed time for accuracy
          if (timerStatus.started_at) {
            try {
              const startedAt = new Date(timerStatus.started_at).getTime();
              const now = Date.now();
              const elapsed = (now - startedAt) / 1000;
              const duration = timerStatus.duration || 300;
              remaining = Math.max(0, Math.floor(duration - elapsed));
              console.log('[fetchData] Timer calculation:', { startedAt, now, elapsed, duration, remaining });
            } catch (e) {
              console.error('[fetchData] Error parsing started_at:', e, timerStatus.started_at);
            }
          }
          
          console.log('[fetchData] Setting timer state:', { remaining, is_running: timerStatus.is_running });
          if (remaining > 0) {
            setPhaseTimer(remaining);
            setTimerActive(true);
            console.log('[fetchData] Timer activated:', { remaining });
          } else {
            console.log('[fetchData] Timer expired, deactivating');
            setPhaseTimer(0);
            setTimerActive(false);
          }
        } else {
          // Timer not running or not set
          console.log('[fetchData] Timer not running or not set:', timerStatus);
          if (!timerStatus || !timerStatus.is_running) {
            setPhaseTimer(0);
            setTimerActive(false);
          }
        }
        
        // Filter ideas to only show current round ideas
        if (sessionData?.phase === 3) {
          // Review phase - only show ideas from current round
          setAllIdeas(ideasData);
        } else if (sessionData?.phase === 4) {
          // Voting phase - only show current round ideas for voting
          setAllIdeas(ideasData);
        } else if ((sessionData?.phase ?? 0) >= 4 && promptsData?.prompts?.length > 0) {
          // Iterative phase - clear old ideas and only show new iterative ideas
          setAllIdeas(ideasData);
          setSubmittedIdeas([]);
        } else {
          setAllIdeas(ideasData);
        }
        
        // Load user votes for voting phase
        if (sessionData?.phase === 4) {
          const votes = await apiService.getVotes(sessionId, currentUser.id);
          const voteMap: Record<string, number> = {};
          votes.forEach((vote: any) => {
            voteMap[vote.idea_id] = vote.votes; // Use actual vote count from API
          });
          setUserVotes(voteMap);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, [sessionId, currentUser.id]);

  // Timer countdown effect
  useEffect(() => {
    if (!timerActive || phaseTimer <= 0) {
      console.log('[Timer Countdown] Not running:', { timerActive, phaseTimer });
      return;
    }

    console.log('[Timer Countdown] Starting countdown from:', phaseTimer);
    const countdown = setInterval(() => {
      setPhaseTimer(prev => {
        if (prev <= 1) {
          console.log('[Timer Countdown] Timer expired');
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [timerActive, phaseTimer]);

  // Debug effect to track timer state changes
  useEffect(() => {
    console.log('[Timer State Changed]', { timerActive, phaseTimer, currentPhase: session?.phase });
  }, [timerActive, phaseTimer, session?.phase]);

  const submitIdea = async () => {
    if (!newIdea.trim() || !sessionId) return;
    
    try {
      // Find the actual participant name from the participants list
      const currentParticipant = participants.find(p => p.userId === currentUser.id);
      const authorName = currentParticipant?.name || currentUser.displayName;
      
      const submittedIdea = await apiService.submitIdea(
        sessionId, 
        newIdea.trim(), 
        currentUser.id, 
        authorName
      );
      setSubmittedIdeas(prev => [...prev, submittedIdea]);
      setNewIdea('');
      
      setNotification({
        message: 'Idea submitted successfully!',
        type: 'success'
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error submitting idea:', error);
      setNotification({
        message: 'Failed to submit idea. Please try again.',
        type: 'error'
      });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const toggleVotingInterface = (ideaId: string) => {
    if (expandedVoting === ideaId) {
      setExpandedVoting(null);
    } else {
      setExpandedVoting(ideaId);
      setSelectedVotes(prev => ({
        ...prev,
        [ideaId]: userVotes[ideaId] || 0
      }));
    }
  };

  const submitVoteForIdea = async (ideaId: string, votes: number) => {
    try {
      // Check if submitting these votes would exceed the session vote limit
      const sessionVoteLimit = session?.votes_per_participant || 5;
      const currentTotalVotes = Object.values(userVotes).reduce((sum, count) => sum + count, 0);
      const currentIdeaVotes = userVotes[ideaId] || 0;
      const newTotalVotes = currentTotalVotes - currentIdeaVotes + votes;
      
      if (newTotalVotes > sessionVoteLimit) {
        const remainingVotes = sessionVoteLimit - (currentTotalVotes - currentIdeaVotes);
        setNotification({
          message: `You only have ${remainingVotes} votes remaining. Please reduce your selection.`,
          type: 'error'
        });
        setTimeout(() => setNotification(null), 4000);
        return;
      }
      
      // Submit vote with new total count
      await apiService.submitVote(sessionId!, ideaId, currentUser.id, currentUser.displayName, votes);
      
      // Refresh vote data from server to ensure consistency
      const updatedVotes = await apiService.getVotes(sessionId!, currentUser.id);
      const voteMap: { [ideaId: string]: number } = {};
      updatedVotes.forEach((vote: any) => {
        voteMap[vote.idea_id] = vote.votes;
      });
      setUserVotes(voteMap);
      
      // Close voting interface
      setExpandedVoting(null);
      
      // Show success notification
      setNotification({
        message: `Successfully updated votes for this idea!`,
        type: 'success'
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error submitting vote:', error);
      setNotification({
        message: 'Failed to submit vote. Please try again.',
        type: 'error'
      });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const renderInlineVotingInterface = (idea: ApiIdea) => {
    if (expandedVoting !== idea.id) return null;
    
    const currentVotes = selectedVotes[idea.id] || 0;
    const totalVotesUsed = Object.values(userVotes).reduce((sum, count) => sum + count, 0);
    const maxVotesPerIdea = session?.max_votes_per_idea || 3;
    const totalVotesPerParticipant = session?.votes_per_participant || 5;
    const availableVotes = totalVotesPerParticipant - totalVotesUsed + (userVotes[idea.id] || 0);
    
    // Generate vote options dynamically based on max votes per idea
    const voteOptions = Array.from({ length: maxVotesPerIdea + 1 }, (_, i) => i);
    
    return (
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-center">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Vote for Idea</h4>
          <p className="text-gray-600 mb-4">{idea.content}</p>
          
          <p className="text-sm text-gray-600 mb-4">
            How many votes do you want to give this idea? (Max {maxVotesPerIdea} per idea)
          </p>
          
          <div className="flex justify-center gap-2 mb-4">
            {voteOptions.map((voteCount) => (
              <button
                key={voteCount}
                onClick={() => setSelectedVotes(prev => ({ ...prev, [idea.id]: voteCount }))}
                className={`w-12 h-12 rounded-lg border-2 font-semibold text-lg transition-all ${
                  currentVotes === voteCount
                    ? 'bg-green-600 text-white border-green-600 shadow-lg'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-green-400 hover:bg-green-50'
                }`}
                disabled={voteCount > Math.min(maxVotesPerIdea, availableVotes)}
              >
                {voteCount}
              </button>
            ))}
          </div>
          
          <p className="text-sm text-gray-500 mb-4">
            Currently: {currentVotes} votes | Available: {availableVotes} votes
          </p>
          
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setExpandedVoting(null)}
              className="px-8 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => submitVoteForIdea(idea.id, currentVotes)}
              className="px-8 py-2 bg-white-600 text-green rounded-lg hover:bg-green-700 transition-colors shadow-md"
            >
              Submit Vote
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPhaseContent = () => {
    switch (currentPhase) {
      case 1:
        return (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Session Starting Soon</h3>
            <p className="text-gray-600">
              Welcome! Please wait for the facilitator to begin the ideation session.
            </p>
          </div>
        );

      case 2:
        console.log('[Phase 2 Render] timerActive:', timerActive, 'phaseTimer:', phaseTimer, 'session:', session);
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Lightbulb className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{session?.title}</h2>
              {timerActive && phaseTimer > 0 ? (
                <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-lg font-medium mb-4">
                  <Clock className="w-4 h-4" />
                  <span>Time remaining: {formatTime(phaseTimer)}</span>
                </div>
              ) : (
                <div className="text-xs text-gray-500 mb-2">
                  Debug: timerActive={String(timerActive)}, phaseTimer={phaseTimer}
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Brainstorming Question</h3>
                <p className="text-blue-800">{session?.description}</p>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Share Your Ideas</h3>
              <p className="text-gray-600 mb-6">
                {iterativePrompts.length > 0 
                  ? "Build on these selected ideas with more specific solutions:"
                  : "Brainstorm and submit your creative ideas for this session."
                }
              </p>
            </div>

            {/* Iterative Prompts Display */}
            {iterativePrompts.length > 0 && (
              <div className="max-w-4xl mx-auto mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                    <Lightbulb className="w-5 h-5 text-blue-600 mr-2" />
                    Ideas to Explore Further
                  </h4>
                  <p className="text-sm text-blue-700 mb-4">
                    The facilitator has selected these promising ideas for deeper exploration. 
                    Use them as inspiration to create more specific, detailed solutions.
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {iterativePrompts.map((prompt, index) => (
                      <div key={prompt.id} className="bg-white border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                            Prompt #{index + 1}
                          </span>
                        </div>
                        <p className="text-gray-800 font-medium mb-2">{prompt.content}</p>
                        <p className="text-xs text-gray-500">
                          Think: How can we make this more specific? What are the details?
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <textarea
                  value={newIdea}
                  onChange={(e) => setNewIdea(e.target.value)}
                  placeholder="Enter your idea here..."
                  className="w-full p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    {newIdea.length}/500 characters
                  </span>
                  <button
                    key={`submit-btn-${newIdea.length}`}
                    onClick={submitIdea}
                    disabled={!newIdea.trim()}
                    className="button"
                    style={{
                      backgroundColor: newIdea.trim() ? '#04AA6D' : '#9ca3af',
                      border: 'none',
                      color: 'green',
                      padding: '15px 32px',
                      textAlign: 'center' as const,
                      textDecoration: 'none',
                      display: 'inline-block',
                      fontSize: '16px',
                      cursor: newIdea.trim() ? 'pointer' : 'not-allowed',
                      borderRadius: '8px'
                    }}
                  >
                    Submit Idea
                  </button>
                </div>
              </div>
            </div>

            {submittedIdeas.length > 0 && (
              <div className="max-w-2xl mx-auto">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Your Submitted Ideas</h4>
                <div className="space-y-3">
                  {submittedIdeas.map((idea) => (
                    <div key={idea.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-gray-800">{idea.content}</p>
                      <p className="text-sm text-green-600 mt-2">✓ Submitted successfully</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Users className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Review All Ideas</h3>
              <p className="text-gray-600 mb-6">
                Take time to read through all the ideas submitted by participants.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="grid gap-4 md:grid-cols-2">
                {allIdeas.map((idea) => (
                  <div key={idea.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-800">{idea.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        const totalVotesUsed = Object.values(userVotes).reduce((sum, count) => sum + count, 0);
        // const maxVotesPerIdea = session?.max_votes_per_idea || 3;
        const totalVotesPerParticipant = session?.votes_per_participant || 5;
        
        return (
          <div className="space-y-6">
            {/* Session Header with Title and Description */}
            <div className="text-center bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{session?.title}</h2>
              <p className="text-gray-700 mb-4">{session?.description}</p>
              <div className="flex justify-center items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Vote className="w-4 h-4" />
                  <span>Votes Used: {totalVotesUsed}/{totalVotesPerParticipant}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  <span>{allIdeas.length} Ideas</span>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <Vote className="w-16 h-16 text-purple-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Vote on Ideas</h3>
              <p className="text-gray-600 mb-6">
                You have {session?.votes_per_participant || 5} votes total. You can give 0-{session?.max_votes_per_idea || 3} votes per idea.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="grid gap-6 md:grid-cols-1">
                {allIdeas.map((idea) => {
                  const ideaVotes = userVotes[idea.id] || 0;
                  const isOwnIdea = idea.authorId === currentUser.id;
                  
                  return (
                    <div key={idea.id} className={`bg-white border rounded-lg p-6 shadow-sm ${
                      isOwnIdea ? 'border-gray-300 bg-gray-50' : 'border-gray-200'
                    }`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 pr-4">
                          <p className="text-gray-800">{idea.content}</p>
                          {isOwnIdea && (
                            <p className="text-sm text-blue-600 mt-2 font-medium">Your idea</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500 mb-1">Your votes</div>
                          <div className="text-lg font-semibold text-blue-600">{ideaVotes}</div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        {isOwnIdea ? (
                          <div className="px-6 py-2 bg-gray-200 text-green-500 rounded-lg font-medium">
                            Cannot vote on your own idea
                          </div>
                        ) : (
                          <button
                            onClick={() => toggleVotingInterface(idea.id)}
                            className={`px-6 py-2 rounded-lg font-medium transition-colors shadow-md ${
                              expandedVoting === idea.id
                                ? 'bg-red-700 text-green hover:bg-red-700'
                                : 'bg-green-700 text-green hover:bg-green-700'
                            }`}
                          >
                            {expandedVoting === idea.id ? 'Cancel Voting' : 'Vote'}
                          </button>
                        )}
                        
                        {ideaVotes > 0 && (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Voted</span>
                          </div>
                        )}
                      </div>
                      
                      {renderInlineVotingInterface(idea)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Session Complete</h3>
            <p className="text-gray-600">
              Thank you for participating! The session has ended and results are being analyzed.
            </p>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Unknown Phase</h3>
            <p className="text-gray-600">Please wait for the facilitator to continue.</p>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Not Found</h2>
          <p className="text-gray-600">The session you're looking for doesn't exist or has ended.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border-l-4 ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-500 text-green-800' 
            : 'bg-red-50 border-red-500 text-red-800'
        }`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <div className="w-5 h-5 mr-2 rounded-full bg-red-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
            )}
            <p className="font-medium">{notification.message}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Lightbulb className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">IdeaFlow</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Phase {currentPhase}/6
              </span>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {currentPhase === 2 && iterativePrompts.length > 0 ? 'Iterative Brainstorming' : 
                   currentPhase === 4 ? 'Voting Phase' : 'Session Active'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{participants.length} participants</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderPhaseContent()}
      </main>
    </div>
  );
};

export default ParticipantView;