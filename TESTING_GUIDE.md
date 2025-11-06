# IdeaFlow Testing Guide

## Complete Step-by-Step Testing Instructions

### Prerequisites
1. Open browser console (F12) to see detailed logs
2. Have two browser windows/tabs ready (one for facilitator, one for participant)

### Test 1: Facilitator Login and Session Creation

**Window 1 (Facilitator):**
1. Go to `/login-info` to see facilitator credentials
2. Go to `/login` 
3. Login with:
   - Username: `facilitator`
   - Password: `admin123`
4. Go to `/dashboard`
5. Click "Join Session" button (this shows create session form for facilitators)
6. Fill out:
   - Session Title: "Test Session"
   - Description: "Testing participant joining"
   - Max Participants: 5
7. Click "Create Session"
8. **IMPORTANT:** Copy the session ID from the facilitator dashboard URL (e.g., `/facilitator/abc123-def456`)
9. Verify timer controls work (start, pause, reset, different durations)

### Test 2: Participant Registration and Session Joining

**Window 2 (Participant):**
1. Go to `/login`
2. Click "Register" tab
3. Register new account:
   - Username: "testparticipant1"
   - Password: "password123"
   - Display Name: "Test Participant"
4. After registration, go to `/dashboard`
5. Click "Join Session" button
6. Fill out:
   - Session ID: [paste the ID from step 8 above]
   - Your Name: "Test User"
7. Click "Join Session"
8. Should navigate to `/session/[session-id]`

### Test 3: Real-time Updates

**Back to Window 1 (Facilitator):**
1. Check if participant count increased
2. Verify participant appears in participants list
3. Test timer functionality
4. Try changing phases

### Expected Console Logs

When joining session, you should see:
```
=== JOIN SESSION ATTEMPT ===
User ID: [user-id]
Session ID: [session-id]
User Name: Test User
Step 1: Checking if session exists...
API: Getting session for ID: [session-id]
API: Available sessions: [array of session IDs]
Session found: [session object]
Step 2: Joining session...
API: joinSession called with: {sessionId: "...", userName: "Test User"}
API: Session lookup result: [session object]
API: Current participants: [array]
API: Max participants allowed: 5
API: Created new participant: [participant object]
API: Updated participants list: [updated array]
API: Join session completed successfully
Participant created: [participant object]
Step 3: Navigating to participant view...
```

### Troubleshooting

**If "Session not found" error:**
- Check console logs for "API: Available sessions" 
- Verify session ID matches exactly
- Ensure facilitator session was created successfully

**If navigation fails:**
- Check browser console for JavaScript errors
- Verify React Router is working
- Check network tab for failed requests

**If participants don't appear:**
- Check facilitator dashboard for real-time updates
- Verify event system is working
- Check API service participant storage

### Database Storage (Currently In-Memory)

Participants are stored in:
- `ApiService.participants` Map object
- Key: sessionId (string)
- Value: Array of ApiParticipant objects

Each participant object contains:
- id: UUID
- name: string
- sessionId: string  
- joinedAt: ISO timestamp
- status: 'active' | 'disconnected'

### Common Issues

1. **Session ID mismatch**: Ensure copying full UUID from URL
2. **User not authenticated**: Verify login state in AuthContext
3. **Role confusion**: Facilitators see create form, participants see join form
4. **Timer not updating**: Check useEffect dependencies and interval cleanup
5. **Real-time updates not working**: Verify event listeners are set up correctly