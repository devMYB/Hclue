# Database Dashboard Access Links

## 🎯 Your Active Database (Supabase)
Your IdeaFlow app is currently using the **Supabase database** which you can access here:

**Supabase Dashboard:**
```
https://supabase.com/dashboard/project/gtnrolsbynawoxjypmsc/database/tables
```

**Login Credentials:**
- This uses the project ID: `gtnrolsbynawoxjypmsc`
- Connection: `aws-0-us-east-2.pooler.supabase.com:6543`

## 📊 Alternative Database (Neon)
Your project also has a Neon database configured:

**Neon Dashboard:**
```
https://console.neon.tech/app/projects
```

**Database Details:**
- Project endpoint: `ep-divine-wildflower-adz7arpu.c-2.us-east-1.aws.neon.tech`
- Database: `neondb`

## 🔍 Quick Access Summary

### Option 1: Supabase Web Interface (Currently Active)
1. Go to: https://supabase.com/dashboard/project/gtnrolsbynawoxjypmsc/database/tables
2. View all your tables: users, sessions, ideas, votes, participants, themes
3. Run SQL queries directly in the web interface
4. View real-time data updates

### Option 2: Neon Web Interface  
1. Go to: https://console.neon.tech/app/projects
2. Find your project: ep-divine-wildflower-adz7arpu
3. Access SQL Editor and Tables view
4. Run queries and manage data

### Option 3: Command Line (Local)
```bash
python view_data.py
```

## 🔗 Direct Table Access URLs

If you're logged into Supabase, these direct links will take you to specific tables:

- **Users:** https://supabase.com/dashboard/project/gtnrolsbynawoxjypmsc/editor/users
- **Sessions:** https://supabase.com/dashboard/project/gtnrolsbynawoxjypmsc/editor/sessions  
- **Ideas:** https://supabase.com/dashboard/project/gtnrolsbynawoxjypmsc/editor/ideas
- **Votes:** https://supabase.com/dashboard/project/gtnrolsbynawoxjypmsc/editor/votes

## ⚠️ Important Notes

1. **Active Database:** Your app is currently connected to the Supabase database (gtnrolsbynawoxjypmsc)
2. **Data Location:** All your real session data, user accounts, and subscription info is in Supabase
3. **Neon Status:** The Neon database appears to be disabled/inactive currently
4. **Access:** You'll need to be logged into your Supabase account to access the dashboard

## 🛠️ Troubleshooting

If you can't access the Supabase dashboard:
1. Make sure you're logged into the correct Supabase account
2. The project ID is: `gtnrolsbynawoxjypmsc`
3. Use the command line viewer as backup: `python view_data.py`