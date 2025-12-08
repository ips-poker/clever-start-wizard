/**
 * Server Configuration
 */

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  
  // CORS
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map(origin => origin.trim()),
  
  // Game settings
  defaultActionTimeSeconds: parseInt(process.env.ACTION_TIME_SECONDS || '30', 10),
  defaultTimeBankSeconds: parseInt(process.env.TIME_BANK_SECONDS || '60', 10),
  maxPlayersPerTable: parseInt(process.env.MAX_PLAYERS_PER_TABLE || '9', 10),
  
  // Security
  jwtSecret: process.env.JWT_SECRET || 'change-this-in-production',
  
  // Redis (optional, for scaling)
  redisUrl: process.env.REDIS_URL || '',
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Validate required configuration
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0 && config.nodeEnv === 'production') {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}
