# WebSocket Migration Plan: Remove Polling, Use WebSockets

## Current State Analysis

### Currently Polled (Every 3 seconds):
1. **Session Data** (phase, etc.) - Line 154-158
2. **Participants List** - Line 161-178
3. **Ideas List** - Line 181-196
4. **Vote Results** - Line 199-216 (only in phase 4+)
5. **Themes** - Line 219-230 (only in phase 5+)

### Already Using WebSockets:
- ✅ `participant_joined` - Listener exists (Line 87-97)
- ✅ `participant_left` - Listener exists (Line 100-115)
- ✅ `phase_changed` - Listener exists (Line 122)
- ✅ `timer_started` / `timer_update` - Listeners exist (Line 117-122)
- ✅ `idea_submitted` - **NOT LISTENED TO** (needs listener)
- ✅ `vote_updated` - **NOT LISTENED TO** (needs listener)

### Missing WebSocket Events:
- ❌ `themes_generated` - Need to emit when themes are created
- ❌ `session_updated` - Optional, phase_changed covers most cases

## Migration Strategy

### Phase 1: Add Missing WebSocket Events (Backend)
1. Add `themes_generated` event when themes are generated
2. Ensure `idea_submitted` includes full idea data
3. Ensure `vote_updated` includes full vote results

### Phase 2: Add WebSocket Listeners (Frontend)
1. Add `idea_submitted` listener to update ideas list
2. Add `vote_updated` listener to update vote results
3. Add `themes_generated` listener to update themes
4. Enhance `phase_changed` listener to update session data

### Phase 3: Remove Polling
1. Remove the entire polling interval (Line 146-240)
2. Keep initial data fetch on mount (one-time)
3. Add fallback mechanism for missed events (optional)

### Phase 4: Cleanup
1. Remove polling-related error handling
2. Remove polling-related state management
3. Test all WebSocket events

## Implementation Details

### Backend Changes (`api_server.py`)

#### 1. Add `themes_generated` event
```python
# In generate_themes endpoint
socketio.emit('themes_generated', {
    'session_id': session_id,
    'themes': themes_data,
    'ideas_by_theme': ideas_by_theme
}, room=f'session_{session_id}')
```

#### 2. Enhance `idea_submitted` event
Already includes full idea data ✓

#### 3. Enhance `vote_updated` event
Already includes vote data ✓

### Frontend Changes (`FacilitatorDashboard.tsx`)

#### 1. Add WebSocket Listeners
```typescript
// Idea submitted
socket.on('idea_submitted', (ideaData: any) => {
  setSubmittedIdeas(prev => {
    // Check if idea already exists
    if (prev.some(i => i.id === ideaData.id)) return prev;
    return [...prev, ideaData];
  });
  
  // Update current round
  const roundNumber = ideaData.round_number || 1;
  setSession(prev => prev ? {...prev, currentRound: roundNumber} : null);
});

// Vote updated
socket.on('vote_updated', (voteData: any) => {
  // Fetch updated vote results
  apiService.getVotes(sessionId).then(results => {
    const voteMap: Record<string, number> = {};
    results.forEach((result: any) => {
      voteMap[result.id] = result.total_points || 0;
    });
    setVoteResults(voteMap);
    setVotes(results);
  });
});

// Themes generated
socket.on('themes_generated', (themesData: any) => {
  setThemes(themesData.themes || []);
  setIdeasByTheme(themesData.ideas_by_theme || {});
});

// Phase changed (enhance existing)
socket.on('phase_changed', (phaseData: any) => {
  const newPhase = phaseData.phase;
  setCurrentPhase(newPhase);
  // Fetch updated session data
  apiService.getSession(sessionId).then(sessionData => {
    if (sessionData) {
      setSession(sessionData);
    }
  });
});
```

#### 2. Remove Polling
- Remove entire `pollInterval` (Line 146-240)
- Keep initial data fetch in first `useEffect` (Line 39-68)

#### 3. Initial Data Fetch (Keep)
Keep the initial fetch on mount to load all data when component first loads.

## Benefits

1. **Real-time Updates**: No 3-second delay
2. **Lower Server Load**: No constant polling
3. **Better Performance**: Only update when data changes
4. **No Race Conditions**: WebSocket events are authoritative
5. **Reduced Bandwidth**: Only send updates when needed

## Testing Checklist

- [ ] Ideas appear immediately when submitted
- [ ] Votes update immediately when cast
- [ ] Phase changes update immediately
- [ ] Participants join/leave updates immediately
- [ ] Themes appear immediately when generated
- [ ] Timer updates work correctly
- [ ] Initial data loads correctly on mount
- [ ] No console errors
- [ ] Works after page refresh

## Rollback Plan

If issues occur, we can:
1. Keep WebSocket listeners
2. Add back polling as fallback (with longer interval, e.g., 30 seconds)
3. Use polling only when WebSocket is disconnected

