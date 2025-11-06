# HCLue - Collaborative Ideation Platform

A comprehensive collaborative brainstorming platform that facilitates structured ideation sessions for teams.

## Features

- **Six-Phase Workflow**: Setup → Idea Submission → Review → Voting → AI Analysis → Action Planning
- **Real-time Collaboration**: WebSocket-based live updates and synchronization
- **Role-Based Access Control**: Facilitators and participants with different permissions
- **AI-Powered Analysis**: Automatic theme clustering and idea grouping
- **Anonymous Idea Submission**: Encourages open participation
- **Voting System**: Configurable vote allocation and anonymous voting
- **Timer Management**: Phase-based timing with real-time synchronization
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

### Frontend
- React 19 with TypeScript
- TailwindCSS for styling
- Vite for build tooling
- Socket.IO for real-time communication

### Backend
- Flask Python API server
- PostgreSQL database
- SQLAlchemy ORM
- Flask-SocketIO for WebSocket support

### AI/ML
- spaCy for natural language processing
- scikit-learn for idea clustering
- TF-IDF vectorization for theme generation

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 16+

### Installation

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd ideaflow
   ```

2. **Install Python Dependencies**
   ```bash
   pip install -r requirements.txt
   # or
   pip install flask flask-cors flask-socketio numpy pandas plotly psycopg2-binary requests scikit-learn spacy sqlalchemy websockets
   ```

3. **Install Node.js Dependencies**
   ```bash
   cd ideaflow-react
   npm install
   cd ..
   ```

4. **Download spaCy Model**
   ```bash
   python -m spacy download en_core_web_sm
   ```

5. **Setup Database**
   - Create a PostgreSQL database
   - Set the `DATABASE_URL` environment variable:
     ```bash
     export DATABASE_URL="postgresql://username:password@host:port/database"
     ```

6. **Build Frontend**
   ```bash
   cd ideaflow-react
   npm run build
   cd ..
   ```

### Running the Application

**Development Mode:**
```bash
# Terminal 1 - API Server
python api_server.py

# Terminal 2 - React Development Server
cd ideaflow-react
npm run dev
```

**Production Mode:**
```bash
# Single command - serves both frontend and API
python main.py
```

The application will be available at `http://localhost:5000`

## Demo Accounts

### Facilitator Account
- Username: `facilitator`
- Password: `password123`

### Participant Accounts
- Username: `participant1` / Password: `password123`
- Username: `testing1` / Password: `password123`
- Username: `nika` / Password: `password123`

## Usage Guide

### Creating a Session (Facilitator)
1. Log in with facilitator credentials
2. Click "Create New Session"
3. Fill in session details (title, description, max participants)
4. Configure voting settings
5. Start the session and share the session ID with participants

### Joining a Session (Participant)
1. Log in with participant credentials
2. Enter the session ID provided by the facilitator
3. Join the session and wait for the facilitator to begin

### Session Phases

1. **Setup Phase**: Facilitator configures session parameters
2. **Idea Submission**: Participants anonymously submit ideas
3. **Review Phase**: All participants review submitted ideas
4. **Voting Phase**: Participants vote on ideas anonymously
5. **AI Analysis**: System generates themes and clusters ideas
6. **Action Planning**: Convert top ideas into actionable items

## Configuration

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `FLASK_ENV`: Set to 'development' for debug mode
- `PORT`: Server port (default: 5000)

### Database Schema
The application automatically creates the required database tables:
- `users`: User accounts and authentication
- `sessions`: Session configuration and state
- `ideas`: Submitted ideas with attribution
- `votes`: Participant votes
- `participants`: Session membership
- `themes`: AI-generated themes

## API Endpoints

### Authentication
- `POST /api/auth/login`: User authentication
- `POST /api/users`: User registration

### Sessions
- `POST /api/sessions`: Create new session
- `GET /api/sessions/{id}`: Get session details
- `PUT /api/sessions/{id}/phase`: Update session phase
- `GET /api/facilitators/{id}/sessions`: Get facilitator sessions

### Ideas & Voting
- `POST /api/sessions/{id}/ideas`: Submit idea
- `GET /api/sessions/{id}/ideas`: Get session ideas
- `POST /api/sessions/{id}/votes`: Submit vote
- `GET /api/sessions/{id}/votes`: Get vote results

### AI Analysis
- `POST /api/sessions/{id}/themes`: Generate AI themes
- `GET /api/sessions/{id}/themes`: Get session themes

## Development

### Project Structure
```
ideaflow/
├── ideaflow-react/          # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React contexts (Auth, Subscription)
│   │   ├── pages/           # Page components
│   │   └── services/        # API and utility services
│   └── dist/                # Built frontend files
├── utils/                   # Python utilities
│   ├── postgres_db_manager.py  # Database operations
│   └── ai_processor.py      # AI/ML processing
├── api_server.py           # Flask API server
├── main.py                 # Production entry point
└── README.md               # This file
```

### Adding New Features
1. Backend: Add endpoints to `api_server.py`
2. Database: Update schema in `postgres_db_manager.py`
3. Frontend: Add components in `ideaflow-react/src/`
4. API Integration: Update `api.ts` service

## Deployment

### Local Deployment
The application is ready for local deployment:
```bash
python main.py
```

### Cloud Deployment
For cloud deployment, ensure:
- Environment variables are set
- Database is accessible
- Static files are served correctly
- WebSocket connections are supported

## Troubleshooting

### Common Issues

**Database Connection Failed**
- Verify `DATABASE_URL` is correctly set
- Ensure PostgreSQL server is running
- Check firewall settings

**Frontend Build Errors**
- Run `npm install` in `ideaflow-react/` directory
- Clear node_modules and reinstall if needed
- Check Node.js version compatibility

**WebSocket Connection Issues**
- Ensure Flask-SocketIO is installed
- Check if WebSocket ports are open
- Verify CORS settings for cross-origin requests

### Performance Optimization
- Use connection pooling for database
- Enable gzip compression for static files
- Implement Redis for session storage in production
- Use CDN for static asset delivery

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section
- Review the API documentation
- Create an issue in the repository

---

**IdeaFlow** - Transform your team's brainstorming with intelligent, collaborative ideation.