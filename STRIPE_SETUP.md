# Stripe Setup Instructions

## Quick Setup

To enable Stripe payments, you need to set your Stripe API key.

### Option 1: Create a .env file (Recommended)

1. Create a file named `.env` in the root directory (same folder as `api_server.py`)

2. Add the following content:
```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
```

3. Replace `sk_test_your_stripe_secret_key_here` with your actual Stripe test key from https://dashboard.stripe.com/test/apikeys

### Option 2: Set Environment Variable in PowerShell

Before starting the backend server, run:
```powershell
$env:STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key_here"
python api_server.py
```

### Option 3: Set Environment Variable for the Session

To set it permanently for the current PowerShell session:
```powershell
[Environment]::SetEnvironmentVariable("STRIPE_SECRET_KEY", "sk_test_your_stripe_secret_key_here", "User")
```

Then restart your PowerShell window and start the server.

## Getting Your Stripe API Key

1. Go to https://dashboard.stripe.com/test/apikeys
2. Sign in or create a Stripe account
3. Copy your **Secret key** (starts with `sk_test_`)
4. Use it in one of the options above

## Important Notes

- **Never commit your `.env` file to Git** - it contains sensitive information
- Use **test keys** (starting with `sk_test_`) for development
- Use **live keys** (starting with `sk_live_`) only in production
- The `.env` file is already in `.gitignore` to prevent accidental commits

