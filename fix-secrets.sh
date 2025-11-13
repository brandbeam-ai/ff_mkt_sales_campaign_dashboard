#!/bin/sh
# Script to remove secrets from ecosystem.config.js during filter-branch

if git checkout HEAD -- ecosystem.config.js 2>/dev/null; then
  # Remove secrets using sed (works in git bash)
  sed -i "s/|| 'patYAN[^']*'/|| ''/g" ecosystem.config.js
  sed -i "s/|| 'sk-ant-api03[^']*'/|| ''/g" ecosystem.config.js
  git add ecosystem.config.js
fi


