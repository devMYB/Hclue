# IdeaFlow Collaborative Ideation Platform
## Technical Specification for Angular + FastAPI Implementation

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technical Architecture](#technical-architecture)
3. [Database Schema](#database-schema)
4. [Session Workflow](#session-workflow)
5. [Core Features](#core-features)
6. [API Specification](#api-specification)
7. [Frontend Requirements](#frontend-requirements)
8. [Backend Requirements](#backend-requirements)
9. [Security & Authentication](#security--authentication)
10. [Real-time Features](#real-time-features)
11. [AI Integration](#ai-integration)
12. [UI/UX Guidelines](#uiux-guidelines)
13. [Performance Requirements](#performance-requirements)
14. [Testing Strategy](#testing-strategy)
15. [Deployment Considerations](#deployment-considerations)

---

## Project Overview

### Purpose
IdeaFlow is a web-based collaborative brainstorming platform that guides teams through structured ideation sessions. The platform facilitates real-time idea submission, voting, and AI-powered analysis to help teams generate, evaluate, and prioritize innovative solutions.

### Key Objectives
- Enable structured collaborative brainstorming sessions
- Provide real-time collaboration capabilities
- Implement AI-powered idea clustering and theme generation
- Maintain idea attribution visible only to facilitators
- Support configurable session parameters and timing
- Deliver intuitive user experience for both facilitators and participants

### Target Users
- **Primary:** Corporate teams, design thinking facilitators, innovation managers
- **Secondary:** Educators, consultants, project managers conducting ideation sessions

---

## Technical Architecture

### Technology Stack
- **Frontend Framework:** Angular 17+ with TypeScript
- **Backend Framework:** FastAPI (Python 3.11+)
- **Database:** PostgreSQL (Supabase integration)
- **Real-time Communication:** WebSockets
- **Authentication:** JWT tokens with secure session management
- **AI/NLP:** scikit-learn, spaCy for text clustering
- **State Management:** NgRx (recommended)
- **Styling:** Angular Material or Tailwind CSS

### Architecture Pattern
- **Frontend:** Single Page Application (SPA) with component-based architecture
- **Backend:** RESTful API with WebSocket endpoints for real-time features
- **Database:** Relational database with proper normalization
- **Communication:** HTTP/HTTPS for API calls, WebSocket for real-time updates

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(64) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (facilitator_id) REFERENCES users(id)
);
```

### Participants Table
```sql
CREATE TABLE participants (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_facilitator BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(session_id, user_id)
);
```

### Ideas Table
```sql
CREATE TABLE ideas (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    author_id VARCHAR(36) NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    theme_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (author_id) REFERENCES users(id)
);
```

### Votes Table
```sql
CREATE TABLE votes (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    idea_id VARCHAR(36) NOT NULL,
    voter_id VARCHAR(36) NOT NULL,
    points INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (idea_id) REFERENCES ideas(id),
    FOREIGN KEY (voter_id) REFERENCES users(id),
    UNIQUE(idea_id, voter_id)
);
```

### Themes Table
```sql
CREATE TABLE themes (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

### Action Items Table
```sql
CREATE TABLE action_items (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    description TEXT NOT NULL,
    theme_id VARCHAR(36),
    assignee VARCHAR(100),
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (theme_id) REFERENCES themes(id)
);
```

---

## Session Workflow

### Phase Structure
The platform operates through a 6-phase workflow:

#### Phase 0: Setup
- **Purpose:** Session initialization and participant joining
- **Duration:** No time limit
- **Activities:**
  - Facilitator creates session with custom parameters
  - Participants join using session ID
  - Session configuration review
- **Transitions:** Manual advance by facilitator

#### Phase 1: Idea Submission
- **Purpose:** Participants submit ideas individually
- **Duration:** Configurable (default: 10 minutes)
- **Activities:**
  - Real-time idea submission
  - Anonymous contribution (names hidden from participants)
  - Live count of submitted ideas
- **Transitions:** Timer-based or manual advance

#### Phase 2: Idea Review
- **Purpose:** Review all submitted ideas
- **Duration:** Configurable (default: 5 minutes)
- **Activities:**
  - Display all ideas for review
  - Facilitator can see author attribution
  - Participants see ideas without attribution
- **Transitions:** Timer-based or manual advance

#### Phase 3: Voting
- **Purpose:** Participants vote on ideas using point allocation
- **Duration:** Configurable (default: 5 minutes)
- **Activities:**
  - Point-based voting system
  - Real-time vote aggregation
  - Configurable points per participant and max votes per idea
- **Transitions:** Timer-based or manual advance

#### Phase 4: AI Analysis
- **Purpose:** Automatic idea clustering and theme generation
- **Duration:** Configurable (default: 5 minutes)
- **Activities:**
  - AI-powered text analysis and clustering
  - Automatic theme generation
  - Ideas grouped by similarity
- **Transitions:** Automatic after processing or manual advance

#### Phase 5: Action Planning
- **Purpose:** Create actionable next steps
- **Duration:** Configurable (default: 10 minutes)
- **Activities:**
  - Create action items based on top themes
  - Assign responsibilities and due dates
  - Export session results
- **Transitions:** Session completion

---

## Core Features

### Authentication & User Management

#### User Registration
- Username/password-based registration
- Display name for session participation
- Password strength validation
- Duplicate username prevention

#### Login System
- Secure authentication with JWT tokens
- Session persistence across browser sessions
- Automatic token refresh
- Secure logout with token invalidation

#### Authorization Rules
- **Facilitator Access:** Only user with username "facilitator" can:
  - Create new sessions
  - Access facilitator dashboard
  - Control phase transitions
  - View idea attribution
- **Participant Access:** All authenticated users can:
  - Join existing sessions
  - Submit ideas and vote
  - View session progress
  - Access participant interface

### Session Management

#### Session Creation (Facilitator Only)
- Custom session name and central question
- Configurable phase timers:
  - Idea submission phase: 1-60 minutes
  - Review phase: 1-30 minutes
  - Voting phase: 1-30 minutes
  - Analysis phase: 1-30 minutes
  - Action planning phase: 1-60 minutes
- Voting configuration:
  - Points per participant: 1-20
  - Maximum votes per idea: 1-10

#### Session Joining
- Join by session ID
- Automatic participant registration
- Real-time participant list updates
- Late joining prevention after idea phase starts

#### Phase Management
- Manual phase advancement by facilitator
- Automatic timer-based transitions (optional)
- Real-time phase synchronization across all clients
- Phase-specific UI rendering

### Real-time Collaboration

#### Live Updates
- Real-time idea submission updates
- Live voting progress tracking
- Phase transition broadcasts
- Participant join/leave notifications

#### Data Synchronization
- WebSocket-based real-time communication
- Optimistic UI updates with rollback capability
- Connection recovery and state reconciliation
- Efficient data transfer protocols

### Voting System

#### Point Allocation
- Configurable total points per participant
- Maximum votes per idea enforcement
- Real-time remaining points display
- Vote modification capability during voting phase

#### Results Aggregation
- Live vote tallying
- Idea ranking by total points
- Vote distribution analytics
- Top-voted ideas identification

### AI-Powered Analysis

#### Text Processing
- Content preprocessing and cleaning
- Stop word removal and stemming
- Feature extraction for clustering

#### Idea Clustering
- Similarity-based grouping using NLP
- Configurable cluster parameters:
  - Minimum ideas per theme: 2-5
  - Maximum themes: 3-8
- Automatic theme naming and description generation

#### Theme Generation
- Descriptive theme names (max 40 characters)
- Detailed theme descriptions (max 120 characters)
- Idea-to-theme mapping
- Theme-based result visualization

---

## API Specification

### Authentication Endpoints

#### POST /auth/register
```json
Request:
{
  "username": "string",
  "password": "string",
  "display_name": "string"
}

Response:
{
  "message": "User created successfully",
  "user_id": "uuid"
}
```

#### POST /auth/login
```json
Request:
{
  "username": "string",
  "password": "string"
}

Response:
{
  "access_token": "jwt_token",
  "user": {
    "id": "uuid",
    "username": "string",
    "display_name": "string"
  }
}
```

#### POST /auth/logout
```json
Response:
{
  "message": "Logged out successfully"
}
```

#### GET /auth/me
```json
Response:
{
  "user": {
    "id": "uuid",
    "username": "string",
    "display_name": "string"
  }
}
```

### Session Management Endpoints

#### POST /sessions (Facilitator Only)
```json
Request:
{
  "name": "string",
  "question": "string",
  "idea_phase_time": 600,
  "review_phase_time": 300,
  "voting_phase_time": 300,
  "analysis_phase_time": 300,
  "action_phase_time": 600,
  "votes_per_participant": 5,
  "max_votes_per_idea": 3
}

Response:
{
  "session_id": "uuid",
  "message": "Session created successfully"
}
```

#### GET /sessions/{session_id}
```json
Response:
{
  "id": "uuid",
  "name": "string",
  "question": "string",
  "current_phase": 1,
  "facilitator_name": "string",
  "phase_timers": {
    "idea_phase_time": 600,
    "review_phase_time": 300,
    "voting_phase_time": 300,
    "analysis_phase_time": 300,
    "action_phase_time": 600
  },
  "voting_config": {
    "votes_per_participant": 5,
    "max_votes_per_idea": 3
  },
  "created_at": "timestamp"
}
```

#### PUT /sessions/{session_id}/phase (Facilitator Only)
```json
Request:
{
  "phase": 2
}

Response:
{
  "message": "Phase updated successfully",
  "new_phase": 2
}
```

#### POST /sessions/{session_id}/join
```json
Response:
{
  "message": "Joined session successfully",
  "participant_id": "uuid"
}
```

#### GET /sessions/{session_id}/participants
```json
Response:
{
  "participants": [
    {
      "id": "uuid",
      "name": "string",
      "is_facilitator": false,
      "joined_at": "timestamp"
    }
  ],
  "total_count": 5
}
```

### Ideas Endpoints

#### POST /sessions/{session_id}/ideas
```json
Request:
{
  "content": "string"
}

Response:
{
  "idea_id": "uuid",
  "message": "Idea submitted successfully"
}
```

#### GET /sessions/{session_id}/ideas
Query Parameters:
- `include_author`: boolean (facilitator only)

```json
Response:
{
  "ideas": [
    {
      "id": "uuid",
      "content": "string",
      "author_name": "string", // if include_author=true
      "theme_id": "uuid",
      "created_at": "timestamp"
    }
  ],
  "total_count": 15
}
```

### Voting Endpoints

#### POST /sessions/{session_id}/votes
```json
Request:
{
  "idea_id": "uuid",
  "points": 2
}

Response:
{
  "message": "Vote recorded successfully"
}
```

#### GET /sessions/{session_id}/votes
```json
Response:
{
  "user_votes": [
    {
      "idea_id": "uuid",
      "points": 2
    }
  ],
  "remaining_points": 3
}
```

#### GET /sessions/{session_id}/vote-results
```json
Response:
{
  "results": [
    {
      "idea_id": "uuid",
      "content": "string",
      "author_name": "string", // facilitator only
      "total_points": 8,
      "vote_count": 4
    }
  ]
}
```

### AI Analysis Endpoints

#### POST /sessions/{session_id}/generate-themes
```json
Request:
{
  "min_ideas_per_theme": 2,
  "max_themes": 6
}

Response:
{
  "message": "Themes generated successfully",
  "themes_count": 4
}
```

#### GET /sessions/{session_id}/themes
```json
Response:
{
  "themes": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "idea_count": 5
    }
  ]
}
```

#### GET /sessions/{session_id}/ideas-by-theme
```json
Response:
{
  "themes": [
    {
      "theme": {
        "id": "uuid",
        "name": "string",
        "description": "string"
      },
      "ideas": [
        {
          "id": "uuid",
          "content": "string",
          "author_name": "string", // facilitator only
          "total_points": 5
        }
      ]
    }
  ]
}
```

### Action Items Endpoints

#### POST /sessions/{session_id}/actions
```json
Request:
{
  "description": "string",
  "theme_id": "uuid",
  "assignee": "string",
  "due_date": "2024-02-15"
}

Response:
{
  "action_id": "uuid",
  "message": "Action item created successfully"
}
```

#### GET /sessions/{session_id}/actions
```json
Response:
{
  "actions": [
    {
      "id": "uuid",
      "description": "string",
      "theme_name": "string",
      "assignee": "string",
      "due_date": "2024-02-15",
      "created_at": "timestamp"
    }
  ]
}
```

### WebSocket Events

#### Connection
- **Endpoint:** `ws://api.domain.com/ws/session/{session_id}`
- **Authentication:** JWT token in query parameter or header

#### Event Types

##### Phase Change Event
```json
{
  "type": "phase_change",
  "data": {
    "new_phase": 2,
    "phase_name": "Idea Review",
    "timer_duration": 300
  }
}
```

##### New Idea Event
```json
{
  "type": "new_idea",
  "data": {
    "idea_count": 8,
    "latest_idea": {
      "id": "uuid",
      "content": "string" // without author for participants
    }
  }
}
```

##### Vote Update Event
```json
{
  "type": "vote_update",
  "data": {
    "idea_id": "uuid",
    "new_total": 12,
    "voter_count": 5
  }
}
```

##### Participant Update Event
```json
{
  "type": "participant_update",
  "data": {
    "action": "joined|left",
    "participant": {
      "name": "string"
    },
    "total_participants": 8
  }
}
```

##### Timer Update Event
```json
{
  "type": "timer_update",
  "data": {
    "remaining_seconds": 180,
    "phase": 1
  }
}
```

---

## Frontend Requirements

### Angular Application Structure

#### Module Organization
```
src/
├── app/
│   ├── core/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── services/
│   │   └── models/
│   ├── features/
│   │   ├── auth/
│   │   ├── session/
│   │   ├── facilitator/
│   │   └── participant/
│   ├── shared/
│   │   ├── components/
│   │   ├── directives/
│   │   └── pipes/
│   └── layouts/
```

#### Core Services

##### AuthService
```typescript
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  login(credentials: LoginRequest): Observable<AuthResponse>
  register(userData: RegisterRequest): Observable<any>
  logout(): Observable<any>
  getCurrentUser(): Observable<User>
  isAuthenticated(): boolean
  isFacilitator(): boolean
  getToken(): string
}
```

##### SessionService
```typescript
@Injectable({
  providedIn: 'root'
})
export class SessionService {
  createSession(sessionData: CreateSessionRequest): Observable<any>
  joinSession(sessionId: string): Observable<any>
  getSession(sessionId: string): Observable<Session>
  advancePhase(sessionId: string): Observable<any>
  getCurrentPhase(): Observable<number>
}
```

##### WebSocketService
```typescript
@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  connect(sessionId: string): void
  disconnect(): void
  onMessage(): Observable<WebSocketMessage>
  sendMessage(message: any): void
  connectionStatus(): Observable<boolean>
}
```

##### IdeasService
```typescript
@Injectable({
  providedIn: 'root'
})
export class IdeasService {
  submitIdea(sessionId: string, content: string): Observable<any>
  getIdeas(sessionId: string, includeAuthor?: boolean): Observable<Idea[]>
  getIdeasByTheme(sessionId: string): Observable<ThemeGroup[]>
}
```

##### VotingService
```typescript
@Injectable({
  providedIn: 'root'
})
export class VotingService {
  submitVote(sessionId: string, ideaId: string, points: number): Observable<any>
  getUserVotes(sessionId: string): Observable<UserVote[]>
  getVoteResults(sessionId: string): Observable<VoteResult[]>
  getRemainingPoints(sessionId: string): Observable<number>
}
```

### Component Architecture

#### Authentication Components
- **LoginComponent:** User login form with validation
- **RegisterComponent:** User registration with password strength validation
- **AuthGuard:** Route protection for authenticated users
- **FacilitatorGuard:** Additional protection for facilitator-only routes

#### Session Components
- **SessionCreateComponent:** Session creation form (facilitator only)
- **SessionJoinComponent:** Session joining interface
- **SessionDashboardComponent:** Main session interface

#### Participant Components
- **ParticipantViewComponent:** Main participant interface
- **IdeaSubmissionComponent:** Idea submission form
- **IdeaReviewComponent:** Ideas display for review
- **VotingComponent:** Interactive voting interface
- **ResultsViewComponent:** Session results display

#### Facilitator Components
- **FacilitatorDashboardComponent:** Main facilitator control panel
- **PhaseControlComponent:** Phase management controls
- **ParticipantManagementComponent:** Participant list and statistics
- **SessionAnalyticsComponent:** Session analytics and insights

#### Shared Components
- **TimerComponent:** Phase timer display
- **ProgressBarComponent:** Session progress indicator
- **NotificationComponent:** Real-time notifications
- **LoadingSpinnerComponent:** Loading states
- **ErrorMessageComponent:** Error display and handling

### State Management (NgRx)

#### Store Structure
```typescript
interface AppState {
  auth: AuthState;
  session: SessionState;
  ideas: IdeasState;
  voting: VotingState;
  ui: UIState;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface SessionState {
  currentSession: Session | null;
  participants: Participant[];
  currentPhase: number;
  timeRemaining: number;
  isLoading: boolean;
  error: string | null;
}

interface IdeasState {
  ideas: Idea[];
  themes: Theme[];
  isLoading: boolean;
  error: string | null;
}

interface VotingState {
  userVotes: UserVote[];
  voteResults: VoteResult[];
  remainingPoints: number;
  isLoading: boolean;
  error: string | null;
}
```

#### Effects for Side Effects
- **AuthEffects:** Handle authentication API calls
- **SessionEffects:** Manage session-related operations
- **WebSocketEffects:** Handle real-time updates
- **IdeasEffects:** Process idea-related actions
- **VotingEffects:** Manage voting operations

### Routing Configuration

```typescript
const routes: Routes = [
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'session',
    loadChildren: () => import('./features/session/session.module').then(m => m.SessionModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'facilitator',
    loadChildren: () => import('./features/facilitator/facilitator.module').then(m => m.FacilitatorModule),
    canActivate: [AuthGuard, FacilitatorGuard]
  },
  {
    path: 'participant',
    loadChildren: () => import('./features/participant/participant.module').then(m => m.ParticipantModule),
    canActivate: [AuthGuard]
  }
];
```

### Responsive Design Requirements

#### Breakpoints
- **Mobile:** 320px - 767px
- **Tablet:** 768px - 1023px
- **Desktop:** 1024px+

#### Mobile Optimizations
- Touch-friendly interface elements
- Optimized voting interface for mobile
- Collapsible navigation
- Readable typography scaling
- Efficient data loading

---

## Backend Requirements

### FastAPI Application Structure

#### Project Organization
```
app/
├── api/
│   ├── deps.py
│   ├── endpoints/
│   │   ├── auth.py
│   │   ├── sessions.py
│   │   ├── ideas.py
│   │   ├── voting.py
│   │   └── websocket.py
├── core/
│   ├── config.py
│   ├── security.py
│   └── database.py
├── models/
│   ├── user.py
│   ├── session.py
│   ├── idea.py
│   └── vote.py
├── schemas/
│   ├── auth.py
│   ├── session.py
│   ├── idea.py
│   └── vote.py
├── services/
│   ├── auth_service.py
│   ├── session_service.py
│   ├── ai_service.py
│   └── websocket_service.py
└── main.py
```

#### Core Configuration

##### Database Configuration
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://user:password@localhost/ideaflow"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

##### Security Configuration
```python
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
```

#### Pydantic Models (Schemas)

##### Authentication Schemas
```python
from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    username: str
    password: str
    display_name: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class User(BaseModel):
    id: str
    username: str
    display_name: str
    
    class Config:
        from_attributes = True
```

##### Session Schemas
```python
class SessionCreate(BaseModel):
    name: str
    question: str
    idea_phase_time: int = 600
    review_phase_time: int = 300
    voting_phase_time: int = 300
    analysis_phase_time: int = 300
    action_phase_time: int = 600
    votes_per_participant: int = 5
    max_votes_per_idea: int = 3

class SessionResponse(BaseModel):
    id: str
    name: str
    question: str
    current_phase: int
    facilitator_name: str
    created_at: datetime
    
    class Config:
        from_attributes = True
```

#### SQLAlchemy Models

##### User Model
```python
from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(64), nullable=False)
    display_name = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

##### Session Model
```python
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

class Session(Base):
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    question = Column(Text, nullable=False)
    facilitator_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    facilitator_name = Column(String(100), nullable=False)
    current_phase = Column(Integer, default=0)
    idea_phase_time = Column(Integer, default=600)
    review_phase_time = Column(Integer, default=300)
    voting_phase_time = Column(Integer, default=300)
    analysis_phase_time = Column(Integer, default=300)
    action_phase_time = Column(Integer, default=600)
    votes_per_participant = Column(Integer, default=5)
    max_votes_per_idea = Column(Integer, default=3)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    facilitator = relationship("User")
    participants = relationship("Participant", back_populates="session")
    ideas = relationship("Idea", back_populates="session")
```

#### Service Layer

##### Authentication Service
```python
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.auth import UserCreate
from app.core.security import get_password_hash, verify_password

class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def create_user(self, user_data: UserCreate) -> User:
        hashed_password = get_password_hash(user_data.password)
        db_user = User(
            id=str(uuid.uuid4()),
            username=user_data.username,
            password_hash=hashed_password,
            display_name=user_data.display_name
        )
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user

    def authenticate_user(self, username: str, password: str) -> User:
        user = self.db.query(User).filter(User.username == username).first()
        if not user or not verify_password(password, user.password_hash):
            return None
        return user

    def get_user_by_username(self, username: str) -> User:
        return self.db.query(User).filter(User.username == username).first()
```

##### WebSocket Manager
```python
from typing import List, Dict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)

    async def broadcast_to_session(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                await connection.send_json(message)

manager = ConnectionManager()
```

#### API Error Handling

##### Custom Exceptions
```python
from fastapi import HTTPException, status

class AuthenticationError(HTTPException):
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)

class AuthorizationError(HTTPException):
    def __init__(self, detail: str = "Not authorized"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

class ValidationError(HTTPException):
    def __init__(self, detail: str = "Validation failed"):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)

class NotFoundError(HTTPException):
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
```

#### Middleware Configuration

##### CORS Middleware
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],  # Angular dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

##### Rate Limiting
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Usage in endpoints
@app.post("/auth/login")
@limiter.limit("5/minute")
async def login(request: Request, user_data: UserLogin):
    # Implementation
```

---

## Security & Authentication

### JWT Implementation

#### Token Structure
```json
{
  "sub": "user_id",
  "username": "facilitator",
  "display_name": "John Doe",
  "exp": 1642678800,
  "iat": 1642675200,
  "is_facilitator": true
}
```

#### Token Validation
- Signature verification using secret key
- Expiration time checking
- Token blacklisting for logout
- Automatic token refresh mechanism

### Password Security

#### Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Special characters recommended

#### Implementation
- bcrypt hashing with salt rounds
- Password strength validation on frontend
- Secure password storage
- Password change functionality

### Data Protection

#### Input Validation
- SQL injection prevention
- XSS protection
- CSRF token implementation
- Input sanitization and validation

#### Database Security
- Parameterized queries
- Connection pooling with limits
- Database user with minimal privileges
- Encrypted connections (SSL/TLS)

#### API Security
- Rate limiting per endpoint
- Request size limits
- Authentication required for all protected endpoints
- HTTPS enforcement in production

---

## Real-time Features

### WebSocket Implementation

#### Connection Management
```typescript
// Angular WebSocket Service
export class WebSocketService {
  private socket$: WebSocketSubject<any>;
  private messagesSubject$ = new Subject<any>();
  
  connect(sessionId: string, token: string): Observable<any> {
    if (!this.socket$ || this.socket$.closed) {
      this.socket$ = new WebSocketSubject({
        url: `ws://localhost:8000/ws/session/${sessionId}?token=${token}`,
        openObserver: {
          next: () => console.log('WebSocket connected')
        },
        closeObserver: {
          next: () => console.log('WebSocket disconnected')
        }
      });
      
      this.socket$.subscribe(
        msg => this.messagesSubject$.next(msg),
        err => console.error('WebSocket error:', err),
        () => console.log('WebSocket complete')
      );
    }
    
    return this.messagesSubject$.asObservable();
  }
}
```

#### Message Types and Handlers

##### Phase Change Handling
```typescript
handlePhaseChange(data: any) {
  this.store.dispatch(SessionActions.updatePhase({ 
    phase: data.new_phase,
    timerDuration: data.timer_duration 
  }));
  
  // Navigate to appropriate component based on phase
  this.router.navigate([`/participant/phase/${data.new_phase}`]);
}
```

##### Real-time Idea Updates
```typescript
handleNewIdea(data: any) {
  this.store.dispatch(IdeasActions.addIdea({ 
    idea: data.latest_idea 
  }));
  
  // Update idea count display
  this.ideaCount = data.idea_count;
}
```

##### Live Voting Updates
```typescript
handleVoteUpdate(data: any) {
  this.store.dispatch(VotingActions.updateIdeaVotes({
    ideaId: data.idea_id,
    totalVotes: data.new_total,
    voterCount: data.voter_count
  }));
}
```

### Connection Management

#### Reconnection Strategy
```typescript
private reconnect(): void {
  this.reconnectAttempts++;
  
  if (this.reconnectAttempts <= this.maxReconnectAttempts) {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    setTimeout(() => {
      this.connect(this.currentSessionId, this.currentToken);
    }, delay);
  }
}
```

#### Connection State Management
- Connection status indicators
- Automatic reconnection with exponential backoff
- Offline mode handling
- Data synchronization on reconnect

---

## AI Integration

### Natural Language Processing

#### Text Preprocessing Pipeline
```python
import spacy
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans

class AIProcessor:
    def __init__(self):
        self.nlp = spacy.load("en_core_web_sm")
        self.vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2)
        )
    
    def preprocess_text(self, text: str) -> str:
        # Convert to lowercase
        text = text.lower()
        
        # Remove special characters
        text = re.sub(r'[^a-zA-Z\s]', '', text)
        
        # Process with spaCy
        doc = self.nlp(text)
        
        # Remove stop words and get lemmas
        tokens = [token.lemma_ for token in doc 
                 if not token.is_stop and not token.is_punct]
        
        return ' '.join(tokens)
```

#### Clustering Algorithm
```python
def cluster_ideas(self, ideas: List[str], min_cluster_size: int = 2, 
                 max_clusters: int = 8) -> Dict[int, List[int]]:
    if len(ideas) < min_cluster_size:
        return {0: list(range(len(ideas)))}
    
    # Preprocess texts
    processed_texts = [self.preprocess_text(idea) for idea in ideas]
    
    # Vectorize
    tfidf_matrix = self.vectorizer.fit_transform(processed_texts)
    
    # Determine optimal number of clusters
    n_clusters = min(max_clusters, len(ideas) // min_cluster_size)
    
    # Perform clustering
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    cluster_labels = kmeans.fit_predict(tfidf_matrix)
    
    # Group ideas by cluster
    clusters = {}
    for i, label in enumerate(cluster_labels):
        if label not in clusters:
            clusters[label] = []
        clusters[label].append(i)
    
    # Filter out small clusters
    filtered_clusters = {k: v for k, v in clusters.items() 
                        if len(v) >= min_cluster_size}
    
    return filtered_clusters
```

#### Theme Generation
```python
def generate_theme_name(self, ideas: List[str]) -> str:
    # Extract key terms from ideas
    processed_texts = [self.preprocess_text(idea) for idea in ideas]
    combined_text = ' '.join(processed_texts)
    
    # Get TF-IDF scores
    tfidf_matrix = self.vectorizer.fit_transform([combined_text])
    feature_names = self.vectorizer.get_feature_names_out()
    tfidf_scores = tfidf_matrix.toarray()[0]
    
    # Get top terms
    top_indices = tfidf_scores.argsort()[-3:][::-1]
    top_terms = [feature_names[i] for i in top_indices]
    
    # Generate theme name
    theme_name = ' '.join(top_terms).title()
    return theme_name[:40]  # Limit to 40 characters

def generate_theme_description(self, ideas: List[str]) -> str:
    # Analyze common patterns and generate description
    theme_name = self.generate_theme_name(ideas)
    idea_count = len(ideas)
    
    description = f"This theme encompasses {idea_count} ideas related to {theme_name.lower()}."
    return description[:120]  # Limit to 120 characters
```

### AI Service Integration

#### Background Task Processing
```python
from celery import Celery
from app.services.ai_service import AIProcessor

celery_app = Celery('ideaflow')

@celery_app.task
def generate_themes_task(session_id: str, ideas: List[dict], 
                        min_ideas_per_theme: int = 2, 
                        max_themes: int = 8):
    ai_processor = AIProcessor()
    
    # Extract idea contents
    idea_texts = [idea['content'] for idea in ideas]
    
    # Generate clusters
    clusters = ai_processor.cluster_ideas(
        idea_texts, 
        min_ideas_per_theme, 
        max_themes
    )
    
    # Generate themes and save to database
    for cluster_id, idea_indices in clusters.items():
        cluster_ideas = [idea_texts[i] for i in idea_indices]
        
        theme_name = ai_processor.generate_theme_name(cluster_ideas)
        theme_description = ai_processor.generate_theme_description(cluster_ideas)
        
        # Save theme to database
        # Update ideas with theme_id
        
    return {"themes_generated": len(clusters)}
```

---

## UI/UX Guidelines

### Design System

#### Color Palette
- **Primary:** #2563EB (Blue)
- **Secondary:** #10B981 (Green)
- **Accent:** #F59E0B (Amber)
- **Neutral:** #6B7280 (Gray)
- **Success:** #10B981 (Green)
- **Warning:** #F59E0B (Amber)
- **Error:** #EF4444 (Red)
- **Background:** #F9FAFB (Light Gray)

#### Typography
- **Headings:** Inter, Arial, sans-serif
- **Body Text:** Inter, Arial, sans-serif
- **Monospace:** 'Fira Code', 'Courier New', monospace

#### Spacing Scale
- **xs:** 0.25rem (4px)
- **sm:** 0.5rem (8px)
- **md:** 1rem (16px)
- **lg:** 1.5rem (24px)
- **xl:** 2rem (32px)
- **2xl:** 3rem (48px)

### Component Design Standards

#### Buttons
```scss
.btn-primary {
  background-color: #2563EB;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  border: none;
  font-weight: 600;
  transition: all 0.2s;
  
  &:hover {
    background-color: #1D4ED8;
    transform: translateY(-1px);
  }
  
  &:disabled {
    background-color: #9CA3AF;
    cursor: not-allowed;
  }
}
```

#### Form Inputs
```scss
.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #D1D5DB;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: #2563EB;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
  
  &.error {
    border-color: #EF4444;
  }
}
```

#### Cards
```scss
.card {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  border: 1px solid #E5E7EB;
  
  &:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
}
```

### Responsive Design Patterns

#### Mobile-First Approach
```scss
// Base styles for mobile
.session-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  
  // Tablet
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
  
  // Desktop
  @media (min-width: 1024px) {
    grid-template-columns: 1fr 2fr 1fr;
  }
}
```

#### Navigation Patterns
- **Mobile:** Hamburger menu with slide-out drawer
- **Tablet:** Collapsible sidebar
- **Desktop:** Fixed sidebar navigation

### Accessibility Requirements

#### Keyboard Navigation
- Tab order following logical flow
- Focus indicators on all interactive elements
- Keyboard shortcuts for common actions
- Skip links for main content

#### Screen Reader Support
- Proper ARIA labels and roles
- Alternative text for images
- Descriptive link text
- Form labels and error messages

#### Color and Contrast
- WCAG AA compliance (4.5:1 contrast ratio)
- Color not as sole indicator of meaning
- High contrast mode support
- Colorblind-friendly palette

---

## Performance Requirements

### Frontend Performance

#### Bundle Optimization
- Lazy loading for feature modules
- Tree shaking for unused code
- Code splitting at route level
- Preloading strategies for critical modules

#### Runtime Performance
- OnPush change detection strategy
- Virtual scrolling for large lists
- Debounced search and filtering
- Optimized NgRx selectors

#### Network Optimization
- HTTP interceptors for caching
- Request deduplication
- Progressive loading for images
- Compression for static assets

### Backend Performance

#### Database Optimization
```sql
-- Indexes for frequently queried columns
CREATE INDEX idx_sessions_facilitator_id ON sessions(facilitator_id);
CREATE INDEX idx_ideas_session_id ON ideas(session_id);
CREATE INDEX idx_votes_session_id ON votes(session_id);
CREATE INDEX idx_votes_idea_id ON votes(idea_id);
CREATE INDEX idx_participants_session_id ON participants(session_id);
```

#### API Response Times
- Database queries: < 100ms
- API endpoints: < 200ms
- WebSocket message delivery: < 50ms
- AI processing: < 5 seconds

#### Caching Strategy
```python
from functools import lru_cache
import redis

redis_client = redis.Redis(host='localhost', port=6379, db=0)

@lru_cache(maxsize=128)
def get_session_cache(session_id: str):
    # Cache session data for frequently accessed sessions
    return redis_client.get(f"session:{session_id}")

def invalidate_session_cache(session_id: str):
    redis_client.delete(f"session:{session_id}")
```

### Scalability Considerations

#### Horizontal Scaling
- Stateless API design
- Database connection pooling
- Load balancer configuration
- Session affinity for WebSocket connections

#### Performance Monitoring
- Application performance monitoring (APM)
- Database query performance tracking
- Real-time error tracking
- User experience metrics

---

## Testing Strategy

### Frontend Testing

#### Unit Testing (Jest + Angular Testing Utilities)
```typescript
describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should authenticate user successfully', () => {
    const mockResponse = { access_token: 'token', user: { id: '1' } };
    
    service.login({ username: 'test', password: 'password' }).subscribe(
      response => expect(response).toEqual(mockResponse)
    );

    const req = httpMock.expectOne('/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });
});
```

#### Integration Testing (Cypress)
```typescript
describe('Session Flow', () => {
  beforeEach(() => {
    cy.login('facilitator', 'password');
  });

  it('should create and run a complete session', () => {
    // Create session
    cy.visit('/session/create');
    cy.get('[data-cy=session-name]').type('Test Session');
    cy.get('[data-cy=session-question]').type('How can we improve?');
    cy.get('[data-cy=create-button]').click();
    
    // Verify session creation
    cy.url().should('include', '/facilitator/dashboard');
    cy.get('[data-cy=session-title]').should('contain', 'Test Session');
    
    // Advance through phases
    cy.get('[data-cy=advance-phase]').click();
    cy.get('[data-cy=current-phase]').should('contain', 'Idea Submission');
  });
});
```

#### Component Testing
```typescript
describe('VotingComponent', () => {
  let component: VotingComponent;
  let fixture: ComponentFixture<VotingComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [VotingComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: VotingService, useValue: mockVotingService }
      ]
    });
    fixture = TestBed.createComponent(VotingComponent);
    component = fixture.componentInstance;
  });

  it('should disable voting when no points remaining', () => {
    component.remainingPoints = 0;
    fixture.detectChanges();
    
    const voteButtons = fixture.debugElement.queryAll(By.css('.vote-button'));
    voteButtons.forEach(button => {
      expect(button.nativeElement.disabled).toBe(true);
    });
  });
});
```

### Backend Testing

#### Unit Testing (pytest)
```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_session_facilitator_only():
    # Test that only facilitator can create sessions
    response = client.post(
        "/sessions/",
        json={
            "name": "Test Session",
            "question": "Test Question"
        },
        headers={"Authorization": "Bearer valid_facilitator_token"}
    )
    assert response.status_code == 200
    assert "session_id" in response.json()

