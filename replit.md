# IdeaFlow - Collaborative Ideation Platform

## Overview

IdeaFlow is a comprehensive collaborative brainstorming platform designed to facilitate structured ideation sessions for teams. It guides participants through distinct phases: Setup, Idea Submission, Review, Voting, AI Analysis, and Action Planning. The platform supports real-time collaboration, anonymous idea submission, and AI-powered analysis to foster efficient and productive brainstorming.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### October 3, 2025 - Critical Bug Fixes & Subscription System Improvements
1. **Fixed iterative-prompt endpoint (database schema)**: Added missing `iterative_prompt` TEXT column to sessions table schema, resolving "(sqlite3.OperationalError) no such column: iterative_prompt" error when sending selected ideas as new prompts in Phase 6.
2. **Fixed participant list completely empty**: Changed `/api/sessions/<id>/participants` endpoint to return wrapped JSON format `{"participants": [...]}` instead of bare array, and updated frontend `getParticipants()` to handle both formats for backward compatibility.
3. **Fixed timer synchronization (client-side polling)**: Removed timer status polling from ParticipantView's `fetchData` interval that was overwriting local countdown every second, causing timer to jump between values. Also removed duplicate timer countdown effect. Participants now rely solely on `timer_started` WebSocket event and local countdown.
4. **Fixed SQLite compatibility**: Replaced PostgreSQL-specific `ALTER TABLE IF NOT EXISTS` syntax with SQLite-compatible individual try/catch blocks for each column addition to prevent migration errors.
5. **Fixed Vite proxy configuration**: Added proxy configuration to `vite.config.ts` to properly forward `/api/*` requests from frontend (port 5000) to Flask backend (port 8000), resolving issues where API requests returned HTML instead of JSON.
6. **Fixed subscription reset SQLite compatibility**: Replaced PostgreSQL-specific `INTERVAL '1 month'` syntax with SQLite-compatible `datetime(CURRENT_TIMESTAMP, '+1 month')` function in subscription reset and creation queries.
7. **Fixed Pro tier limits**: Corrected Pro tier from 12 sessions/10 participants to 999/999 (unlimited) to match Stripe pricing configuration and product expectations.
8. **Fixed subscription data synchronization (CRITICAL)**: Resolved architectural flaw where subscription data was stored in two tables (`users` and `user_subscriptions`) without automatic synchronization. The `/api/subscription/status` endpoint reads from `users` table while Stripe webhook only updated `user_subscriptions` table, causing data inconsistency. **Solution**: Modified all subscription-related functions to update BOTH tables atomically:
   - `update_user_subscription()`: Updates both tables when Stripe webhook fires
   - `increment_user_sessions()`: Increments session counter in both tables
   - `reset_monthly_usage()`: Resets usage in both tables
   - `create_user()`: Creates initial subscription record in both tables
   This ensures future facilitator accounts and subscription changes maintain data consistency automatically.

### October 2, 2025 - Bug Fixes
1. **Fixed iterative-prompt endpoint**: Replaced PostgreSQL-specific `ANY()` syntax with SQLite-compatible `IN` clause to support sending selected ideas as new prompts in Phase 6.
2. **Fixed participant list real-time updates**: Added WebSocket `participant_joined` event listeners to both ParticipantView and FacilitatorDashboard for instant participant list updates when users join sessions.
3. **Fixed timer synchronization**: Implemented `timer_started` WebSocket event that sends timer duration to all participants, who then run their own local countdown timers independently, eliminating server sync issues that caused timer values to alternate (e.g., 10:00 to 9:58).

## System Architecture

The application employs a hybrid architecture, combining multiple frontend approaches with a unified backend.

### Frontend Architecture
- **Primary Interface**: React TypeScript application with a modern component-based architecture.
- **Styling**: TailwindCSS for consistent, responsive design.
- **State Management**: React Context API for authentication and subscription management.
- **Routing**: React Router for client-side navigation.

### Backend Architecture
- **API Server**: Flask-based REST API with CORS support.
- **Database Layer**: PostgreSQL with SQLAlchemy ORM for data persistence.
- **Real-time Communication**: WebSocket integration using Socket.IO.
- **Authentication**: JWT-based authentication with role-based access control (RBAC).

### Key Features
- **Authentication System**: Role-based access control for facilitators and participants, using JWT tokens.
- **Session Management**: Six-phase workflow with real-time phase transitions, participant synchronization, and timer controls.
- **Idea Processing Pipeline**: Anonymous idea submission, real-time aggregation, configurable voting, and AI-powered clustering/theme generation.
- **Real-time Features**: WebSocket connections for live updates, participant presence tracking, and notifications.
- **UI/UX Decisions**: Consistent iconography with Lucide React, and a focus on intuitive user flows for session management and idea processing.

## External Dependencies

### Database Services
- **Supabase**: Primary PostgreSQL hosting.
- **Neon PostgreSQL**: Fallback database option.

### AI/ML Libraries
- **spaCy**: Natural language processing for text analysis.
- **scikit-learn**: Machine learning algorithms for clustering.
- **pandas/numpy**: Data manipulation and numerical computing.

### Frontend Libraries
- **React**: Core UI framework.
- **TypeScript**: For type safety.
- **TailwindCSS**: Utility-first styling.
- **Lucide React**: Icon library.
- **Socket.IO Client**: For real-time communication.

### Backend Libraries
- **Flask**: Web application framework.
- **Flask-CORS**: For cross-origin resource sharing.
- **Flask-SocketIO**: For WebSocket integration.
- **SQLAlchemy**: Database ORM.
- **psycopg2**: PostgreSQL database adapter.