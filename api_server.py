"""
Flask API Server for IdeaFlow React Frontend
Provides REST endpoints for session management with PostgreSQL backend
"""

from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from utils.postgres_db_manager import PostgresDBManager
from utils.jwt_manager import create_access_token, create_refresh_token, verify_access_token, get_user_from_token
from stripe_config import StripeManager
from sqlalchemy import text
import uuid
from datetime import datetime
import os
from functools import wraps
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Create Flask app with static file serving
app = Flask(__name__, static_folder='ideaflow-react/dist', static_url_path='/')
# Allow all origins for development - in production this should be more restrictive
CORS(app, origins="*", 
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "X-User-ID"],
     supports_credentials=True)

# Redis removed for simplified setup
redis_client = None

# Initialize database manager
db_manager = PostgresDBManager()

# Display database connection info
if 'sqlite' in str(db_manager.database_url):
    print("Using SQLite database for local development")
else:
    print(f"Using database: {db_manager.database_url}")

# Initialize SocketIO without Redis (single server setup)
socketio = SocketIO(
    app, 
    cors_allowed_origins="*",
    async_mode='threading'
)

# Use local PostgreSQL database
# DATABASE_URL is automatically set by the PostgreSQL service

# Initialize Stripe
stripe_manager = StripeManager()

# JWT Authentication Middleware
def require_auth(f):
    """Decorator to require JWT authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'No token provided'}), 401
        
        user_info = get_user_from_token(token)
        if not user_info:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Add user info to request context
        request.user_id = user_info['user_id']
        request.user_role = user_info['role']
        request.username = user_info['username']
        return f(*args, **kwargs)
    return decorated_function

def require_facilitator(f):
    """Decorator to require facilitator role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not hasattr(request, 'user_role') or request.user_role != 'facilitator':
            return jsonify({'error': 'Facilitator access required'}), 403
        return f(*args, **kwargs)
    return decorated_function

# Background task to set up demo users after startup
import threading
import time

def setup_demo_users():
    """Background task to create demo users after server starts"""
    time.sleep(10)  # Wait for server to be fully ready
    
    users = [
        {"username": "facilitator", "password": "password123", "display_name": "Demo Facilitator", "role": "facilitator"},
        {"username": "participant1", "password": "password123", "display_name": "Test Participant", "role": "participant"},
        {"username": "testing1", "password": "password123", "display_name": "Testing User", "role": "participant"},
        {"username": "nika", "password": "password123", "display_name": "Nika", "role": "participant"}
    ]
    
    for user in users:
        try:
            user_id = db_manager.create_user(user["username"], user["password"], user["display_name"])
            if user_id:
                # Set user role
                db_manager.set_user_role(user_id, user["role"])
                print(f"Created demo user: {user['username']} ({user['role']})")
        except Exception as e:
            print(f"User {user['username']} may already exist")
    
    # Grandfather existing users with basic subscriptions
    grandfathered_count = db_manager.grandfather_existing_users()
    print(f"Grandfathered {grandfathered_count} existing users with Basic Plan")

# Start background setup in production
if os.getenv('REPLIT_DEPLOYMENT'):
    setup_thread = threading.Thread(target=setup_demo_users, daemon=True)
    setup_thread.start()

@app.route('/api/sessions', methods=['POST'])
@require_auth
@require_facilitator
def create_session():
    """Create a new ideation session (facilitator only)"""
    try:
        data = request.get_json()
        facilitator_id = request.user_id  # From JWT token
        title = data.get('title')
        description = data.get('description')
        max_participants = data.get('max_participants', 10)
        
        # Check subscription limits BEFORE creating session
        # Get user's subscription details from database
        with db_manager.engine.connect() as conn:
            query = text("""
                SELECT sessions_used_this_month, max_sessions_per_month, max_participants_per_session
                FROM users 
                WHERE id = :user_id
            """)
            result = conn.execute(query, {'user_id': facilitator_id})
            subscription = result.fetchone()
            
            if subscription:
                sessions_used = subscription[0] or 0
                max_sessions = subscription[1] or 4  # Default to basic plan
                max_participants_allowed = subscription[2] or 10  # Default to basic plan
                
                # Check if user has exceeded session limit
                if sessions_used >= max_sessions:
                    return jsonify({
                        'error': f'Session limit exceeded. You have used {sessions_used} of {max_sessions} sessions this month. Please upgrade your plan or wait until next month.'
                    }), 403
                
                # Enforce participant limit from subscription
                if max_participants > max_participants_allowed:
                    max_participants = max_participants_allowed
                    print(f"Limited participants to {max_participants_allowed} based on subscription plan")
        
        session_data = {
            'id': str(uuid.uuid4()),
            'name': title,  # Map title to name column in database
            'question': description,  # Map description to question column in database
            'facilitator_id': facilitator_id,
            'max_participants': max_participants,
            'votes_per_participant': data.get('votes_per_participant', 5),
            'max_votes_per_idea': data.get('max_votes_per_idea', 3),
            'current_phase': 1,
            'status': 'active',
            'created_at': datetime.now().isoformat()
        }
        
        session_id = db_manager.create_session(session_data)
        session_data['id'] = session_id
        
        # INCREMENT session usage counter after successful creation
        with db_manager.engine.connect() as conn:
            increment_query = text("""
                UPDATE users 
                SET sessions_used_this_month = sessions_used_this_month + 1
                WHERE id = :user_id
            """)
            conn.execute(increment_query, {'user_id': facilitator_id})
            conn.commit()
            print(f"Incremented session usage for user {facilitator_id}")
        
        return jsonify(session_data), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/facilitators/<facilitator_id>/sessions', methods=['GET'])
def get_facilitator_sessions(facilitator_id):
    """Get all sessions created by a specific facilitator"""
    try:
        sessions = db_manager.get_facilitator_sessions(facilitator_id)
        return jsonify(sessions), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sessions/<session_id>', methods=['GET'])
