const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  const env = {
    NODE_ENV: 'production',
    PORT: 3022,
    NEXT_PUBLIC_BASE_URL: 'http://localhost:3022'
  };

  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf-8');
    envFile.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...rest] = trimmed.split('=');
        if (key && rest.length > 0) {
          const value = rest.join('=').trim();
          // Remove quotes if present
          const cleanValue = value.replace(/^["']|["']$/g, '');
          env[key.trim()] = cleanValue;
        }
      }
    });
  } else {
    console.warn('⚠️  .env.local file not found. Make sure to create it with required environment variables.');
  }

  return env;
}

module.exports = {
  apps: [{
    name: 'ff-mkt-sale-dashboard',
    script: 'npm',
    args: 'start',
    cwd: process.cwd(),
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: loadEnvFile(),
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};

