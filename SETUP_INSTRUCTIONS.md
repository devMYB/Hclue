# IdeaFlow Setup Instructions

## Prerequisites
- Python 3.11 or higher
- Node.js 20 or higher
- Git

## Database Connection
Your project uses PostgreSQL with multiple database options. The app is configured to use:

**Current Production Database (Neon PostgreSQL):**
```
postgresql://neondb_owner:npg_hrm7Ju3oWCwV@ep-divine-wildflower-adz7arpu.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Alternative Database URLs (if primary fails):**
```
# Supabase Option 1:
postgresql://postgres.gtnrolsbynawoxjypmsc:youranidiot54321@aws-0-us-east-2.pooler.supabase.com:6543/postgres

# Supabase Option 2:
postgresql://postgres.adwdvlqbecfdvcgfwmtk:Ideaflow2024!@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

**Environment Variables Required:**
```bash
DATABASE_URL=postgresql://neondb_owner:npg_hrm7Ju3oWCwV@ep-divine-wildflower-adz7arpu.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
```

## Quick Start

### 1. Install Python Dependencies
```bash
cd your-project-folder
pip install -r python_requirements.txt
# or if using uv:
uv pip install -r python_requirements.txt
```

**Required Python packages:**
- flask, flask-cors, flask-socketio
- psycopg2-binary, sqlalchemy
- stripe, requests
- numpy, pandas, scikit-learn, spacy, plotly

### 2. Install Node.js Dependencies
```bash
cd ideaflow-react
npm install
```

### 3. Set Environment Variables
Create a `.env` file in the root directory:
```bash
DATABASE_URL=postgresql://neondb_owner:npg_hrm7Ju3oWCwV@ep-divine-wildflower-adz7arpu.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
```

**Alternative setup (export environment variables directly):**
```bash
export DATABASE_URL="postgresql://neondb_owner:npg_hrm7Ju3oWCwV@ep-divine-wildflower-adz7arpu.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
export STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key_here"
```

### 4. Start the Servers

**Terminal 1 - API Server:**
```bash
python api_server.py
```
This starts the Flask API server on http://localhost:8000

**Terminal 2 - React Frontend:**
```bash
cd ideaflow-react
npm run dev -- --host 0.0.0.0 --port 5000
```
This starts the React development server on http://localhost:5000

### 5. Access the Application
Open your browser and go to: **http://localhost:5000**

## Demo Accounts

### Facilitators (can create sessions):
- Username: `facilitator`
- Password: `password123`

### Participants (can join sessions):
- Username: `participant1`
- Password: `password123`
- Username: `testing1`
- Password: `password123`
- Username: `nika`
- Password: `password123`

## Testing Stripe Integration

Use these test cards for subscription checkout:
- **Visa:** 4242 4242 4242 4242
- **Mastercard:** 5555 5555 5555 4444
- **Declined:** 4000 0000 0000 0002

## Project Structure

```
├── api_server.py           # Flask API server
├── ideaflow-react/         # React frontend application
├── utils/                  # Database utilities
├── stripe_config.py        # Stripe payment configuration
└── requirements.txt        # Python dependencies
```

## Subscription Plans

- **Basic Plan:** $10/month, 2 sessions, 5 participants max
- **Pro Plan:** $14.99/month, 12 sessions, 10 participants max

## Troubleshooting

### Database Connection Issues
If you get database connection errors, verify:
1. Your internet connection is stable
2. The DATABASE_URL environment variable is set correctly
3. No firewall is blocking port 5432

### Port Already in Use
If ports 5000 or 8000 are busy:
```bash
# Kill processes on port 5000
lsof -ti:5000 | xargs kill -9

# Kill processes on port 8000
lsof -ti:8000 | xargs kill -9
```

### Missing Dependencies
If you get import errors:
```bash
# For Python packages
pip install flask flask-cors flask-socketio psycopg2-binary sqlalchemy stripe requests

# For Node.js packages
cd ideaflow-react && npm install
```

## Features Included

✅ Real-time collaborative brainstorming sessions
✅ Six-phase workflow (Setup → Ideas → Review → Voting → AI Analysis → Action Planning)
✅ Stripe subscription billing with usage tracking
✅ Session and participant limit enforcement
✅ AI-powered idea clustering and theme generation
✅ WebSocket real-time updates
✅ Anonymous idea submission with facilitator attribution
✅ Vote allocation and results analysis
✅ Timer coordination across all participants

## Need Help?

The application includes comprehensive error handling and user-friendly messages. If you encounter issues, check the browser console and terminal output for detailed error information.