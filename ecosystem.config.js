const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  const env = {
    NODE_ENV: 'production',
    PORT: 3022,
    NEXT_PUBLIC_BASE_URL: 'http://localhost:3022',
    // These will be loaded from .env.local if it exists
    AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY || '',
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID || 'app0YMWSt1LtrGu7S',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || ''
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
          const cleanKey = key.trim();
          if (cleanKey && cleanValue) {
            env[cleanKey] = cleanValue;
          }
        }
      }
    });
    console.log('✅ Loaded environment variables from .env.local');
    console.log(`   AIRTABLE_API_KEY: ${env.AIRTABLE_API_KEY ? '***SET***' : 'NOT SET'}`);
    console.log(`   AIRTABLE_BASE_ID: ${env.AIRTABLE_BASE_ID || 'default'}`);
    console.log(`   ANTHROPIC_API_KEY: ${env.ANTHROPIC_API_KEY ? '***SET***' : 'NOT SET'}`);
  } else {
    console.warn('⚠️  .env.local file not found. Make sure to create it with required environment variables.');
    console.warn('   Required: AIRTABLE_API_KEY, AIRTABLE_BASE_ID, ANTHROPIC_API_KEY');
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

