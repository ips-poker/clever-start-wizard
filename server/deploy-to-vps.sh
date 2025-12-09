#!/bin/bash
# ===========================================
# Syndikatet Poker Server - VPS Deployment
# Server: 89.111.155.224 (Ubuntu 22.04)
# ===========================================

set -e

echo "🎰 Syndikatet Poker Server Deployment"
echo "======================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
SERVER_IP="89.111.155.224"
APP_DIR="/opt/poker-server"
DOMAIN="poker.syndikatet.ru"  # Change to your domain

echo -e "${YELLOW}Step 1: System Update${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}Step 2: Install Node.js 20${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
node --version
npm --version

echo -e "${YELLOW}Step 3: Install PM2 & Build Tools${NC}"
npm install -g pm2 typescript

echo -e "${YELLOW}Step 4: Install Nginx${NC}"
apt install -y nginx certbot python3-certbot-nginx

echo -e "${YELLOW}Step 5: Create App Directory${NC}"
mkdir -p $APP_DIR
mkdir -p $APP_DIR/logs

echo -e "${YELLOW}Step 6: Copy Files${NC}"
# If running locally, use rsync to copy files to server
# rsync -avz --exclude 'node_modules' --exclude 'dist' ./ root@$SERVER_IP:$APP_DIR/

echo -e "${YELLOW}Step 7: Install Dependencies${NC}"
cd $APP_DIR
npm ci --only=production

echo -e "${YELLOW}Step 8: Build TypeScript${NC}"
npm run build

echo -e "${YELLOW}Step 9: Configure Environment${NC}"
if [ ! -f .env ]; then
    cat > .env << 'EOF'
# Server Configuration
PORT=3001
NODE_ENV=production

# Supabase
SUPABASE_URL=https://mokhssmnorrhohrowxvu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1va2hzc21ub3JyaG9ocm93eHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODUzNDYsImV4cCI6MjA2ODY2MTM0Nn0.ZWYgSZFeidY0b_miC7IyfXVPh1EUR2WtxlEvt_fFmGc

# CORS - Add your domains
CORS_ORIGINS=https://syndikatet.lovableproject.com,https://poker.syndikatet.ru,http://localhost:8080

# Game Settings
ACTION_TIME_SECONDS=30
TIME_BANK_SECONDS=60
MAX_PLAYERS_PER_TABLE=9

# Security
JWT_SECRET=change-this-to-random-secret-key

# Logging
LOG_LEVEL=info
EOF
    echo -e "${RED}⚠️  Edit .env and add SUPABASE_SERVICE_ROLE_KEY${NC}"
fi

echo -e "${YELLOW}Step 10: Configure Nginx${NC}"
cat > /etc/nginx/sites-available/poker << 'EOF'
# Poker Server Nginx Configuration
upstream poker_backend {
    server 127.0.0.1:3001;
    keepalive 64;
}

server {
    listen 80;
    server_name 89.111.155.224 poker.syndikatet.ru;

    # Redirect to HTTPS (uncomment after SSL setup)
    # return 301 https://$host$request_uri;

    location / {
        proxy_pass http://poker_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/poker {
        proxy_pass http://poker_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    location /health {
        proxy_pass http://poker_backend;
        proxy_http_version 1.1;
    }

    location /api/ {
        proxy_pass http://poker_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

ln -sf /etc/nginx/sites-available/poker /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo -e "${YELLOW}Step 11: Start with PM2${NC}"
cd $APP_DIR
pm2 delete poker-server 2>/dev/null || true
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup

echo -e "${YELLOW}Step 12: Configure Firewall${NC}"
ufw allow ssh
ufw allow http
ufw allow https
ufw allow 3001/tcp
ufw --force enable

echo ""
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo "Server Status:"
echo "=============="
pm2 status
echo ""
echo "Endpoints:"
echo "=========="
echo "  Health: http://$SERVER_IP/health"
echo "  API:    http://$SERVER_IP/api/"
echo "  WS:     ws://$SERVER_IP/ws/poker"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Edit /opt/poker-server/.env - add SUPABASE_SERVICE_ROLE_KEY"
echo "2. pm2 restart poker-server"
echo "3. Test: curl http://$SERVER_IP/health"
echo ""
echo -e "${YELLOW}For SSL (HTTPS):${NC}"
echo "certbot --nginx -d poker.syndikatet.ru"
