"""
PostgreSQL Database manager for the ideation platform with user authentication.
"""

import os
import uuid
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import hashlib

class PostgresDBManager:
    """
    PostgreSQL database manager for the ideation platform.
    Handles all database operations including user authentication and idea attribution.
    """
    def __init__(self):
        # Use SQLite for local development - use absolute path to avoid directory issues
        database_url = os.getenv('DATABASE_URL', 'sqlite:///ideaflow.db')
        if database_url.startswith('sqlite:///'):
            # Convert relative path to absolute path
            db_path = database_url.replace('sqlite:///', '')
            if not os.path.isabs(db_path):
                # Get the directory where this script is located
                script_dir = os.path.dirname(os.path.abspath(__file__))
                # Go up one level to the project root
                project_root = os.path.dirname(script_dir)
                db_path = os.path.join(project_root, db_path)
            database_url = f'sqlite:///{db_path}'
        print(f"Using SQLite database: {database_url}")
        self.database_url = database_url
        
        try:
            self.engine = create_engine(self.database_url, pool_pre_ping=True, pool_recycle=300)
            self.Session = sessionmaker(bind=self.engine)
            self.initialize_db()
            print(f"Database initialized successfully")
        except Exception as e:
            print(f"Database connection failed: {e}")
            self.engine = None
            self.Session = None
    
    def get_connection(self):
        """Create and return a database connection"""
        if not self.engine:
            return None
        try:
            return self.engine.connect()
        except Exception as e:
            print(f"Database connection failed: {e}")
            return None
    
    def initialize_db(self):
        """Initialize database tables if they don't exist"""
        if not self.engine:
            return
        try:
            with self.engine.connect() as conn:
                # Users table for authentication with subscription management
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS users (
                        id VARCHAR(36) PRIMARY KEY,
                        username VARCHAR(100) UNIQUE NOT NULL,
                        password_hash VARCHAR(64) NOT NULL,
                        display_name VARCHAR(100) NOT NULL,
                        role VARCHAR(20) DEFAULT 'participant',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        subscription_tier VARCHAR(20) DEFAULT 'free',
                        subscription_status VARCHAR(20) DEFAULT 'active',
                        max_sessions_per_month INTEGER DEFAULT 1,
                        max_participants_per_session INTEGER DEFAULT 5,
                        sessions_used_this_month INTEGER DEFAULT 0,
                        stripe_customer_id VARCHAR(100),
                        stripe_subscription_id VARCHAR(100),
                        stripe_price_id VARCHAR(100),
                        cancel_at_period_end BOOLEAN DEFAULT FALSE
                    )
                """))
                
                # Sessions table
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS sessions (
                        id VARCHAR(36) PRIMARY KEY,
                        name VARCHAR(200) NOT NULL,
                        question TEXT NOT NULL,
                        facilitator_id VARCHAR(36) NOT NULL,
                        facilitator_name VARCHAR(100) NOT NULL,
                        current_phase INTEGER DEFAULT 0,
                        idea_phase_time INTEGER DEFAULT 600,
                        review_phase_time INTEGER DEFAULT 300,
                        voting_phase_time INTEGER DEFAULT 300,
                        analysis_phase_time INTEGER DEFAULT 300,
                        action_phase_time INTEGER DEFAULT 600,
                        votes_per_participant INTEGER DEFAULT 5,
                        max_votes_per_idea INTEGER DEFAULT 3,
                        max_participants INTEGER DEFAULT 10,
                        status VARCHAR(20) DEFAULT 'active',
                        round_number INTEGER DEFAULT 1,
                        iterative_prompt TEXT,
                        join_enabled BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (facilitator_id) REFERENCES users(id)
                    )
                """))
                
                # Participants table
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS participants (
                        id VARCHAR(36) PRIMARY KEY,
                        session_id VARCHAR(36) NOT NULL,
                        user_id VARCHAR(36) NOT NULL,
                        name VARCHAR(100) NOT NULL,
                        is_facilitator BOOLEAN DEFAULT FALSE,
                        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (session_id) REFERENCES sessions(id),
                        FOREIGN KEY (user_id) REFERENCES users(id),
                        UNIQUE(session_id, user_id)
                    )
                """))
                
                # Ideas table with author attribution (no foreign key on author_id to allow participant submissions)
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS ideas (
                        id VARCHAR(36) PRIMARY KEY,
                        session_id VARCHAR(36) NOT NULL,
                        content TEXT NOT NULL,
                        author_id VARCHAR(36) NOT NULL,
                        author_name VARCHAR(100) NOT NULL,
                        theme_id VARCHAR(36),
                        round_number INTEGER DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (session_id) REFERENCES sessions(id)
                    )
                """))
                
                # Remove foreign key constraint if it exists (for migration)
                try:
                    conn.execute(text("ALTER TABLE ideas DROP CONSTRAINT IF EXISTS ideas_author_id_fkey;"))
                    conn.commit()
                except Exception:
                    pass  # Constraint may not exist
                
                # Add round_number column to existing ideas table if it doesn't exist
                try:
                    conn.execute(text("ALTER TABLE ideas ADD COLUMN round_number INTEGER DEFAULT 1;"))
                    conn.commit()
                except Exception:
                    pass  # Column may already exist
                
                # Add join_enabled column to existing sessions table if it doesn't exist
                try:
                    conn.execute(text("ALTER TABLE sessions ADD COLUMN join_enabled BOOLEAN DEFAULT TRUE;"))
                    conn.commit()
                except Exception:
                    pass  # Column may already exist
                
                # Themes table for AI clustering
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS themes (
                        id VARCHAR(36) PRIMARY KEY,
                        session_id VARCHAR(36) NOT NULL,
                        name VARCHAR(255) NOT NULL,
                        description TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (session_id) REFERENCES sessions(id)
                    )
                """))
                
                # Votes table (no foreign key on voter_id to allow participant voting)
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS votes (
                        id VARCHAR(36) PRIMARY KEY,
                        session_id VARCHAR(36) NOT NULL,
                        idea_id VARCHAR(36) NOT NULL,
                        voter_id VARCHAR(36) NOT NULL,
                        points INTEGER NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (session_id) REFERENCES sessions(id),
                        FOREIGN KEY (idea_id) REFERENCES ideas(id),
                        UNIQUE(idea_id, voter_id)
                    )
                """))
                
                # Remove foreign key constraint if it exists (for migration)
                try:
                    conn.execute(text("ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_voter_id_fkey;"))
                    conn.commit()
                except Exception:
                    pass  # Constraint may not exist
                
                # Themes table
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS themes (
                        id VARCHAR(36) PRIMARY KEY,
                        session_id VARCHAR(36) NOT NULL,
                        name VARCHAR(200) NOT NULL,
                        description TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (session_id) REFERENCES sessions(id)
                    )
                """))
                
                # Action items table
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS action_items (
                        id VARCHAR(36) PRIMARY KEY,
                        session_id VARCHAR(36) NOT NULL,
                        theme_id VARCHAR(36),
                        description TEXT NOT NULL,
                        assignee VARCHAR(100),
                        due_date DATE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (session_id) REFERENCES sessions(id),
                        FOREIGN KEY (theme_id) REFERENCES themes(id)
                    )
                """))
                
                # Session timers table for persistent timer state
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS session_timers (
                        session_id VARCHAR(36) PRIMARY KEY,
                        duration INTEGER NOT NULL,
                        remaining INTEGER NOT NULL,
                        is_running BOOLEAN DEFAULT FALSE,
                        started_at TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
                    )
                """))
                
                # User subscriptions table - Enhanced for Stripe integration
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS user_subscriptions (
                        id VARCHAR(36) PRIMARY KEY,
                        user_id VARCHAR(36) NOT NULL,
                        tier VARCHAR(20) DEFAULT 'basic',
                        status VARCHAR(20) DEFAULT 'active',
                        sessions_used_this_month INTEGER DEFAULT 0,
                        max_sessions_per_month INTEGER DEFAULT 4,
                        max_participants_per_session INTEGER DEFAULT 10,
                        current_period_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        current_period_end TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        stripe_customer_id VARCHAR(100),
                        stripe_subscription_id VARCHAR(100),
                        stripe_price_id VARCHAR(100),
                        cancel_at_period_end BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id),
                        UNIQUE(user_id)
                    )
                """))
                
                # Add missing columns to existing tables if they don't exist (SQLite compatible)
                try:
                    # Try to add columns - will fail silently if they exist (SQLite limitation)
                    try:
                        conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'participant'"))
                    except:
                        pass
                    try:
                        conn.execute(text("ALTER TABLE sessions ADD COLUMN max_participants INTEGER DEFAULT 10"))
                    except:
                        pass
                    try:
                        conn.execute(text("ALTER TABLE sessions ADD COLUMN status VARCHAR(20) DEFAULT 'active'"))
                    except:
                        pass
                    try:
                        conn.execute(text("ALTER TABLE sessions ADD COLUMN round_number INTEGER DEFAULT 1"))
                    except:
                        pass
                    try:
                        conn.execute(text("ALTER TABLE sessions ADD COLUMN iterative_prompt TEXT"))
                    except:
                        pass
                    try:
                        conn.execute(text("ALTER TABLE ideas ADD COLUMN round_number INTEGER DEFAULT 1"))
                    except:
                        pass
                    
                    # Enhance user_subscriptions table with new columns (SQLite compatible)
                    try:
                        conn.execute(text("ALTER TABLE user_subscriptions ADD COLUMN status VARCHAR(20) DEFAULT 'active'"))
                    except:
                        pass
                    try:
                        conn.execute(text("ALTER TABLE user_subscriptions ADD COLUMN sessions_used_this_month INTEGER DEFAULT 0"))
                    except:
                        pass
                    try:
                        conn.execute(text("ALTER TABLE user_subscriptions ADD COLUMN max_sessions_per_month INTEGER DEFAULT 4"))
                    except:
                        pass
                    try:
                        conn.execute(text("ALTER TABLE user_subscriptions ADD COLUMN max_participants_per_session INTEGER DEFAULT 10"))
                    except:
                        pass
                    try:
                        conn.execute(text("ALTER TABLE user_subscriptions ADD COLUMN stripe_price_id VARCHAR(100)"))
                    except:
                        pass
                    try:
                        conn.execute(text("ALTER TABLE user_subscriptions ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT FALSE"))
                    except:
                        pass
                except Exception as e:
                    print(f"Note: Columns may already exist: {e}")
                
                conn.commit()
                
        except Exception as e:
            print(f"Failed to initialize database: {e}")
    
    def hash_password(self, password):
        """Hash a password using SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def create_user(self, username, password, display_name):
        """Create a new user account"""
        if not self.engine:
            return None
        try:
            with self.engine.connect() as conn:
                user_id = str(uuid.uuid4())
                password_hash = self.hash_password(password)
                
                conn.execute(text("""
                    INSERT INTO users (id, username, password_hash, display_name)
                    VALUES (:id, :username, :password_hash, :display_name)
                """), {
                    'id': user_id,
                    'username': username,
                    'password_hash': password_hash,
                    'display_name': display_name
                })
                conn.commit()
                
                # CRITICAL: Also create user_subscriptions entry to keep both tables in sync
                self.create_user_subscription(user_id, tier='free')
                
                return user_id
        except Exception as e:
            if "UNIQUE constraint failed" in str(e) or "duplicate key" in str(e):
                return None  # Username already exists
            print(f"Failed to create user: {e}")
            return None
    
    def authenticate_user(self, username, password):
        """Authenticate a user and return user data"""
        if not self.engine:
            return None
        try:
            with self.engine.connect() as conn:
                password_hash = self.hash_password(password)
                
                result = conn.execute(text("""
                    SELECT id, username, display_name FROM users 
                    WHERE username = :username AND password_hash = :password_hash
                """), {
                    'username': username,
                    'password_hash': password_hash
                })
                
                user = result.fetchone()
                if user:
                    return {
                        'id': user[0],
                        'username': user[1],
                        'display_name': user[2]
                    }
                return None
        except Exception as e:
            print(f"Authentication failed: {e}")
            return None
    
    def get_user_by_id(self, user_id):
        """Get user data by user ID"""
        if not self.engine:
            return None
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT id, username, display_name FROM users 
                    WHERE id = :user_id
                """), {
                    'user_id': user_id
                })
                
                user = result.fetchone()
                if user:
                    return {
                        'id': user[0],
                        'username': user[1],
                        'display_name': user[2]
                    }
                return None
        except Exception as e:
            print(f"Failed to get user by ID: {e}")
            return None
    
    def create_session(self, session_data):
        """Create a new ideation session"""
        try:
            with self.engine.connect() as conn:
                # Get facilitator name for the session
                facilitator_result = conn.execute(text("""
                    SELECT display_name FROM users WHERE id = :facilitator_id
                """), {'facilitator_id': session_data['facilitator_id']})
                facilitator = facilitator_result.fetchone()
                facilitator_name = facilitator[0] if facilitator else 'Unknown'
                
                # Insert session with facilitator name
                session_data['facilitator_name'] = facilitator_name
                conn.execute(text("""
                    INSERT INTO sessions (
                        id, name, question, facilitator_id, facilitator_name,
                        current_phase, created_at, max_participants,
                        votes_per_participant, max_votes_per_idea
                    ) VALUES (
                        :id, :name, :question, :facilitator_id, :facilitator_name,
                        :current_phase, :created_at, :max_participants,
                        :votes_per_participant, :max_votes_per_idea
                    )
                """), session_data)
                
                conn.commit()
                return session_data['id']
        except Exception as e:
            print(f"Failed to create session: {e}")
            return False
    
    def get_facilitator_sessions(self, facilitator_id):
        """Get all sessions created by a specific facilitator"""
        if not self.engine:
            return []
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT id, name, question, facilitator_name, current_phase, created_at
                    FROM sessions 
                    WHERE facilitator_id = :facilitator_id
                    ORDER BY created_at DESC
                """), {'facilitator_id': facilitator_id})
                
                sessions = []
                for row in result.fetchall():
                    # In SQLite, created_at is already a string in ISO format, not a datetime object
                    created_at = row[5]
                    if created_at and hasattr(created_at, 'isoformat'):
                        # If it's a datetime object (PostgreSQL), convert it
                        created_at = created_at.isoformat()
                    # Otherwise, it's already a string (SQLite), use as-is
                    
                    sessions.append({
                        'id': row[0],
                        'title': row[1],  # Map name back to title for frontend
                        'description': row[2],  # Map question back to description for frontend
                        'facilitator_name': row[3],
                        'phase': row[4],
                        'created_at': created_at
                    })
                return sessions
        except Exception as e:
            print(f"Failed to get facilitator sessions: {e}")
            return []
    
    def authenticate_user_by_id(self, user_id):
        """Get user data by ID"""
        if not self.engine:
            return None
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT id, username, display_name FROM users 
                    WHERE id = :user_id
                """), {'user_id': user_id})
                
                user = result.fetchone()
                if user:
                    return {
                        'id': user[0],
                        'username': user[1],
                        'display_name': user[2]
                    }
                return None
        except Exception as e:
            print(f"Failed to get user by ID: {e}")
            return None
    
    def get_session(self, session_id):
        """Get session details by ID"""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT * FROM sessions WHERE id = :session_id
                """), {'session_id': session_id})
                
                row = result.fetchone()
                if row:
                    columns = result.keys()
                    return dict(zip(columns, row))
                return None
        except Exception as e:
            print(f"Failed to get session: {e}")
            return None
    
    def update_session_phase(self, session_id, phase):
        """Update the current phase of a session"""
        try:
            with self.engine.connect() as conn:
                conn.execute(text("""
                    UPDATE sessions SET current_phase = :phase WHERE id = :session_id
                """), {'phase': phase, 'session_id': session_id})
                conn.commit()
                return True
        except Exception as e:
            print(f"Failed to update session phase: {e}")
            return False
    
    def update_voting_settings(self, session_id, max_votes_per_idea=None, votes_per_participant=None):
        """Update voting configuration for a session"""
        try:
            with self.engine.connect() as conn:
                update_fields = []
                params = {'session_id': session_id}
                
                if max_votes_per_idea is not None:
                    update_fields.append("max_votes_per_idea = :max_votes_per_idea")
                    params['max_votes_per_idea'] = max_votes_per_idea
                
                if votes_per_participant is not None:
                    update_fields.append("votes_per_participant = :votes_per_participant")
                    params['votes_per_participant'] = votes_per_participant
                
                if update_fields:
                    query = f"UPDATE sessions SET {', '.join(update_fields)} WHERE id = :session_id"
                    conn.execute(text(query), params)
                    conn.commit()
                    return True
                return False
        except Exception as e:
            print(f"Failed to update voting settings: {e}")
            return False
    
    def add_participant(self, session_id, user_id, name):
        """Add a participant to a session"""
        try:
            with self.engine.connect() as conn:
                conn.execute(text("""
                    INSERT INTO participants (id, session_id, user_id, name, is_facilitator)
                    VALUES (:id, :session_id, :user_id, :name, :is_facilitator)
                """), {
                    'id': str(uuid.uuid4()),
                    'session_id': session_id,
                    'user_id': user_id,
                    'name': name,
                    'is_facilitator': False
                })
                conn.commit()
                return True
        except Exception as e:
            print(f"Failed to add participant: {e}")
            return False
    
    def add_idea(self, idea_data):
        """Add a new idea to a session"""
        try:
            import uuid
            idea_id = str(uuid.uuid4())
            # Use the round_number from idea_data if provided, otherwise get from session
            session_id = idea_data.get('session_id')
            current_round = idea_data.get('round_number')
            
            if current_round is None:
                with self.engine.connect() as conn:
                    session_query = text("SELECT round_number FROM sessions WHERE id = :session_id")
                    session_result = conn.execute(session_query, {'session_id': session_id})
                    session_row = session_result.fetchone()
                    current_round = session_row[0] if session_row else 1
            
            idea_data_with_id = {
                'id': idea_id,
                'session_id': session_id,
                'content': idea_data.get('content'),
                'author_id': idea_data.get('author_id'),
                'author_name': idea_data.get('author_name'),
                'theme_id': idea_data.get('theme_id'),
                'round_number': current_round
            }
            
            with self.engine.connect() as conn:
                conn.execute(text("""
                    INSERT INTO ideas (id, session_id, content, author_id, author_name, theme_id, round_number)
                    VALUES (:id, :session_id, :content, :author_id, :author_name, :theme_id, :round_number)
                """), idea_data_with_id)
                conn.commit()
                return idea_id
        except Exception as e:
            print(f"Failed to add idea: {e}")
            return False
    
    def get_ideas(self, session_id, include_author=False, round_number=None):
        """Get all ideas for a session, optionally including author information"""
        try:
            with self.engine.connect() as conn:
                # Determine filtering strategy based on round_number parameter
                if round_number is None:
                    # Check if this should get current round or all rounds
                    session_result = conn.execute(text("""
                        SELECT round_number FROM sessions WHERE id = :session_id
                    """), {'session_id': session_id})
                    session_row = session_result.fetchone()
                    current_round = session_row[0] if session_row else 1
                    
                    # If called from API with round_number=None, return ALL ideas (for facilitator)
                    use_round_filter = False
                else:
                    # Specific round requested
                    current_round = round_number
                    use_round_filter = True
                
                if include_author:
                    # Get ideas with author information (for facilitators)
                    if use_round_filter:
                        ideas_result = conn.execute(text("""
                            SELECT i.id, i.content, i.author_id, 
                                   COALESCE(i.author_name, u.display_name, u.username, 'Anonymous') as author_name, 
                                   i.theme_id, i.created_at, COALESCE(i.round_number, 1) as round_number
                            FROM ideas i
                            LEFT JOIN users u ON i.author_id = u.id
                            WHERE i.session_id = :session_id AND (i.round_number = :round_number OR i.round_number IS NULL)
                            ORDER BY i.round_number, i.created_at
                        """), {'session_id': session_id, 'round_number': current_round})
                    else:
                        # Get ALL ideas for facilitator with proper author names
                        ideas_result = conn.execute(text("""
                            SELECT i.id, i.content, i.author_id, 
                                   COALESCE(i.author_name, u.display_name, u.username, 'Anonymous') as author_name, 
                                   i.theme_id, i.created_at, COALESCE(i.round_number, 1) as round_number
                            FROM ideas i
                            LEFT JOIN users u ON i.author_id = u.id
                            WHERE i.session_id = :session_id
                            ORDER BY i.round_number DESC, i.created_at DESC
                        """), {'session_id': session_id})
                    
                    ideas = [dict(zip(ideas_result.keys(), row)) for row in ideas_result.fetchall()]
                    
                    # Get all participants for this session
                    participants_result = conn.execute(text("""
                        SELECT user_id, name FROM participants WHERE session_id = :session_id
                    """), {'session_id': session_id})
                    
                    participants = {row[0]: row[1] for row in participants_result.fetchall()}
                    
                    # Map real names for facilitators - ensure proper author display
                    for idea in ideas:
                        # First check if author_name is already properly set
                        if idea['author_name'] and not idea['author_name'].startswith('Participant'):
                            continue
                            
                        # Try to find participant by user_id first
                        if idea['author_id'] in participants:
                            idea['author_name'] = participants[idea['author_id']]
                        elif idea['author_id']:
                            # Try to get user display name from users table
                            user_result = conn.execute(text("""
                                SELECT display_name FROM users WHERE id = :user_id
                            """), {'user_id': idea['author_id']})
                            user_row = user_result.fetchone()
                            if user_row:
                                idea['author_name'] = user_row[0]
                    
                    return ideas
                else:
                    # Hide author info from regular participants
                    if use_round_filter:
                        result = conn.execute(text("""
                            SELECT i.id, i.content, i.theme_id, i.created_at
                            FROM ideas i
                            WHERE i.session_id = :session_id AND (i.round_number = :round_number OR i.round_number IS NULL)
                            ORDER BY i.created_at
                        """), {'session_id': session_id, 'round_number': current_round})
                    else:
                        # Get ALL ideas for participants too when explicitly requested
                        result = conn.execute(text("""
                            SELECT i.id, i.content, i.theme_id, i.created_at
                            FROM ideas i
                            WHERE i.session_id = :session_id
                            ORDER BY i.created_at
                        """), {'session_id': session_id})
                    
                    columns = result.keys()
                    return [dict(zip(columns, row)) for row in result.fetchall()]
        except Exception as e:
            print(f"Failed to get ideas: {e}")
            return []
    
    def add_vote(self, vote_data):
        """Add a vote for an idea"""
        try:
            with self.engine.connect() as conn:
                conn.execute(text("""
                    INSERT INTO votes (id, session_id, idea_id, voter_id, points)
                    VALUES (:id, :session_id, :idea_id, :voter_id, :points)
                    ON CONFLICT (idea_id, voter_id) 
                    DO UPDATE SET points = :points
                """), vote_data)
                conn.commit()
                return True
        except Exception as e:
            print(f"Failed to add vote: {e}")
            return False
    
    def upsert_vote(self, vote_data):
        """Insert or update vote for an idea with vote count"""
        try:
            with self.engine.connect() as conn:
                # First, delete existing votes for this voter and idea
                conn.execute(text("""
                    DELETE FROM votes WHERE idea_id = :idea_id AND voter_id = :voter_id
                """), {
                    'idea_id': vote_data['idea_id'],
                    'voter_id': vote_data['voter_id']
                })
                
                # If votes > 0, insert new votes (one record per vote to work around unique constraint)
                if vote_data['votes'] > 0:
                    # Insert a single vote record with the total count in points field
                    conn.execute(text("""
                        INSERT INTO votes (id, session_id, idea_id, voter_id, points, created_at)
                        VALUES (:id, :session_id, :idea_id, :voter_id, :points, CURRENT_TIMESTAMP)
                    """), {
                        'id': str(uuid.uuid4()),
                        'session_id': vote_data['session_id'],
                        'idea_id': vote_data['idea_id'],
                        'voter_id': vote_data['voter_id'],
                        'points': vote_data['votes']
                    })
                
                conn.commit()
                return True
        except Exception as e:
            print(f"Failed to upsert vote: {e}")
            return False
    
    def get_votes(self, session_id, voter_id=None):
        """Get all votes for a session, optionally filtered by voter"""
        try:
            with self.engine.connect() as conn:
                if voter_id:
                    # Get individual vote records for API vote counting
                    result = conn.execute(text("""
                        SELECT * FROM votes 
                        WHERE session_id = :session_id AND voter_id = :voter_id
                    """), {'session_id': session_id, 'voter_id': voter_id})
                else:
                    result = conn.execute(text("""
                        SELECT * FROM votes WHERE session_id = :session_id
                    """), {'session_id': session_id})
                
                columns = result.keys()
                return [dict(zip(columns, row)) for row in result.fetchall()]
        except Exception as e:
            print(f"Failed to get votes: {e}")
            return []
    
    def get_vote_results(self, session_id):
        """Get aggregated vote results for all ideas in a session"""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT i.id, i.content, COALESCE(SUM(v.points), 0) as total_points,
                           u.display_name as author_name
                    FROM ideas i
                    LEFT JOIN votes v ON i.id = v.idea_id
                    LEFT JOIN users u ON i.author_id = u.id
                    WHERE i.session_id = :session_id
                    GROUP BY i.id, i.content, u.display_name
                    ORDER BY total_points DESC
                """), {'session_id': session_id})
                
                columns = result.keys()
                return [dict(zip(columns, row)) for row in result.fetchall()]
        except Exception as e:
            print(f"Failed to get vote results: {e}")
            return []
    
    def add_theme(self, theme_data):
        """Add a new AI-generated theme"""
        try:
            with self.engine.connect() as conn:
                conn.execute(text("""
                    INSERT INTO themes (id, session_id, name, description)
                    VALUES (:id, :session_id, :name, :description)
                """), theme_data)
                conn.commit()
                return True
        except Exception as e:
            print(f"Failed to add theme: {e}")
            return False
    
    def get_themes(self, session_id):
        """Get all themes for a session"""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT * FROM themes WHERE session_id = :session_id
                """), {'session_id': session_id})
                
                columns = result.keys()
                return [dict(zip(columns, row)) for row in result.fetchall()]
        except Exception as e:
            print(f"Failed to get themes: {e}")
            return []
    
    def update_idea_theme(self, idea_id, theme_id):
        """Update the theme association for an idea"""
        try:
            with self.engine.connect() as conn:
                conn.execute(text("""
                    UPDATE ideas SET theme_id = :theme_id WHERE id = :idea_id
                """), {'theme_id': theme_id, 'idea_id': idea_id})
                conn.commit()
                return True
        except Exception as e:
            print(f"Failed to update idea theme: {e}")
            return False
    
    def get_ideas_by_theme(self, session_id):
        """Get ideas grouped by themes for a session"""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT t.id as theme_id, t.name as theme_name, 
                           i.id as idea_id, i.content, COALESCE(SUM(v.points), 0) as points
                    FROM themes t
                    LEFT JOIN ideas i ON t.id = i.theme_id
                    LEFT JOIN votes v ON i.id = v.idea_id
                    WHERE t.session_id = :session_id
                    GROUP BY t.id, t.name, i.id, i.content
                    ORDER BY t.name, points DESC
                """), {'session_id': session_id})
                
                themes = {}
                for row in result.fetchall():
                    theme_id = row[0]
                    theme_name = row[1]
                    
                    if theme_id not in themes:
                        themes[theme_id] = {
                            'name': theme_name,
                            'ideas': []
                        }
                    
                    if row[2]:  # If there's an idea
                        themes[theme_id]['ideas'].append({
                            'id': row[2],
                            'content': row[3],
                            'points': row[4]
                        })
                
                return themes
        except Exception as e:
            print(f"Failed to get ideas by theme: {e}")
            return {}
    
    def add_action_item(self, action_data):
        """Add a new action item"""
        try:
            with self.engine.connect() as conn:
                conn.execute(text("""
                    INSERT INTO action_items (id, session_id, theme_id, description, assignee, due_date)
                    VALUES (:id, :session_id, :theme_id, :description, :assignee, :due_date)
                """), action_data)
                conn.commit()
                return True
        except Exception as e:
            print(f"Failed to add action item: {e}")
            return False
    
    def get_action_items(self, session_id):
        """Get all action items for a session"""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT a.*, t.name as theme_name
                    FROM action_items a
                    LEFT JOIN themes t ON a.theme_id = t.id
                    WHERE a.session_id = :session_id
                    ORDER BY a.created_at
                """), {'session_id': session_id})
                
                columns = result.keys()
                return [dict(zip(columns, row)) for row in result.fetchall()]
        except Exception as e:
            print(f"Failed to get action items: {e}")
            return []
    
    def get_participants(self, session_id):
        """Get all participants for a session with total statistics across all rounds"""
        try:
            with self.engine.connect() as conn:
                # Get participants with idea and vote counts across ALL rounds (not filtered by round)
                result = conn.execute(text("""
                    SELECT p.*,
                           COALESCE(idea_counts.idea_count, 0) as ideas,
                           COALESCE(vote_counts.vote_count, 0) as votes_cast
                    FROM participants p
                    LEFT JOIN (
                        SELECT author_id, COUNT(*) as idea_count
                        FROM ideas 
                        WHERE session_id = :session_id
                        GROUP BY author_id
                    ) idea_counts ON p.user_id = idea_counts.author_id
                    LEFT JOIN (
                        SELECT v.voter_id, SUM(v.points) as vote_count
                        FROM votes v
                        JOIN ideas i ON v.idea_id = i.id
                        WHERE i.session_id = :session_id
                        GROUP BY v.voter_id
                    ) vote_counts ON p.user_id = vote_counts.voter_id
                    WHERE p.session_id = :session_id
                """), {'session_id': session_id})
                
                columns = result.keys()
                return [dict(zip(columns, row)) for row in result.fetchall()]
        except Exception as e:
            print(f"Failed to get participants: {e}")
            return []
    
    def get_user_subscription(self, user_id):
        """Get user's subscription details"""
        if not self.engine:
            return None
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT * FROM user_subscriptions WHERE user_id = :user_id
                """), {'user_id': user_id})
                
                row = result.fetchone()
                if row:
                    columns = result.keys()
                    return dict(zip(columns, row))
                return None
        except Exception as e:
            print(f"Failed to get user subscription: {e}")
            return None
    
    def create_user_subscription(self, user_id, tier='free'):
        """Create a new user subscription with proper tier limits"""
        try:
            # Define tier limits
            tier_limits = {
                'free': {'sessions': 1, 'participants': 5},
                'basic': {'sessions': 4, 'participants': 10},
                'pro': {'sessions': 999999, 'participants': 999999}  # Unlimited
            }
            
            limits = tier_limits.get(tier, tier_limits['free'])
            
            with self.engine.connect() as conn:
                conn.execute(text("""
                    INSERT INTO user_subscriptions (
                        id, user_id, tier, status, sessions_used_this_month,
                        max_sessions_per_month, max_participants_per_session,
                        current_period_start, current_period_end
                    )
                    VALUES (
                        :id, :user_id, :tier, 'active', 0,
                        :max_sessions, :max_participants,
                        CURRENT_TIMESTAMP, datetime(CURRENT_TIMESTAMP, '+1 month')
                    )
                    ON CONFLICT (user_id) DO UPDATE SET
                        tier = EXCLUDED.tier,
                        max_sessions_per_month = EXCLUDED.max_sessions_per_month,
                        max_participants_per_session = EXCLUDED.max_participants_per_session,
                        updated_at = CURRENT_TIMESTAMP
                """), {
                    'id': str(uuid.uuid4()),
                    'user_id': user_id,
                    'tier': tier,
                    'max_sessions': limits['sessions'],
                    'max_participants': limits['participants']
                })
                conn.commit()
                return True
        except Exception as e:
            print(f"Failed to create user subscription: {e}")
            return False
    
    def increment_user_sessions(self, user_id):
        """Increment user's session usage for current period"""
        try:
            with self.engine.connect() as conn:
                # Update user_subscriptions table
                conn.execute(text("""
                    UPDATE user_subscriptions 
                    SET sessions_used_this_month = sessions_used_this_month + 1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = :user_id
                """), {'user_id': user_id})
                
                # CRITICAL: Also update users table to keep both tables in sync
                conn.execute(text("""
                    UPDATE users 
                    SET sessions_used_this_month = sessions_used_this_month + 1
                    WHERE id = :user_id
                """), {'user_id': user_id})
                
                conn.commit()
                return True
        except Exception as e:
            print(f"Failed to increment session usage: {e}")
            return False
    
    def update_user_subscription(self, user_id, tier=None, status=None, stripe_customer_id=None, 
                                stripe_subscription_id=None, stripe_price_id=None, cancel_at_period_end=None):
        """Update user's subscription details"""
        if not self.engine:
            return False
        try:
            # Define tier limits
            tier_limits = {
                'free': {'sessions': 1, 'participants': 5},
                'basic': {'sessions': 4, 'participants': 10},
                'pro': {'sessions': 999999, 'participants': 999999}  # Unlimited
            }
            
            updates = ['updated_at = CURRENT_TIMESTAMP']
            params = {'user_id': user_id}
            
            if tier:
                limits = tier_limits.get(tier, tier_limits['free'])
                updates.extend([
                    'tier = :tier',
                    'max_sessions_per_month = :max_sessions',
                    'max_participants_per_session = :max_participants'
                ])
                params.update({
                    'tier': tier,
                    'max_sessions': limits['sessions'],
                    'max_participants': limits['participants']
                })
            
            if status:
                updates.append('status = :status')
                params['status'] = status
                
            if stripe_customer_id:
                updates.append('stripe_customer_id = :stripe_customer_id')
                params['stripe_customer_id'] = stripe_customer_id
                
            if stripe_subscription_id:
                updates.append('stripe_subscription_id = :stripe_subscription_id')
                params['stripe_subscription_id'] = stripe_subscription_id
                
            if stripe_price_id:
                updates.append('stripe_price_id = :stripe_price_id')
                params['stripe_price_id'] = stripe_price_id
                
            if cancel_at_period_end is not None:
                updates.append('cancel_at_period_end = :cancel_at_period_end')
                params['cancel_at_period_end'] = cancel_at_period_end
            
            with self.engine.connect() as conn:
                # Update user_subscriptions table
                query = f"""
                    UPDATE user_subscriptions 
                    SET {', '.join(updates)}
                    WHERE user_id = :user_id
                """
                conn.execute(text(query), params)
                
                # CRITICAL: Also update users table to keep both tables in sync
                users_updates = []
                users_params = {'user_id': user_id}
                
                if tier:
                    limits = tier_limits.get(tier, tier_limits['free'])
                    users_updates.extend([
                        'subscription_tier = :tier',
                        'max_sessions_per_month = :max_sessions',
                        'max_participants_per_session = :max_participants'
                    ])
                    users_params.update({
                        'tier': tier,
                        'max_sessions': limits['sessions'],
                        'max_participants': limits['participants']
                    })
                
                if status:
                    users_updates.append('subscription_status = :status')
                    users_params['status'] = status
                    
                if stripe_customer_id:
                    users_updates.append('stripe_customer_id = :stripe_customer_id')
                    users_params['stripe_customer_id'] = stripe_customer_id
                    
                if stripe_subscription_id:
                    users_updates.append('stripe_subscription_id = :stripe_subscription_id')
                    users_params['stripe_subscription_id'] = stripe_subscription_id
                    
                if stripe_price_id:
                    users_updates.append('stripe_price_id = :stripe_price_id')
                    users_params['stripe_price_id'] = stripe_price_id
                    
                if cancel_at_period_end is not None:
                    users_updates.append('cancel_at_period_end = :cancel_at_period_end')
                    users_params['cancel_at_period_end'] = cancel_at_period_end
                
                # Only update users table if there are fields to update
                if users_updates:
                    users_query = f"""
                        UPDATE users 
                        SET {', '.join(users_updates)}
                        WHERE id = :user_id
                    """
                    conn.execute(text(users_query), users_params)
                
                conn.commit()
                return True
        except Exception as e:
            print(f"Failed to update user subscription: {e}")
            return False
    
    def reset_monthly_usage(self, user_id):
        """Reset user's monthly session usage"""
        if not self.engine:
            return False
        try:
            with self.engine.connect() as conn:
                # Update user_subscriptions table
                conn.execute(text("""
                    UPDATE user_subscriptions 
                    SET sessions_used_this_month = 0,
                        current_period_start = CURRENT_TIMESTAMP,
                        current_period_end = datetime(CURRENT_TIMESTAMP, '+1 month'),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = :user_id
                """), {'user_id': user_id})
                
                # CRITICAL: Also update users table to keep both tables in sync
                conn.execute(text("""
                    UPDATE users 
                    SET sessions_used_this_month = 0
                    WHERE id = :user_id
                """), {'user_id': user_id})
                
                conn.commit()
                return True
        except Exception as e:
            print(f"Failed to reset monthly usage: {e}")
            return False
    
    def check_session_limit(self, user_id):
        """Check if user can create a new session based on their plan"""
        try:
            subscription = self.get_user_subscription(user_id)
            if not subscription:
                return False, "No subscription found"
            
            # Check if current period has expired
            from datetime import datetime
            current_time = datetime.now()
            period_end = subscription.get('current_period_end')
            
            # Handle SQLite datetime strings
            if period_end:
                if isinstance(period_end, str):
                    try:
                        period_end = datetime.fromisoformat(period_end.replace('Z', '+00:00'))
                    except:
                        period_end = None
                
                if period_end and current_time > period_end:
                    # Reset usage for new period
                    self.reset_monthly_usage(user_id)
                    subscription = self.get_user_subscription(user_id)  # Refresh data
            
            sessions_used = subscription.get('sessions_used_this_month', 0)
            max_sessions = subscription.get('max_sessions_per_month', 4)
            
            if sessions_used >= max_sessions:
                return False, f"Monthly session limit reached ({sessions_used}/{max_sessions})"
            
            return True, f"Sessions available: {max_sessions - sessions_used}"
            
        except Exception as e:
            print(f"Failed to check session limit: {e}")
            return False, "Error checking session limit"
    
    def check_participant_limit(self, user_id, current_participants):
        """Check if user can add more participants based on their plan"""
        try:
            subscription = self.get_user_subscription(user_id)
            if not subscription:
                return False, "No subscription found"
            
            max_participants = subscription.get('max_participants_per_session', 5)
            
            if current_participants >= max_participants:
                return False, f"Participant limit reached ({current_participants}/{max_participants})"
            
            return True, f"Can add {max_participants - current_participants} more participants"
            
        except Exception as e:
            print(f"Failed to check participant limit: {e}")
            return False, "Error checking participant limit"
    
    def grandfather_existing_users(self):
        """Grandfather existing users with basic plan"""
        try:
            with self.engine.connect() as conn:
                # Get all users without subscriptions
                result = conn.execute(text("""
                    SELECT u.id, u.username 
                    FROM users u 
                    LEFT JOIN user_subscriptions s ON u.id = s.user_id
                    WHERE s.user_id IS NULL
                """))
                
                users_without_subscription = result.fetchall()
                grandfathered_count = 0
                
                for user_row in users_without_subscription:
                    user_id = user_row[0]
                    username = user_row[1]
                    
                    # Create basic subscription for existing users
                    if self.create_user_subscription(user_id, 'basic'):
                        print(f"Grandfathered user: {username} -> Basic Plan")
                        grandfathered_count += 1
                
                return grandfathered_count
                
        except Exception as e:
            print(f"Failed to grandfather existing users: {e}")
            return 0
    
    def get_user_by_id(self, user_id):
        """Get user by ID for Stripe integration"""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT * FROM users WHERE id = :user_id
                """), {'user_id': user_id})
                
                row = result.fetchone()
                if row:
                    columns = result.keys()
                    return dict(zip(columns, row))
                return None
        except Exception as e:
            print(f"Failed to get user by ID: {e}")
            return None
    
    def update_user_stripe_customer(self, user_id, stripe_customer_id):
        """Update user with Stripe customer ID"""
        try:
            with self.engine.connect() as conn:
                conn.execute(text("""
                    UPDATE users SET stripe_customer_id = :stripe_customer_id 
                    WHERE id = :user_id
                """), {'user_id': user_id, 'stripe_customer_id': stripe_customer_id})
                conn.commit()
                return True
        except Exception as e:
            print(f"Failed to update user Stripe customer: {e}")
            return False
    
    def get_user_by_stripe_customer(self, stripe_customer_id):
        """Get user by Stripe customer ID"""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT * FROM users WHERE stripe_customer_id = :stripe_customer_id
                """), {'stripe_customer_id': stripe_customer_id})
                
                row = result.fetchone()
                if row:
                    columns = result.keys()
                    return dict(zip(columns, row))
                return None
        except Exception as e:
            print(f"Failed to get user by Stripe customer: {e}")
            return None
    
    def get_user_by_stripe_subscription(self, stripe_subscription_id):
        """Get user by Stripe subscription ID"""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT u.* FROM users u
                    JOIN user_subscriptions s ON u.id = s.user_id
                    WHERE s.stripe_subscription_id = :stripe_subscription_id
                """), {'stripe_subscription_id': stripe_subscription_id})
                
                row = result.fetchone()
                if row:
                    columns = result.keys()
                    return dict(zip(columns, row))
                return None
        except Exception as e:
            print(f"Failed to get user by Stripe subscription: {e}")
            return None
    
    def update_user_subscription_stripe(self, user_id, tier, stripe_subscription_id, stripe_price_id, status):
        """Update user subscription with Stripe details"""
        return self.update_user_subscription(
            user_id=user_id,
            tier=tier,
            status=status,
            stripe_subscription_id=stripe_subscription_id,
            stripe_price_id=stripe_price_id
        )
    
    def update_subscription_cancellation(self, user_id, cancel_at_period_end):
        """Update subscription cancellation status"""
        return self.update_user_subscription(
            user_id=user_id,
            cancel_at_period_end=cancel_at_period_end
        )
    
    def update_subscription_status(self, user_id, status, cancel_at_period_end=None):
        """Update subscription status and cancellation flag"""
        return self.update_user_subscription(
            user_id=user_id,
            status=status,
            cancel_at_period_end=cancel_at_period_end
        )
    
    def get_user_role(self, user_id):
        """Get user role from database"""
        if not self.engine:
            return 'participant'
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT role FROM users WHERE id = :user_id
                """), {'user_id': user_id})
                
                user = result.fetchone()
                if user:
                    return user[0] or 'participant'
                return 'participant'
        except Exception as e:
            print(f"Failed to get user role: {e}")
            return 'participant'
    
    def set_user_role(self, user_id, role):
        """Set user role in database"""
        if not self.engine:
            return False
        try:
            with self.engine.connect() as conn:
                conn.execute(text("""
                    UPDATE users SET role = :role WHERE id = :user_id
                """), {'user_id': user_id, 'role': role})
                conn.commit()
                return True
        except Exception as e:
            print(f"Failed to set user role: {e}")
            return False
    
    def save_timer_state(self, session_id, timer_data):
        """Save timer state to database"""
        if not self.engine:
            return False
        try:
            with self.engine.connect() as conn:
                conn.execute(text("""
                    INSERT INTO session_timers (session_id, duration, remaining, is_running, started_at)
                    VALUES (:session_id, :duration, :remaining, :is_running, :started_at)
                    ON CONFLICT (session_id) DO UPDATE SET
                        remaining = EXCLUDED.remaining,
                        is_running = EXCLUDED.is_running,
                        updated_at = CURRENT_TIMESTAMP
                """), {**timer_data, 'session_id': session_id})
                conn.commit()
                return True
        except Exception as e:
            print(f"Failed to save timer state: {e}")
            return False
    
    def get_timer_state(self, session_id):
        """Get timer state from database"""
        if not self.engine:
            return None
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT duration, remaining, is_running, started_at, updated_at
                    FROM session_timers WHERE session_id = :session_id
                """), {'session_id': session_id})
                
                row = result.fetchone()
                if row:
                    return {
                        'duration': row[0],
                        'remaining': row[1],
                        'is_running': row[2],
                        'started_at': row[3],
                        'updated_at': row[4]
                    }
                return None
        except Exception as e:
            print(f"Failed to get timer state: {e}")
            return None
    
    def delete_timer_state(self, session_id):
        """Delete timer state from database"""
        if not self.engine:
            return False
        try:
            with self.engine.connect() as conn:
                conn.execute(text("""
                    DELETE FROM session_timers WHERE session_id = :session_id
                """), {'session_id': session_id})
                conn.commit()
                return True
        except Exception as e:
            print(f"Failed to delete timer state: {e}")
            return False
    
    def delete_session(self, session_id, facilitator_id):
        """Delete a session and all related data"""
        if not self.engine:
            return False
        try:
            with self.engine.connect() as conn:
                # First verify the session belongs to the facilitator
                session_check = conn.execute(text("""
                    SELECT id FROM sessions WHERE id = :session_id AND facilitator_id = :facilitator_id
                """), {'session_id': session_id, 'facilitator_id': facilitator_id})
                
                if not session_check.fetchone():
                    return False  # Session doesn't exist or doesn't belong to facilitator
                
                # Delete all related data in the correct order (due to foreign key constraints)
                # Delete votes first
                conn.execute(text("DELETE FROM votes WHERE idea_id IN (SELECT id FROM ideas WHERE session_id = :session_id)"), {'session_id': session_id})
                
                # Delete ideas
                conn.execute(text("DELETE FROM ideas WHERE session_id = :session_id"), {'session_id': session_id})
                
                # Delete themes
                conn.execute(text("DELETE FROM themes WHERE session_id = :session_id"), {'session_id': session_id})
                
                # Delete participants
                conn.execute(text("DELETE FROM participants WHERE session_id = :session_id"), {'session_id': session_id})
                
                # Delete timer state
                conn.execute(text("DELETE FROM session_timers WHERE session_id = :session_id"), {'session_id': session_id})
                
                # Finally delete the session
                conn.execute(text("DELETE FROM sessions WHERE id = :session_id"), {'session_id': session_id})
                
                conn.commit()
                return True
        except Exception as e:
            print(f"Failed to delete session: {e}")
            return False
    
    def set_session_join_enabled(self, session_id, facilitator_id, join_enabled):
        """Enable or disable participant joining for a session"""
        if not self.engine:
            return False
        try:
            with self.engine.connect() as conn:
                # Verify the session belongs to the facilitator
                session_check = conn.execute(text("""
                    SELECT id FROM sessions WHERE id = :session_id AND facilitator_id = :facilitator_id
                """), {'session_id': session_id, 'facilitator_id': facilitator_id})
                
                if not session_check.fetchone():
                    return False  # Session doesn't exist or doesn't belong to facilitator
                
                # Update the join_enabled status
                conn.execute(text("""
                    UPDATE sessions SET join_enabled = :join_enabled WHERE id = :session_id
                """), {'session_id': session_id, 'join_enabled': join_enabled})
                
                conn.commit()
                return True
        except Exception as e:
            print(f"Failed to set session join enabled: {e}")
            return False