def test_create_session_unauthorized():
    response = client.post(
        "/sessions/",
        json={
            "name": "Test Session",
            "question": "Test Question"
        },
        headers={"Authorization": "Bearer participant_token"}
    )
    assert response.status_code == 403
```

#### Database Testing
```python
def test_vote_constraints(db_session):
    # Test that users can't vote more than max allowed per idea
    session_id = create_test_session(db_session)
    idea_id = create_test_idea(db_session, session_id)
    user_id = create_test_user(db_session)
    
    # First vote should succeed
    vote1 = Vote(
        id=str(uuid.uuid4()),
        session_id=session_id,
        idea_id=idea_id,
        voter_id=user_id,
        points=3
    )
    db_session.add(vote1)
    db_session.commit()
    
    # Second vote should update, not create new
    vote2 = Vote(
        id=str(uuid.uuid4()),
        session_id=session_id,
        idea_id=idea_id,
        voter_id=user_id,
        points=2
    )
    
    with pytest.raises(IntegrityError):
        db_session.add(vote2)
        db_session.commit()
```

#### API Integration Testing
```python
def test_voting_workflow():
    # Create session
    session_response = client.post("/sessions/", json={
        "name": "Test Session",
        "question": "Test Question"
    }, headers=facilitator_headers)
    session_id = session_response.json()["session_id"]
    
    # Join session
    client.post(f"/sessions/{session_id}/join", headers=participant_headers)
    
    # Advance to voting phase
    client.put(f"/sessions/{session_id}/phase", 
               json={"phase": 3}, 
               headers=facilitator_headers)
    
    # Submit vote
    vote_response = client.post(f"/sessions/{session_id}/votes", 
                               json={"idea_id": "test_idea", "points": 3},
                               headers=participant_headers)
    assert vote_response.status_code == 200
