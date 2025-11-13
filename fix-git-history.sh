#!/bin/bash

# Script to fix git history by removing secrets from a specific commit
# This will rewrite git history - use with caution!

echo "🔧 Fixing Git History to Remove Secrets"
echo ""
echo "⚠️  WARNING: This will rewrite git history!"
echo "   Make sure you're the only one working on this branch."
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# The commit with secrets
COMMIT_HASH="c2b824aa52b72841509ccf13b48296abc46e75d9"

echo ""
echo "📋 Checking commit history..."
git log --oneline -5

echo ""
echo "🔍 Checking if commit $COMMIT_HASH exists..."
if git cat-file -e "$COMMIT_HASH^{commit}" 2>/dev/null; then
    echo "✅ Commit found"
    
    # Check if it's the HEAD commit
    if [ "$(git rev-parse HEAD)" = "$COMMIT_HASH" ]; then
        echo "📝 This is the HEAD commit - amending it..."
        
        # Checkout the file from before the commit (parent)
        git checkout HEAD~1 -- ecosystem.config.js 2>/dev/null || echo "File didn't exist in parent commit"
        
        # If file doesn't exist, create clean version
        if [ ! -f ecosystem.config.js ]; then
            echo "Creating clean ecosystem.config.js..."
            cp ecosystem.config.js.example ecosystem.config.js 2>/dev/null || echo "Example file not found"
        fi
        
        # Amend the commit
        git add ecosystem.config.js
        git commit --amend --no-edit
        
        echo "✅ Commit amended"
    else
        echo "⚠️  Commit is not HEAD - need interactive rebase"
        echo ""
        echo "Run this manually:"
        echo "  git rebase -i $COMMIT_HASH^"
        echo "  # Change 'pick' to 'edit' for the commit with secrets"
        echo "  # Remove secrets from ecosystem.config.js"
        echo "  git add ecosystem.config.js"
        echo "  git commit --amend --no-edit"
        echo "  git rebase --continue"
        exit 1
    fi
else
    echo "❌ Commit not found in current branch"
    exit 1
fi

echo ""
echo "✅ History fixed! Now push with:"
echo "   git push --force"
echo ""
echo "⚠️  Remember: Only force push if you're the only one on this branch!"


