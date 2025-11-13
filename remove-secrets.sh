#!/bin/bash
if [ -f ecosystem.config.js ]; then
  sed -i "s/|| 'patYAN[^']*'/|| ''/g" ecosystem.config.js
  sed -i "s/|| 'sk-ant-api03[^']*'/|| ''/g" ecosystem.config.js
  git add ecosystem.config.js
fi