```

### Load Testing

#### WebSocket Load Testing
```python
import asyncio
import websockets
import json

async def simulate_participant(session_id, participant_id):
    uri = f"ws://localhost:8000/ws/session/{session_id}"
    
    async with websockets.connect(uri) as websocket:
        # Simulate participant activity
        await websocket.send(json.dumps({
            "type": "join",
            "participant_id": participant_id
        }))
        
        # Listen for messages
        async for message in websocket:
            data = json.loads(message)
            # Handle different message types
            if data["type"] == "phase_change":
                # Simulate appropriate response
                pass

async def load_test():
    tasks = []
    for i in range(100):  # Simulate 100 participants
        task = simulate_participant("test_session", f"participant_{i}")
        tasks.append(task)
    
    await asyncio.gather(*tasks)
```

---

## Deployment Considerations

### Environment Configuration

#### Development Environment
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "4200:4200"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
  
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/ideaflow_dev
      - JWT_SECRET=dev_secret_key
    depends_on:
      - db
  
  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=ideaflow_dev
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### Production Configuration
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./ssl:/etc/ssl
  
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - redis
  
  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
```

### CI/CD Pipeline

#### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy IdeaFlow

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install frontend dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Run frontend tests
        run: |
          cd frontend
          npm run test:ci
          npm run e2e:ci
      
      - name: Setup Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      
      - name: Install backend dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      
      - name: Run backend tests
        run: |
          cd backend
          pytest
  
  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build and push Docker images
        run: |
          docker build -t ideaflow-frontend ./frontend
          docker build -t ideaflow-backend ./backend
          # Push to registry
      
      - name: Deploy to production
        run: |
          # Deploy using your preferred method
