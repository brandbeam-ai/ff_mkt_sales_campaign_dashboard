# Fix Git Secrets Issue

## Problem
GitHub blocked your push because API keys were detected in `ecosystem.config.js`.

## Solution

### Option 1: Amend the Previous Commit (Recommended)

Since the secrets are in the previous commit, you need to amend it:

```bash
# Stage the fixed file
git add ecosystem.config.js

# Amend the previous commit (this will rewrite history)
git commit --amend --no-edit

# Force push (since we're rewriting history)
git push --force
```

**Note:** Only do this if you're the only one working on this branch, or coordinate with your team first.

### Option 2: Create a New Commit (Safer for Teams)

If others are working on this branch:

```bash
# Stage the fixed file
git add ecosystem.config.js

# Create a new commit that removes the secrets
git commit -m "Remove hardcoded API keys from ecosystem.config.js"

# Push normally
git push
```

**Note:** The secrets will still be in git history, but GitHub will allow the push. You should still consider rotating those API keys since they were exposed.

### Option 3: Rotate API Keys (Most Secure)

Since the keys were exposed in git history, you should rotate them:

1. **Rotate Airtable API Key:**
   - Go to Airtable account settings
   - Revoke the old key
   - Create a new key
   - Update `.env.local` on your server

2. **Rotate Anthropic API Key:**
   - Go to Anthropic console
   - Revoke the old key
   - Create a new key
   - Update `.env.local` on your server

3. Then use Option 1 or 2 above to fix the code

## Prevention

To prevent this in the future:

1. **Never commit API keys** - Always use `.env.local` (which is in `.gitignore`)
2. **Use environment variables** - Load from `.env.local` only
3. **Use GitHub Secrets** - For CI/CD, use GitHub Actions secrets
4. **Review before pushing** - Check `git diff` before committing

## Current Status

✅ `ecosystem.config.js` now only loads from `.env.local`  
✅ No hardcoded secrets in the file  
⚠️ Previous commit still contains secrets (needs to be fixed)


