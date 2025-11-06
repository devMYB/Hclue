# Supabase-Only Configuration

## 🎯 **Supabase Database Setup**

Your IdeaFlow application is now configured to use **only Supabase PostgreSQL**.

### **Environment Variables**

Set these environment variables:

```bash
# Supabase Database Connection
export DATABASE_URL="postgresql://postgres:Youranidiot54321@db.gtnrolsbynawoxjypmsc.supabase.co:5432/postgres"

# Supabase API Configuration (for frontend)
export NEXT_PUBLIC_SUPABASE_URL="https://gtnrolsbynawoxjypmsc.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0bnJvbHNieW5hd294anlwbXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NTY1NzcsImV4cCI6MjA2NDAzMjU3N30.UmSt8PNv4jHJPycQbMdi6ZdqdebKOF6Kkiz06VP00g8"

# JWT Secret (change in production)
export JWT_SECRET_KEY="your-supabase-jwt-secret-key-change-in-production"

# Optional: Redis for WebSocket scaling
export REDIS_URL="redis://localhost:6379"
```

### **Frontend Environment Variables**

Create `ideaflow-react/.env.development`:
```bash
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://gtnrolsbynawoxjypmsc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0bnJvbHNieW5hd294anlwbXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NTY1NzcsImV4cCI6MjA2NDAzMjU3N30.UmSt8PNv4jHJPycQbMdi6ZdqdebKOF6Kkiz06VP00g8
```

## 🗄️ **Database Access**

### **Supabase Dashboard**
- **URL**: https://supabase.com/dashboard/project/gtnrolsbynawoxjypmsc/database/tables
- **Features**: Table editor, SQL editor, real-time data viewing

### **Direct Connection**
```bash
# Using psql
psql "postgresql://postgres:Youranidiot54321@db.gtnrolsbynawoxjypmsc.supabase.co:5432/postgres"

# Using any PostgreSQL client
# Host: db.gtnrolsbynawoxjypmsc.supabase.co
# Port: 5432
# Database: postgres
# Username: postgres
# Password: Youranidiot54321
```

## 🚀 **Quick Start**

1. **Set environment variables:**
```bash
export DATABASE_URL="postgresql://postgres:Youranidiot54321@db.gtnrolsbynawoxjypmsc.supabase.co:5432/postgres"
export JWT_SECRET_KEY="your-supabase-jwt-secret-key"
```

2. **Start the application:**
```bash
python api_server.py
```

3. **Verify connection:**
```bash
curl http://localhost:8000/api/health
```

## ✅ **Benefits of Supabase-Only Setup**

- **Cloud-hosted**: No local database setup needed
- **Real-time**: Built-in real-time subscriptions
- **Scalable**: Automatic scaling with Supabase
- **Managed**: No database maintenance required
- **Secure**: Built-in security and authentication
- **Dashboard**: Web interface for data management

## 🔧 **Database Schema**

The application will automatically create these tables in your Supabase database:

- `users` - User accounts and authentication
- `sessions` - Ideation sessions
- `participants` - Session participants
- `ideas` - Submitted ideas
- `votes` - Voting data
- `themes` - AI-generated themes
- `session_timers` - Persistent timer state
- `user_subscriptions` - Subscription management

## 🎯 **Next Steps**

1. Set the environment variables above
2. Start your application: `python api_server.py`
3. Access your database via Supabase dashboard
4. Your application is now fully Supabase-powered! 🚀