```

### Security Checklist

#### Production Security
- [ ] HTTPS enforcement
- [ ] Secure cookie settings
- [ ] Environment variable protection
- [ ] Database connection encryption
- [ ] Rate limiting implementation
- [ ] Input validation and sanitization
- [ ] CORS configuration
- [ ] Security headers (HSTS, CSP, etc.)
- [ ] Regular security updates
- [ ] Vulnerability scanning

#### Monitoring and Logging
- [ ] Application performance monitoring
- [ ] Error tracking and alerting
- [ ] Database performance monitoring
- [ ] User analytics (privacy-compliant)
- [ ] Security event logging
- [ ] Uptime monitoring
- [ ] Resource usage tracking

---

## Conclusion

This specification provides a comprehensive blueprint for building a production-ready IdeaFlow platform using Angular and FastAPI. The architecture emphasizes:

1. **Scalability:** Modular design supporting horizontal scaling
2. **Security:** Comprehensive authentication and data protection
3. **User Experience:** Responsive design with real-time collaboration
4. **Maintainability:** Clean code architecture with comprehensive testing
5. **Performance:** Optimized for both frontend and backend efficiency

### Next Steps

1. **Project Setup:** Initialize Angular and FastAPI projects with recommended structure
2. **Database Schema:** Implement PostgreSQL database with proper migrations
3. **Authentication:** Build secure JWT-based authentication system
4. **Core Features:** Implement session management and real-time collaboration
5. **AI Integration:** Add NLP-powered idea clustering and theme generation
6. **Testing:** Implement comprehensive testing strategy
7. **Deployment:** Set up CI/CD pipeline and production environment

This specification ensures the development team has all necessary information to build a robust, scalable, and user-friendly collaborative ideation platform.