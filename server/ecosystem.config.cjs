/**
 * PM2 Configuration for Production
 */

module.exports = {
  apps: [
    {
      name: 'poker-server',
      script: 'dist/index.js',
      instances: 1, // Use 1 for WebSocket sticky sessions
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      
      // Graceful shutdown
      kill_timeout: 30000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Health check
      min_uptime: '10s',
      max_restarts: 10
    }
  ]
};
