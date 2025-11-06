# GitHub Push Instructions

## Issue
GitHub no longer supports password authentication for Git operations. You need to use a **Personal Access Token (PAT)** instead.

## Solution: Create a Personal Access Token

1. **Go to GitHub Settings:**
   - Visit: https://github.com/settings/tokens
   - Or: Click your profile picture → Settings → Developer settings → Personal access tokens → Tokens (classic)

2. **Generate New Token:**
   - Click "Generate new token" → "Generate new token (classic)"
   - Give it a name: "Hclue Repository Access"
   - Select expiration (or "No expiration" for convenience)
   - **Select scopes:**
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (if you plan to use GitHub Actions)

3. **Copy the Token:**
   - Click "Generate token"
   - **IMPORTANT:** Copy the token immediately - you won't see it again!
   - It will look like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

4. **Push Using the Token:**
   ```powershell
   git push https://devMYB:YOUR_TOKEN_HERE@github.com/devMYB/Hclue.git main
   ```

   Replace `YOUR_TOKEN_HERE` with your actual PAT.

## Alternative: Use Git Credential Manager

You can also set up Git Credential Manager to store your credentials:

```powershell
# Set up credential helper
git config --global credential.helper manager-core

# Then push (it will prompt for username and token)
git push origin main
```

When prompted:
- Username: `devMYB`
- Password: Enter your **Personal Access Token** (not your GitHub password)

## Quick Push Command (After Getting PAT)

Once you have your PAT, run:
```powershell
git push https://devMYB:YOUR_PAT_HERE@github.com/devMYB/Hclue.git main
```

## Security Note

⚠️ **Never commit your PAT to the repository!** Always use it only for authentication during push operations.

