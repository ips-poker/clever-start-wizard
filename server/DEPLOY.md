# Poker Server Deployment Guide

## Quick Start

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
nano .env
```

### 3. Build & Run

```bash
# Build TypeScript
npm run build

# Run with PM2 (recommended for production)
npm install -g pm2
pm2 start ecosystem.config.cjs --env production

# Or run directly
npm start
```

## Docker Deployment

### Build and Run with Docker Compose

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f poker-server

# Stop
docker-compose down
```

## VPS Setup (Ubuntu 22.04)

### 1. System Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install nginx (optional, for reverse proxy)
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Clone and Setup

```bash
# Clone repository
git clone https://github.com/your-repo/syndikatet-poker.git
cd syndikatet-poker/server

# Install dependencies
npm ci --only=production

# Build
npm run build

# Create .env
cp .env.example .env
nano .env
```

### 3. Configure Nginx

```bash
# Copy nginx config
sudo cp nginx.conf /etc/nginx/sites-available/poker
sudo ln -s /etc/nginx/sites-available/poker /etc/nginx/sites-enabled/

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Start with PM2

```bash
# Start application
pm2 start ecosystem.config.cjs --env production

# Save PM2 process list
pm2 save

# Setup PM2 startup script
pm2 startup
```

## Firewall Configuration

```bash
# Allow SSH, HTTP, HTTPS, and poker server port
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw allow 3001/tcp  # Only if not using nginx
sudo ufw enable
```

## Monitoring

### PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs poker-server

# Monitor resources
pm2 monit

# Restart
pm2 restart poker-server

# Reload (zero-downtime)
pm2 reload poker-server
```

### Health Check

```bash
# Check server health
curl http://localhost:3001/health

# Check stats
curl http://localhost:3001/api/stats
```

## WebSocket Testing

```javascript
// Browser console or Node.js
const ws = new WebSocket('wss://your-domain.com/ws/poker');

ws.onopen = () => {
  console.log('Connected');
  ws.send(JSON.stringify({ type: 'ping' }));
};

ws.onmessage = (event) => {
  console.log('Received:', JSON.parse(event.data));
};
```

## Scaling (Future)

For horizontal scaling with multiple servers:

1. Use Redis for session/state sharing
2. Configure nginx load balancing with sticky sessions
3. Use PM2 cluster mode with shared state

```bash
# Enable Redis in .env
REDIS_URL=redis://localhost:6379
```

## Troubleshooting

### Connection Issues

```bash
# Check if server is running
pm2 status

# Check ports
sudo netstat -tlnp | grep 3001

# Check nginx
sudo nginx -t
sudo systemctl status nginx
```

### Memory Issues

```bash
# Check memory
free -h

# PM2 will auto-restart if memory exceeds 1G
# Adjust in ecosystem.config.cjs if needed
```

### WebSocket Issues

- Ensure nginx is configured for WebSocket upgrade
- Check firewall allows WebSocket connections
- Verify SSL certificate is valid