def get_session(session_id):
    """Get session details by ID"""
    try:
        session = db_manager.get_session(session_id)
        if session:
            return jsonify({
                'id': session['id'],
                'name': session['name'],
                'question': session['question'],
                'facilitator_id': session['facilitator_id'],
                'facilitator_name': session.get('facilitator_name', ''),
                'current_phase': session['current_phase'],
                'max_participants': session['max_participants'],
                'votes_per_participant': session.get('votes_per_participant', 5),
                'max_votes_per_idea': session.get('max_votes_per_idea', 3),
                'status': session['status'],
                'created_at': session['created_at']
            })
        else:
            return jsonify({'error': 'Session not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sessions/<session_id>/participants', methods=['POST'])
def join_session(session_id):
    """Join a session as a participant"""
    try:
        data = request.get_json()
        user_name = data.get('user_name')  # This is the session join name, but we'll use registered name
        user_id = data.get('user_id', str(uuid.uuid4()))
        
        # Check if session exists
        session = db_manager.get_session(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        # Check if participant joining is enabled for this session
        if not session.get('join_enabled', True):
            return jsonify({'error': 'Participant joining is disabled for this session'}), 403
        
        # Check if session is full - enforcing subscription-based participant limits
        participants = db_manager.get_participants(session_id)
        current_participant_count = len(participants)
        
        # Get facilitator's subscription limits
        facilitator_id = session['facilitator_id']
        with db_manager.engine.connect() as conn:
            query = text("""
                SELECT max_participants_per_session
                FROM users 
                WHERE id = :user_id
            """)
            result = conn.execute(query, {'user_id': facilitator_id})
            subscription = result.fetchone()
            
            if subscription:
                max_participants_allowed = subscription[0] or 10  # Default to pro plan
            else:
                max_participants_allowed = 10  # Default fallback
        
        # Enforce the subscription limit, not just the session setting
        actual_max_participants = min(session['max_participants'], max_participants_allowed)
        
        if current_participant_count >= actual_max_participants:
            return jsonify({
                'error': f'Session is full. This session is limited to {actual_max_participants} participants based on the facilitator\'s subscription plan.'
            }), 400
        
        # Use the provided user_name for the participant
        # This allows both registered and unregistered users to join
        actual_name = user_name
        
        # Add participant with the provided name
        print(f"DEBUG: Adding participant {actual_name} to session {session_id}")
        add_result = db_manager.add_participant(session_id, user_id, actual_name)
        print(f"DEBUG: add_participant result: {add_result}")
        if not add_result:
            print(f"DEBUG: Failed to add participant to session")
            return jsonify({'error': 'Failed to add participant to session'}), 500
        
        participant_data = {
            'id': user_id,
            'name': actual_name,
            'session_id': session_id,
            'user_id': user_id,
            'joined_at': datetime.now().isoformat(),
            'status': 'active'
        }
        
        # Emit real-time update to all users in the session room
        socketio.emit('participant_joined', participant_data, room=f'session_{session_id}')
        
        return jsonify(participant_data), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sessions/<session_id>/participants', methods=['GET'])
def get_participants(session_id):
    """Get all participants for a session"""
    try:
        participants = db_manager.get_participants(session_id)
        return jsonify({'participants': participants})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sessions/<session_id>/phase', methods=['PUT'])
def update_session_phase(session_id):
    """Update session phase"""
    try:
        data = request.get_json()
        new_phase = data.get('phase')
        
        # Clear votes when transitioning FROM voting phase (4) to any other phase
        # This ensures vote counts reset for new rounds
        if not db_manager.engine:
            return jsonify({'error': 'Database connection failed'}), 500
            
        with db_manager.engine.connect() as conn:
            # Get current phase
            current_query = text("SELECT current_phase FROM sessions WHERE id = :session_id")
            current_result = conn.execute(current_query, {'session_id': session_id})
            current_row = current_result.fetchone()
            current_phase = current_row[0] if current_row else 1
            
            # Never automatically clear votes during phase transitions
            # Votes should persist when moving between phases 4 and 5
            # This allows facilitators to go back and forth without losing voting data
            # Votes will only be cleared when starting a new iterative round
        
        db_manager.update_session_phase(session_id, new_phase)
        
        # Emit phase change to all participants
        socketio.emit('phase_changed', {'phase': new_phase}, room=f'session_{session_id}')
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sessions/<session_id>/timer', methods=['POST'])
@require_auth
def start_timer(session_id):
    """Start or update session timer"""
    try:
        data = request.get_json()
        duration = data.get('duration', 300)  # Default 5 minutes
        action = data.get('action', 'start')  # start, pause, stop
        
        timer_data = {
            'duration': duration,
            'remaining': duration,
            'is_running': action == 'start',
            'started_at': datetime.now().isoformat() if action == 'start' else None
        }
        
        # Store timer state in database
        db_manager.save_timer_state(session_id, timer_data)
        
        # Emit timer_started event for clients to run their own countdown
        if action == 'start':
            socketio.emit('timer_started', {
                'duration': duration,
                'started_at': datetime.now().isoformat()
            }, room=f'session_{session_id}')
        else:
            # For pause/stop, send timer_update
            socketio.emit('timer_update', timer_data, room=f'session_{session_id}')
        
        return jsonify({'success': True, 'timer': timer_data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sessions/<session_id>/timer', methods=['PUT'])
@require_auth
def update_timer(session_id):
    """Update timer state (pause, resume, stop)"""
    try:
        data = request.get_json()
        remaining = data.get('remaining')
        is_running = data.get('is_running', False)
        
        # Get current timer state
        current_timer = db_manager.get_timer_state(session_id)
        if not current_timer:
            return jsonify({'error': 'Timer not found'}), 404
        
        timer_data = {
            'duration': current_timer['duration'],
            'remaining': remaining,
            'is_running': is_running,
            'started_at': current_timer['started_at'],
            'updated_at': datetime.now().isoformat()
        }
        
        # Update timer state in database
        db_manager.save_timer_state(session_id, timer_data)
        
        # Emit timer update to all participants
        socketio.emit('timer_update', timer_data, room=f'session_{session_id}')
        
        return jsonify({'success': True, 'timer': timer_data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sessions/<session_id>/timer-status', methods=['GET'])
def get_timer_status(session_id):
    """Get current timer status for synchronization"""
    try:
        timer_data = db_manager.get_timer_state(session_id)
        print(f"[API] Timer status requested for session {session_id}, returned: {timer_data}")
        if not timer_data:
            timer_data = {
                'remaining': 0,
                'is_running': False,
                'duration': 300,
                'started_at': None
            }
        # Ensure started_at is included and properly formatted
        if timer_data.get('started_at') and isinstance(timer_data['started_at'], str):
            # Already a string (ISO format)
            pass
        elif timer_data.get('started_at'):
            # Convert datetime to ISO string if needed
            timer_data['started_at'] = timer_data['started_at'].isoformat()
        return jsonify(timer_data)
    except Exception as e:
        print(f"[API] Error getting timer status: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/sessions/<session_id>/voting-settings', methods=['PUT'])
def update_voting_settings(session_id):
    """Update voting configuration for a session"""
    try:
        data = request.get_json()
        max_votes_per_idea = data.get('max_votes_per_idea')
        votes_per_participant = data.get('votes_per_participant')
        
        if max_votes_per_idea is not None and (not isinstance(max_votes_per_idea, int) or max_votes_per_idea < 1 or max_votes_per_idea > 10):
            return jsonify({'error': 'Max votes per idea must be between 1 and 10'}), 400
            
        if votes_per_participant is not None and (not isinstance(votes_per_participant, int) or votes_per_participant < 1 or votes_per_participant > 50):
            return jsonify({'error': 'Votes per participant must be between 1 and 50'}), 400
        
        success = db_manager.update_voting_settings(session_id, max_votes_per_idea, votes_per_participant)
        if success:
            return jsonify({'success': True}), 200
        else:
            return jsonify({'error': 'Failed to update voting settings'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sessions/<session_id>/finish', methods=['POST'])
def finish_session(session_id):
    """Finish a session and archive it"""
    try:
        # Update session status to completed
        conn = db_manager.get_connection()
        if conn:
            with conn:
                conn.execute(text("""
                    UPDATE sessions 
                    SET status = 'completed', completed_at = :completed_at 
                    WHERE id = :session_id
                """), {"completed_at": datetime.now(), "session_id": session_id})
                conn.commit()
        
        return jsonify({'success': True, 'message': 'Session completed and archived'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sessions/<session_id>/ideas', methods=['POST'])
def submit_idea(session_id):
    """Submit an idea to a session"""
    try:
        # Check if session is in idea submission phase (Phase 2 or iterative phases)
        session = db_manager.get_session(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
            
        current_phase = session.get('current_phase', session.get('phase', 1))
        if current_phase not in [2, 5, 6]:  # Only allow in idea generation or iterative phases
            return jsonify({'error': f'Ideas can only be submitted during idea generation phases. Current phase: {current_phase}'}), 400
        
        data = request.get_json()
        print(f"Received idea data: {data}")
        
        # Extract content properly - handle both direct content and nested content
        content = data.get('content')
        if isinstance(content, dict):
            # If content is a dict, extract the actual content string
            actual_content = content.get('content', str(content))
            author_id = content.get('author_id')
            author_name = content.get('author_name')
        else:
            # Content is already a string
            actual_content = content
            author_id = data.get('author_id')
            author_name = data.get('author_name')
        
        # Force lookup of author name from database if not provided or is "Anonymous"
        if not author_name or author_name == 'Anonymous':
            if author_id:
                user = db_manager.authenticate_user_by_id(author_id)
                if user:
                    author_name = user.get('display_name') or user.get('username') or 'Anonymous'
                else:
                    author_name = 'Anonymous'
            else:
                author_name = 'Anonymous'
        
        # Get current round number from session
        current_round = session.get('round_number', 1)
        
        idea_data = {
            'session_id': session_id,
            'content': actual_content,
            'author_id': author_id,
            'author_name': author_name,
            'round_number': current_round
        }
        
        print(f"Processed idea data: {idea_data}")
        
        idea_id = db_manager.add_idea(idea_data)
        if idea_id:
            idea_data['id'] = idea_id
            idea_data['created_at'] = datetime.now().isoformat()
            
            # Emit real-time update to all users in the session room
            socketio.emit('idea_submitted', idea_data, room=f'session_{session_id}')
            
            return jsonify(idea_data), 201
        else:
            return jsonify({'error': 'Failed to create idea'}), 500
    except Exception as e:
        print(f"Error in submit_idea: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/sessions/<session_id>/ideas', methods=['GET'])
def get_ideas(session_id):
    """Get all ideas for a session"""
    try:
        # Check if this is a facilitator request (include_author parameter)
        include_author = request.args.get('include_author', 'false').lower() == 'true'
        
        # Get session info to check current phase and round
        session = db_manager.get_session(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        current_phase = session.get('current_phase', 1)
        current_round = session.get('round_number', 1)
        
        # For facilitators (include_author=true), show ALL ideas from all rounds in phase 3+
        # For participants, filter to current round only
        if include_author:
            # Facilitators always see ALL ideas for proper session management with author names
            ideas = db_manager.get_ideas(session_id, include_author=True, round_number=None)
        else:
            # Participants see only current round ideas for focused collaboration
            ideas = db_manager.get_ideas(session_id, include_author=False, round_number=current_round)
        
        # Map database field names to frontend expected format
        formatted_ideas = []
        for idea in ideas:
            formatted_idea = {
                'id': idea.get('id'),
                'content': idea.get('content'),
                'sessionId': session_id,
                'authorId': idea.get('author_id'),  # Map author_id to authorId
                'authorName': idea.get('author_name'),
                'createdAt': idea.get('created_at', ''),
                'themeId': idea.get('theme_id'),
                'roundNumber': idea.get('round_number', 1)
            }
            formatted_ideas.append(formatted_idea)
        
        return jsonify(formatted_ideas)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users', methods=['POST'])
def create_user():
    """Register a new user"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        display_name = data.get('display_name')
        
        user_id = db_manager.create_user(username, password, display_name)
        
        return jsonify({
            'id': user_id,
            'username': username,
            'display_name': display_name
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        print("=== REGISTRATION ENDPOINT CALLED ===")
        data = request.get_json()
        print(f"Request data: {data}")
        
        username = data.get('username')
        password = data.get('password')
        display_name = data.get('display_name')
        role = data.get('role', 'participant')  # Default to participant
        
        print(f"Extracted: username={username}, display_name={display_name}, role={role}")
        
        if not username or not password or not display_name:
            print("Missing required fields")
            return jsonify({'error': 'Missing required fields'}), 400
        
        print("Calling db_manager.create_user...")
        user_id = db_manager.create_user(username, password, display_name)
        print(f"create_user returned: {user_id}")
        
        if user_id:
            # Set user role
            db_manager.set_user_role(user_id, role)
            print(f"SUCCESS: User created with role '{role}', returning 201")
            return jsonify({
                'id': user_id,
                'username': username,
                'display_name': display_name,
                'role': role
            }), 201
        else:
            print("FAILED: create_user returned None")
            return jsonify({'error': 'Registration failed - user may already exist'}), 500
    except Exception as e:
        print(f"EXCEPTION in registration: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Authenticate user login with JWT tokens"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        user = db_manager.authenticate_user(username, password)
        if user:
            # Get user role from database
            user_role = db_manager.get_user_role(user['id'])
            
            # Create JWT tokens
            access_token = create_access_token(user['id'], user['username'], user_role)
            refresh_token = create_refresh_token(user['id'])
            
            return jsonify({
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': {
                    'id': user['id'],
                    'username': user['username'],
                    'display_name': user['display_name'],
                    'role': user_role
                }
            })
        else:
            return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# WebSocket event handlers
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print('Client disconnected')

@socketio.on('join_session')
def handle_join_session(data):
    """Join a session room for real-time updates"""
    session_id = data.get('session_id')
    user_id = data.get('user_id')
    
    if session_id:
        join_room(f'session_{session_id}')
        emit('joined_session', {'session_id': session_id})

@socketio.on('leave_session')
def handle_leave_session(data):
    """Leave a session room"""
    session_id = data.get('session_id')
    user_id = data.get('user_id')
    
    if session_id:
        leave_room(f'session_{session_id}')
        emit('left_session', {'session_id': session_id})

# Add voting endpoint
@app.route('/api/sessions/<session_id>/votes', methods=['POST'])
def submit_vote(session_id):
    """Submit or update votes for an idea"""
    try:
        data = request.get_json()
        idea_id = data.get('idea_id')
        voter_id = data.get('voter_id')
        voter_name = data.get('voter_name')
        vote_count = data.get('votes', 1)  # Total votes for this idea
        
        # Get session configuration
        session = db_manager.get_session(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
            
        max_votes_per_idea = session.get('max_votes_per_idea', 3)
        votes_per_participant = session.get('votes_per_participant', 5)
        
        # Validate vote count for this idea
        if vote_count > max_votes_per_idea:
            return jsonify({'error': f'Maximum {max_votes_per_idea} votes allowed per idea'}), 400
            
        # Get existing votes for this user to check total limits  
        existing_votes = db_manager.get_votes(session_id, voter_id)
        # Sum points field to get actual vote counts
        current_idea_votes = sum(v.get('points', 0) for v in existing_votes if v.get('idea_id') == idea_id)
        other_votes = sum(v.get('points', 0) for v in existing_votes if v.get('idea_id') != idea_id)
        
        # Check if new total would exceed participant limit
        new_total = other_votes + vote_count
        if new_total > votes_per_participant:
            return jsonify({'error': f'You only have {votes_per_participant - other_votes} votes remaining'}), 400
        
        # Update or insert vote using upsert operation
        try:
            result = db_manager.upsert_vote({
                'session_id': session_id,
                'idea_id': idea_id,
                'voter_id': voter_id,
                'voter_name': voter_name,
                'votes': vote_count
            })
            
            if result:
                # Emit real-time update to all users in the session room
                socketio.emit('vote_updated', {
                    'session_id': session_id,
                    'idea_id': idea_id,
                    'voter_id': voter_id,
                    'votes': vote_count
                }, to=f'session_{session_id}')
                
                return jsonify({'success': True, 'votes': vote_count}), 201
            else:
                return jsonify({'error': 'Failed to submit vote'}), 500
        except Exception as db_error:
            print(f"Database error in vote submission: {db_error}")
            return jsonify({'error': f'Database error: {str(db_error)}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sessions/<session_id>/votes', methods=['GET'])
def get_votes(session_id):
    """Get vote results for a session or specific user votes"""
    try:
        voter_id = request.args.get('voter_id')
        if voter_id:
            # Get votes for specific user and format for frontend
            votes = db_manager.get_votes(session_id, voter_id)
            # Convert to frontend format: array of objects with idea_id and votes count
            formatted_votes = []
            for vote in votes:
                formatted_votes.append({
                    'idea_id': vote.get('idea_id'),
                    'votes': vote.get('points', 1),  # Use points field as vote count
                    'voter_id': voter_id,
                    'session_id': session_id
                })
            return jsonify(formatted_votes)
        else:
            # Get aggregated vote results for all users
            vote_results = db_manager.get_vote_results(session_id)
            return jsonify(vote_results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sessions/<session_id>/iterative-prompt', methods=['POST'])
def create_iterative_prompt(session_id):
    """Create a new iterative brainstorming round with selected ideas as prompts"""
    try:
        data = request.get_json()
        selected_idea_ids = data.get('selected_idea_ids', [])
        facilitator_id = data.get('facilitator_id')
        
        if not selected_idea_ids:
            return jsonify({'error': 'No ideas selected'}), 400
            
        # Verify facilitator permissions
        session = db_manager.get_session(session_id)
        session_facilitator_id = session.get('facilitatorId') or session.get('facilitator_id')
        if not session or session_facilitator_id != facilitator_id:
            return jsonify({'error': 'Unauthorized'}), 403
            
        # Get the selected ideas content
        if not db_manager.engine:
            return jsonify({'error': 'Database connection failed'}), 500
        with db_manager.engine.connect() as conn:
            # Build IN clause for SQLite compatibility
            placeholders = ','.join([f':id{i}' for i in range(len(selected_idea_ids))])
            query_str = f"""
                SELECT id, content, author_id 
                FROM ideas 
                WHERE id IN ({placeholders}) AND session_id = :session_id
            """
            params = {f'id{i}': id_val for i, id_val in enumerate(selected_idea_ids)}
            params['session_id'] = session_id
            
            result = conn.execute(text(query_str), params)
            selected_ideas = [dict(row._mapping) for row in result]
            
        if not selected_ideas:
            return jsonify({'error': 'Selected ideas not found'}), 404
            
        # Update session with iterative prompt data
        iterative_data = {
            'round_number': session.get('round_number', 1) + 1,
            'selected_ideas': selected_ideas,
            'prompt_type': 'iterative',
            'created_at': datetime.utcnow().isoformat()
        }
        
        if not db_manager.engine:
            return jsonify({'error': 'Database connection failed'}), 500
        with db_manager.engine.connect() as conn:
            # First ensure the columns exist
            try:
                conn.execute(text("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS iterative_prompt TEXT"))
                conn.execute(text("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS round_number INTEGER DEFAULT 1"))
                conn.commit()
            except:
                pass  # Columns already exist
            
            # Clear all votes when starting new iterative round
            delete_votes_query = text("DELETE FROM votes WHERE idea_id IN (SELECT id FROM ideas WHERE session_id = :session_id)")
            conn.execute(delete_votes_query, {'session_id': session_id})
            
            # Store iterative prompt data in session
            update_query = text("""
                UPDATE sessions 
                SET iterative_prompt = :iterative_data,
                    round_number = :round_number,
                    current_phase = 2
                WHERE id = :session_id
            """)
            conn.execute(update_query, {
                'iterative_data': str(iterative_data),  # Store as JSON string
                'round_number': iterative_data['round_number'],
                'session_id': session_id
            })
            conn.commit()
            
        return jsonify({
            'success': True,
            'message': f'Started new brainstorming round with {len(selected_ideas)} selected ideas',
            'round_number': iterative_data['round_number'],
            'selected_ideas': selected_ideas
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sessions/<session_id>/iterative-prompt', methods=['GET'])
def get_iterative_prompt(session_id):
    """Get current iterative brainstorming prompts for participants"""
    try:
        session = db_manager.get_session(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
            
        iterative_prompt = session.get('iterative_prompt')
        if not iterative_prompt:
            return jsonify({'prompts': [], 'round_number': 1})
            
        # Parse the iterative data
        import ast
        try:
            prompt_data = ast.literal_eval(iterative_prompt) if isinstance(iterative_prompt, str) else iterative_prompt
        except:
            prompt_data = {'selected_ideas': [], 'round_number': 1}
            
        return jsonify({
            'prompts': prompt_data.get('selected_ideas', []),
            'round_number': prompt_data.get('round_number', 1),
            'prompt_type': prompt_data.get('prompt_type', 'iterative')
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sessions/<session_id>/themes', methods=['POST'])
def generate_themes(session_id):
    """Generate AI themes for a session"""
    try:
        # Get all ideas for the session using db_manager
        if not db_manager.engine:
            return jsonify({'error': 'Database connection failed'}), 500
            
        with db_manager.engine.connect() as conn:
            # Get ALL ideas from ALL rounds for comprehensive theme analysis
            query = text("""
                SELECT id, content, author_name, round_number 
                FROM ideas 
                WHERE session_id = :session_id
                ORDER BY round_number ASC, created_at ASC
            """)
            result = conn.execute(query, {'session_id': session_id})
            ideas_data = [dict(row._mapping) for row in result]
        
        if not ideas_data:
            return jsonify({'themes': [], 'idea_theme_mapping': {}})
        
        # Convert to format expected by AI processor
        ideas = [{'id': str(row['id']), 'content': row['content']} for row in ideas_data]
        
        # Import and use AI processor
        from utils.ai_processor import AIProcessor
        ai_processor = AIProcessor()
        
        # Generate themes
        theme_data = ai_processor.get_themes_from_ideas(ideas)
        
        # Store themes in database
        with db_manager.engine.connect() as conn:
            for theme in theme_data.get('themes', []):
                query = text("""
                    INSERT INTO themes (id, session_id, name, description)
                    VALUES (:id, :session_id, :name, :description)
                    ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description
                """)
                conn.execute(query, {
                    'id': theme['id'],
                    'session_id': session_id,
                    'name': theme['name'],
                    'description': theme['description']
                })
            
            # Update idea-theme mapping
            for idea_id, theme_id in theme_data.get('idea_theme_mapping', {}).items():
                query = text("""
                    UPDATE ideas SET theme_id = :theme_id WHERE id = :idea_id
                """)
                # Convert numpy types to Python types for PostgreSQL compatibility
                theme_id_str = str(theme_id) if hasattr(theme_id, 'item') else str(theme_id)
                conn.execute(query, {'theme_id': theme_id_str, 'idea_id': str(idea_id)})
            
            conn.commit()
        
        return jsonify(theme_data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sessions/<session_id>/themes', methods=['GET'])
def get_themes(session_id):
    """Get AI themes for a session"""
    try:
        if not db_manager.engine:
            return jsonify({'error': 'Database connection failed'}), 500
            
        with db_manager.engine.connect() as conn:
            # Get themes with counts
            query = text("""
                SELECT t.id, t.name, t.description,
                       COUNT(i.id) as idea_count,
                       COALESCE(SUM(COALESCE(v.points, 0)), 0) as total_votes
                FROM themes t
                LEFT JOIN ideas i ON t.id = i.theme_id
                LEFT JOIN votes v ON i.id = v.idea_id
                WHERE t.session_id = :session_id
                GROUP BY t.id, t.name, t.description
                ORDER BY total_votes DESC
            """)
            result = conn.execute(query, {'session_id': session_id})
            
            themes = []
            for row in result:
                themes.append({
                    'id': row[0],
                    'name': row[1],
                    'description': row[2],
                    'idea_count': row[3],
                    'total_votes': row[4]
                })
            
            # Get ideas by theme
            query = text("""
                SELECT i.id, i.content, i.author_name, i.theme_id,
                       COALESCE(SUM(v.points), 0) as votes
                FROM ideas i
                LEFT JOIN votes v ON i.id = v.idea_id
                WHERE i.session_id = :session_id AND i.theme_id IS NOT NULL
                GROUP BY i.id, i.content, i.author_name, i.theme_id
                ORDER BY i.theme_id, votes DESC
            """)
            result = conn.execute(query, {'session_id': session_id})
            
            ideas_by_theme = {}
            for row in result:
                theme_id = row[3]
                if theme_id not in ideas_by_theme:
                    ideas_by_theme[theme_id] = []
                ideas_by_theme[theme_id].append({
                    'id': row[0],
                    'content': row[1],
                    'author_name': row[2],
                    'votes': row[4]
                })
        
        return jsonify({
            'themes': themes,
            'ideas_by_theme': ideas_by_theme
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sessions/<session_id>/flowchart', methods=['POST'])
def generate_flowchart(session_id):
    """Generate a flowchart showing the ideation journey from initial ideas to final selection"""
    try:
        if not db_manager.engine:
            return jsonify({'error': 'Database connection failed'}), 500
            
        with db_manager.engine.connect() as conn:
            # Get session info
            session_query = text("SELECT name, iterative_prompt, round_number FROM sessions WHERE id = :session_id")
            session_result = conn.execute(session_query, {'session_id': session_id})
            session_row = session_result.fetchone()
            
            if not session_row:
                return jsonify({'error': 'Session not found'}), 404
                
            session_name = session_row[0]
            iterative_prompt = session_row[1] 
            current_round = session_row[2] or 1
            
            # Get initial ideas (Round 1)
            initial_ideas_query = text("""
                SELECT content, author_name, COALESCE(SUM(v.points), 0) as votes
                FROM ideas i
                LEFT JOIN votes v ON i.id = v.idea_id
                WHERE i.session_id = :session_id AND i.round_number = 1
                GROUP BY i.id, i.content, i.author_name
                ORDER BY votes DESC
                LIMIT 8
            """)
            initial_ideas_result = conn.execute(initial_ideas_query, {'session_id': session_id})
            initial_ideas = [{'content': row[0], 'author': row[1], 'votes': row[2]} for row in initial_ideas_result]
            
            # Get iterative ideas (Round 2+) if they exist
            iterative_ideas = []
            if current_round > 1:
                iterative_ideas_query = text("""
                    SELECT content, author_name, round_number, COALESCE(SUM(v.points), 0) as votes
                    FROM ideas i
                    LEFT JOIN votes v ON i.id = v.idea_id
                    WHERE i.session_id = :session_id AND i.round_number > 1
                    GROUP BY i.id, i.content, i.author_name, i.round_number
                    ORDER BY i.round_number, votes DESC
                """)
                iterative_result = conn.execute(iterative_ideas_query, {'session_id': session_id})
                iterative_ideas = [{'content': row[0], 'author': row[1], 'round': row[2], 'votes': row[3]} for row in iterative_result]
            
            # Get themes and their top ideas
            themes_query = text("""
                SELECT t.name, t.description,
                       i.content, i.author_name, COALESCE(SUM(v.points), 0) as votes
                FROM themes t
                LEFT JOIN ideas i ON t.id = i.theme_id
                LEFT JOIN votes v ON i.id = v.idea_id
                WHERE t.session_id = :session_id
                GROUP BY t.id, t.name, t.description, i.id, i.content, i.author_name
                ORDER BY t.name, votes DESC
            """)
            themes_result = conn.execute(themes_query, {'session_id': session_id})
            
            themes_data = {}
            for row in themes_result:
                theme_name = row[0]
                if theme_name not in themes_data:
                    themes_data[theme_name] = {
                        'description': row[1],
                        'ideas': []
                    }
                if row[2]:  # If there's an idea content
                    themes_data[theme_name]['ideas'].append({
                        'content': row[2],
                        'author': row[3],
                        'votes': row[4]
                    })
            
            # Determine final selection (highest voted idea overall)
            final_idea_query = text("""
                SELECT i.content, i.author_name, COALESCE(SUM(v.points), 0) as votes
                FROM ideas i
                LEFT JOIN votes v ON i.id = v.idea_id
                WHERE i.session_id = :session_id
                GROUP BY i.id, i.content, i.author_name
                ORDER BY votes DESC
                LIMIT 1
            """)
            final_result = conn.execute(final_idea_query, {'session_id': session_id})
            final_idea_row = final_result.fetchone()
            final_idea = None
            if final_idea_row:
                final_idea = {
                    'content': final_idea_row[0],
                    'author': final_idea_row[1],
                    'votes': final_idea_row[2]
                }
        
        # Create flowchart data structure
        flowchart_data = {
            'session_name': session_name,
            'iterative_prompt': iterative_prompt,
            'current_round': current_round,
            'initial_ideas': initial_ideas,
            'iterative_ideas': iterative_ideas,
            'themes': themes_data,
            'final_idea': final_idea,
            'total_ideas': len(initial_ideas) + len(iterative_ideas),
            'generated_at': datetime.utcnow().isoformat()
        }
        
        return jsonify({
            'success': True,
            'flowchart': flowchart_data
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========================
# SUBSCRIPTION MANAGEMENT API ENDPOINTS (Phase 1)
# ========================

@app.route('/api/subscription/status', methods=['GET'])
def get_subscription_status():
    """Get current user's subscription status and usage"""
    try:
        # Get user ID from request header or session
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'error': 'User ID required'}), 401
        
        # Get subscription data directly from users table
        with db_manager.engine.connect() as conn:
            query = text("""
                SELECT subscription_tier, subscription_status, max_sessions_per_month, 
                       max_participants_per_session, sessions_used_this_month,
                       stripe_customer_id, stripe_subscription_id, stripe_price_id,
                       cancel_at_period_end
                FROM users WHERE id = :user_id
            """)
            result = conn.execute(query, {'user_id': user_id})
            user_data = result.fetchone()
            
            if not user_data:
                return jsonify({'error': 'User not found'}), 404
            
            subscription = {
                'tier': user_data[0] or 'free',
                'status': user_data[1] or 'active',
                'max_sessions_per_month': user_data[2] or 1,
                'max_participants_per_session': user_data[3] or 5,
                'sessions_used_this_month': user_data[4] or 0,
                'stripe_customer_id': user_data[5],
                'stripe_subscription_id': user_data[6],
                'stripe_price_id': user_data[7],
                'cancel_at_period_end': user_data[8] or False
            }
        
        # Calculate usage statistics
        sessions_used = subscription.get('sessions_used_this_month', 0)
        max_sessions = subscription.get('max_sessions_per_month', 4)
        max_participants = subscription.get('max_participants_per_session', 10)
        
        # Check if session can be created
        can_create_session, session_message = db_manager.check_session_limit(user_id)
        
        return jsonify({
            'subscription': {
                'tier': subscription.get('tier', 'basic'),
                'status': subscription.get('status', 'active'),
                'sessions_used_this_month': sessions_used,
                'max_sessions_per_month': max_sessions,
                'max_participants_per_session': max_participants,
                'sessions_remaining': max_sessions - sessions_used,
                'can_create_session': can_create_session,
                'message': session_message,
                'current_period_start': subscription.get('current_period_start'),
                'current_period_end': subscription.get('current_period_end'),
                'cancel_at_period_end': subscription.get('cancel_at_period_end', False)
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/subscription/usage', methods=['POST'])
def record_session_usage():
    """Record session creation to increment usage counter"""
    try:
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'error': 'User ID required'}), 401
        
        # Check if user can create a session
        can_create, message = db_manager.check_session_limit(user_id)
        if not can_create:
            return jsonify({'error': message, 'limit_reached': True}), 403
        
        # Increment session usage
        success = db_manager.increment_user_sessions(user_id)
        if success:
            # Get updated subscription data
            subscription = db_manager.get_user_subscription(user_id)
            sessions_used = subscription.get('sessions_used_this_month', 0)
            max_sessions = subscription.get('max_sessions_per_month', 4)
            
            return jsonify({
                'success': True,
                'sessions_used': sessions_used,
                'sessions_remaining': max_sessions - sessions_used
            })
        else:
            return jsonify({'error': 'Failed to record usage'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/subscription/limits/participants', methods=['POST'])
def check_participant_limits():
    """Check if user can add participants to a session"""
    try:
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'error': 'User ID required'}), 401
        
        data = request.get_json()
        current_participants = data.get('current_participants', 0)
        
        can_add, message = db_manager.check_participant_limit(user_id, current_participants)
        
        subscription = db_manager.get_user_subscription(user_id)
        max_participants = subscription.get('max_participants_per_session', 5) if subscription else 5
        
        return jsonify({
            'can_add_participants': can_add,
            'message': message,
            'current_participants': current_participants,
            'max_participants_per_session': max_participants
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/subscription/tiers', methods=['GET'])
def get_subscription_tiers():
    """Get available subscription tiers with pricing"""
    try:
        tiers = [
            {
                'id': 'free',
                'name': 'Free Trial',
                'price': 0.00,
                'price_formatted': 'Free',
                'sessions_per_month': 1,
                'max_participants': 5,
                'features': [
                    '1 Session/Month',
                    '5 Max Participants/Session',
                    'Basic ideation workflow',
                    'Try before you buy'
                ],
                'stripe_price_id': None
            },
            {
                'id': 'basic',
                'name': 'Basic Plan',
                'price': 10.00,
                'price_formatted': '$10/mo',
                'sessions_per_month': 4,
                'max_participants': 10,
                'features': [
                    '4 Sessions/Month',
                    '10 Max Participants/Session', 
                    'Basic ideation workflow',
                    'Standard templates',
                    'AI-powered analysis'
                ],
                'stripe_price_id': 'price_1RjNTOH4uz8ORv1eFcE6rsYO'
            },
            {
                'id': 'pro',
                'name': 'Unlimited Plan',
                'price': 14.99,
                'price_formatted': '$14.99/mo',
                'sessions_per_month': 999999,  # Unlimited
                'max_participants': 999999,     # Unlimited
                'features': [
                    'Unlimited Sessions',
                    'Unlimited Participants',
                    'AI-powered analysis',
                    'Advanced templates', 
                    'Export results',
                    'Priority support'
                ],
                'stripe_price_id': 'price_1RjNTPH4uz8ORv1ebu0u3XmY'
            }
        ]
        
        return jsonify({'tiers': tiers})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Stripe Payment Integration Endpoints

@app.route('/api/payment/create-checkout-session', methods=['POST'])
def create_checkout_session():
    """Create a Stripe Checkout session for subscription"""
    try:
        # Check if Stripe API key is set
        if not os.getenv('STRIPE_SECRET_KEY'):
            print("ERROR: STRIPE_SECRET_KEY environment variable is not set!")
            return jsonify({'error': 'Stripe is not configured. Please contact support.'}), 500
        
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'error': 'User ID required'}), 401
        
        data = request.get_json()
        tier_id = data.get('tier_id')  # 'basic' or 'pro'
        
        print(f"[Checkout] Creating checkout session for user {user_id}, tier: {tier_id}")
        
        # Define available subscription tiers for Stripe
        valid_tiers = ['basic', 'pro']
        if tier_id not in valid_tiers:
            return jsonify({'error': 'Invalid subscription tier'}), 400
        
        # Get user details
        user = db_manager.get_user_by_id(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Create or get Stripe customer
        customer_id = user.get('stripe_customer_id')
        if not customer_id:
            print(f"[Checkout] Creating new Stripe customer for user {user_id}")
            customer = stripe_manager.create_customer(
                email=user.get('email', f"{user['username']}@ideaflow.app"),
                name=user.get('display_name', user['username']),
                user_id=user_id
            )
            if customer:
                customer_id = customer.id
                print(f"[Checkout] Created Stripe customer: {customer_id}")
                # Update user with Stripe customer ID
                db_manager.update_user_stripe_customer(user_id, customer_id)
            else:
                print(f"[Checkout] Failed to create Stripe customer for user {user_id}")
                return jsonify({'error': 'Failed to create Stripe customer'}), 500
        else:
            print(f"[Checkout] Using existing Stripe customer: {customer_id}")
        
        # Real Stripe price IDs created for IdeaFlow subscription plans
        stripe_price_ids = {
            'basic': 'price_1RjNTOH4uz8ORv1eFcE6rsYO',     # Basic Plan - $10/month
            'pro': 'price_1RjNTPH4uz8ORv1ebu0u3XmY'        # Pro Plan - $14.99/month
        }
        
        price_id = stripe_price_ids[tier_id]
        
        # Get the origin from the request to build proper URLs
        # For ngrok/HTTPS, use the Origin header; for local, construct from request
        origin = request.headers.get('Origin')
        if not origin:
            # Fallback: try to construct from Referer or host
            referer = request.headers.get('Referer', '')
            if referer:
                origin = referer.rsplit('/', 1)[0]
            else:
                origin = request.host_url.rstrip('/')
        
        success_url = f"{origin}/manage-subscription?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin}/manage-subscription"
        
        print(f"[Checkout] Origin: {origin}")
        print(f"[Checkout] Success URL: {success_url}")
        
        print(f"[Checkout] Creating checkout session with price_id: {price_id}, success_url: {success_url}")
        
        session = stripe_manager.create_checkout_session(
            customer_id=customer_id,
            price_id=price_id,
            success_url=success_url,
            cancel_url=cancel_url
        )
        
        if session:
            print(f"[Checkout] Checkout session created successfully: {session.id}")
            return jsonify({
                'checkout_url': session.url,
                'session_id': session.id
            })
        else:
            print(f"[Checkout] Failed to create checkout session - stripe_manager returned None")
            return jsonify({'error': 'Failed to create checkout session'}), 500
            
    except Exception as e:
        print(f"[Checkout] Exception in create_checkout_session: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/payment/handle-success', methods=['POST'])
def handle_payment_success():
    """Handle successful Stripe payment and update user subscription"""
    try:
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'error': 'User ID required'}), 401
        
        data = request.get_json()
        session_id = data.get('session_id')
        
        if not session_id:
            return jsonify({'error': 'Session ID required'}), 400
        
        # Retrieve the Stripe session to get payment details
        session = stripe_manager.get_checkout_session(session_id)
        if not session:
            return jsonify({'error': 'Invalid session'}), 400
        
        # Extract subscription details from the session
        price_id = session.line_items.data[0].price.id if session.line_items.data else None
        
        # Map price IDs to tiers
        if price_id == 'price_1RjNTOH4uz8ORv1eFcE6rsYO':
            tier_id = 'basic'
            max_sessions = 4
            max_participants = 10
        elif price_id == 'price_1RjNTPH4uz8ORv1ebu0u3XmY':
            tier_id = 'pro'
            max_sessions = 999999  # Unlimited
            max_participants = 999999  # Unlimited
        else:
            return jsonify({'error': 'Unknown price ID'}), 400
        
        # Update user subscription in database using the database manager
        # This ensures both users and user_subscriptions tables are updated
        success = db_manager.update_user_subscription(
            user_id=user_id,
            tier=tier_id,
            status='active',
            stripe_subscription_id=session.subscription,
            stripe_price_id=price_id
        )
        
        # Also update the users table with session limits
        with db_manager.engine.connect() as conn:
            query = text("""
                UPDATE users SET 
                    subscription_tier = :tier,
                    subscription_status = 'active',
                    stripe_price_id = :price_id,
                    max_sessions_per_month = :max_sessions,
                    max_participants_per_session = :max_participants,
                    sessions_used_this_month = 0,
                    stripe_subscription_id = :subscription_id
                WHERE id = :user_id
            """)
            
            conn.execute(query, {
                'tier': tier_id,
                'price_id': price_id,
                'max_sessions': max_sessions,
                'max_participants': max_participants,
                'subscription_id': session.subscription,
                'user_id': user_id
            })
            conn.commit()
        
        # Also update user_subscriptions table (create if doesn't exist)
        with db_manager.engine.connect() as conn:
            # Check if record exists
            check_query = text("SELECT user_id FROM user_subscriptions WHERE user_id = :user_id")
            exists = conn.execute(check_query, {'user_id': user_id}).fetchone()
            
            if exists:
                # Update existing record
                query = text("""
                    UPDATE user_subscriptions SET
                        tier = :tier,
                        status = 'active',
                        max_sessions_per_month = :max_sessions,
                        max_participants_per_session = :max_participants,
                        sessions_used_this_month = 0,
                        stripe_subscription_id = :subscription_id,
                        stripe_price_id = :price_id,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = :user_id
                """)
                conn.execute(query, {
                    'tier': tier_id,
                    'max_sessions': max_sessions,
                    'max_participants': max_participants,
                    'subscription_id': session.subscription,
                    'price_id': price_id,
                    'user_id': user_id
                })
                print(f"[Payment Success] Updated existing user_subscriptions record")
            else:
                # Create new record
                import uuid
                query = text("""
                    INSERT INTO user_subscriptions (
                        id, user_id, tier, status,
                        max_sessions_per_month, max_participants_per_session,
                        sessions_used_this_month,
                        stripe_subscription_id, stripe_price_id,
                        current_period_start, current_period_end,
                        created_at, updated_at
                    )
                    VALUES (
                        :id, :user_id, :tier, 'active',
                        :max_sessions, :max_participants, 0,
                        :subscription_id, :price_id,
                        CURRENT_TIMESTAMP, datetime(CURRENT_TIMESTAMP, '+1 month'),
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                """)
                conn.execute(query, {
                    'id': str(uuid.uuid4()),
                    'user_id': user_id,
                    'tier': tier_id,
                    'max_sessions': max_sessions,
                    'max_participants': max_participants,
                    'subscription_id': session.subscription,
                    'price_id': price_id
                })
                print(f"[Payment Success] Created new user_subscriptions record")
            
            conn.commit()
        
        print(f"[Payment Success] Successfully updated user {user_id} to {tier_id} tier")
        print(f"[Payment Success] Updated subscription limits: {max_sessions} sessions, {max_participants} participants")
        return jsonify({
            'success': True, 
            'message': f'Subscription updated to {tier_id}',
            'tier': tier_id,
            'max_sessions': max_sessions,
            'max_participants': max_participants
        })
        
    except Exception as e:
        print(f"Payment success handling error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/payment/simulate-success', methods=['POST'])
def simulate_payment_success():
    """Simulate successful payment for development (remove in production)"""
    try:
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'error': 'User ID required'}), 401
        
        data = request.get_json()
        tier_id = data.get('tier_id')
        
        if tier_id not in ['basic', 'pro']:
            return jsonify({'error': 'Invalid tier'}), 400
        
        # Update user subscription directly
        with db_manager.engine.connect() as conn:
            # Set subscription details based on tier
            if tier_id == 'basic':
                max_sessions = 4
                max_participants = 10
                price_id = 'price_1RjNTOH4uz8ORv1eFcE6rsYO'
            else:  # pro
                max_sessions = 999999  # Unlimited
                max_participants = 999999  # Unlimited
                price_id = 'price_1RjNTPH4uz8ORv1ebu0u3XmY'
            
            query = text("""
                UPDATE users SET 
                    subscription_tier = :tier,
                    subscription_status = 'active',
                    stripe_price_id = :price_id,
                    max_sessions_per_month = :max_sessions,
                    max_participants_per_session = :max_participants,
                    sessions_used_this_month = 0
                WHERE id = :user_id
            """)
            
            conn.execute(query, {
                'tier': tier_id,
                'price_id': price_id,
                'max_sessions': max_sessions,
                'max_participants': max_participants,
                'user_id': user_id
            })
            conn.commit()
        
        print(f"Successfully updated user {user_id} to {tier_id} tier")
        return jsonify({'success': True, 'message': f'Subscription updated to {tier_id}'})
        
    except Exception as e:
        print(f"Simulate payment error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/payment/cancel-subscription', methods=['POST'])
def cancel_subscription():
    """Cancel user's subscription at period end"""
    try:
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'error': 'User ID required'}), 401
        
        # Get user's subscription
        subscription = db_manager.get_user_subscription(user_id)
        if not subscription or not subscription.get('stripe_subscription_id'):
            return jsonify({'error': 'No active subscription found'}), 404
        
        # Cancel subscription in Stripe
        stripe_subscription = stripe_manager.cancel_subscription(
            subscription['stripe_subscription_id']
        )
        
        if stripe_subscription:
            # Update database
            db_manager.update_subscription_cancellation(user_id, True)
            return jsonify({
                'success': True,
                'message': 'Subscription will be cancelled at the end of the current period'
            })
        else:
            return jsonify({'error': 'Failed to cancel subscription'}), 500
            
    except Exception as e:
        print(f"Cancel subscription error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/payment/reactivate-subscription', methods=['POST'])
def reactivate_subscription():
    """Reactivate a cancelled subscription"""
    try:
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'error': 'User ID required'}), 401
        
        # Get user's subscription
        subscription = db_manager.get_user_subscription(user_id)
        if not subscription or not subscription.get('stripe_subscription_id'):
            return jsonify({'error': 'No subscription found'}), 404
        
        # Reactivate subscription in Stripe
        stripe_subscription = stripe_manager.reactivate_subscription(
            subscription['stripe_subscription_id']
        )
        
        if stripe_subscription:
            # Update database
            db_manager.update_subscription_cancellation(user_id, False)
            return jsonify({
                'success': True,
                'message': 'Subscription has been reactivated'
            })
        else:
            return jsonify({'error': 'Failed to reactivate subscription'}), 500
            
    except Exception as e:
        print(f"Reactivate subscription error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/payment/webhook', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhook events"""
    try:
        payload = request.get_data()
        sig_header = request.headers.get('Stripe-Signature')
        
        event = stripe_manager.handle_webhook(payload, sig_header)
        if not event:
            return jsonify({'error': 'Invalid webhook'}), 400
        
        # Handle different event types
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            customer_id = session.get('customer')
            
            # Find user by Stripe customer ID
            user = db_manager.get_user_by_stripe_customer(customer_id)
            if user:
                # Get subscription details
                subscription_id = session.get('subscription')
                if subscription_id:
                    stripe_subscription = stripe_manager.get_subscription(subscription_id)
                    if stripe_subscription:
                        # Update user's subscription in database
                        price_id = stripe_subscription.items.data[0].price.id
                        tier = 'basic' if 'basic' in price_id else 'pro'
                        
                        db_manager.update_user_subscription_stripe(
                            user['id'], 
                            tier,
                            subscription_id,
                            price_id,
                            'active'
                        )
        
        elif event['type'] == 'invoice.payment_succeeded':
            # Renew subscription period
            invoice = event['data']['object']
            subscription_id = invoice.get('subscription')
            if subscription_id:
                user = db_manager.get_user_by_stripe_subscription(subscription_id)
                if user:
                    # Reset monthly usage counter
                    db_manager.reset_monthly_usage(user['id'])
        
        elif event['type'] == 'customer.subscription.updated':
            subscription = event['data']['object']
            user = db_manager.get_user_by_stripe_subscription(subscription['id'])
            if user:
                status = subscription.get('status', 'active')
                cancel_at_period_end = subscription.get('cancel_at_period_end', False)
                
                db_manager.update_subscription_status(
                    user['id'], 
                    status, 
                    cancel_at_period_end
                )
        
        return jsonify({'received': True})
        
    except Exception as e:
        print(f"Webhook error: {e}")
        return jsonify({'error': str(e)}), 500

# Health check endpoint
@app.route('/api/health')
def health_check():
    """Health check endpoint for monitoring"""
    db_status = 'connected' if db_manager.engine else 'disconnected'
    return jsonify({
        'status': 'ok', 
        'database': db_status,
        'timestamp': datetime.now().isoformat()
    })

# Serve React app for deployment
@app.route('/')
def serve_react_app():
    """Serve the React app's index.html"""
    try:
        return send_file('ideaflow-react/dist/index.html')
    except:
        # Fallback if build doesn't exist
        return jsonify({'message': 'IdeaFlow API Server', 'status': 'running'}), 200

@app.route('/api/sessions/<session_id>/delete', methods=['DELETE'])
@require_auth
@require_facilitator
def delete_session(session_id):
    """Delete a session and all related data"""
    try:
        facilitator_id = request.user_id
        
        # Delete the session
        success = db_manager.delete_session(session_id, facilitator_id)
        
        if success:
            # Emit real-time update to all users
            socketio.emit('session_deleted', {'session_id': session_id}, namespace='/')
            return jsonify({'message': 'Session deleted successfully'}), 200
        else:
            return jsonify({'error': 'Failed to delete session or session not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sessions/<session_id>/join-control', methods=['POST'])
@require_auth
@require_facilitator
def control_session_joining(session_id):
    """Enable or disable participant joining for a session"""
    try:
        facilitator_id = request.user_id
        data = request.get_json()
        join_enabled = data.get('join_enabled', True)
        
        # Update the session join status
        success = db_manager.set_session_join_enabled(session_id, facilitator_id, join_enabled)
        
        if success:
            # Emit real-time update to all users in the session
            socketio.emit('join_status_changed', {
                'session_id': session_id,
                'join_enabled': join_enabled
            }, room=f'session_{session_id}')
            
            return jsonify({
                'message': f'Participant joining {"enabled" if join_enabled else "disabled"} successfully',
                'join_enabled': join_enabled
            }), 200
        else:
            return jsonify({'error': 'Failed to update session or session not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/<path:path>')
def serve_static_files(path):
    """Serve static files from React build"""
    try:
        return send_from_directory('ideaflow-react/dist', path)
    except:
        # For client-side routing, serve index.html for unknown routes
        try:
            return send_file('ideaflow-react/dist/index.html')
        except:
            return jsonify({'error': 'React build not found'}), 404

if __name__ == '__main__':
    # Auto-detect deployment vs development
    port = int(os.environ.get('PORT', 5000))  # Default to 5000 for deployment
    debug_mode = os.environ.get('FLASK_ENV') != 'production'
    
    # If running in development mode, use port 8000 to avoid conflicts
    if debug_mode and port == 5000:
        port = 8000
    
    socketio.run(app, host='0.0.0.0', port=port, debug=debug_mode, use_reloader=False, log_output=True)