# Deployment Guide - Virtual Café

## Quick Start (Local Development)

### Prerequisites
- Node.js 14+ 
- npm 6+

### Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm start
   ```

3. **Open in Browser**
   ```
   http://localhost:3000
   ```

---

## Deployment Options

### Option 1: Heroku Deployment

1. **Create Heroku App**
   ```bash
   heroku create virtual-cafe-app
   ```

2. **Deploy Code**
   ```bash
   git push heroku main
   ```

3. **View Application**
   ```bash
   heroku open
   ```

4. **View Logs**
   ```bash
   heroku logs --tail
   ```

### Option 2: Railway.app Deployment

1. **Connect GitHub Repository**
   - Go to railway.app
   - Click "New Project"
   - Select "GitHub Repo"

2. **Configure Environment**
   - Set `PORT` to `3000`
   - Set `NODE_ENV` to `production`

3. **Deploy**
   - Railway will auto-deploy on GitHub push

### Option 3: AWS EC2 Deployment

1. **Launch EC2 Instance**
   - Ubuntu 20.04 LTS
   - t2.micro or larger

2. **Connect via SSH**
   ```bash
   ssh -i "key.pem" ec2-user@your-instance-ip
   ```

3. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd virtual-cafe
   ```

5. **Install Dependencies**
   ```bash
   npm install --production
   ```

6. **Setup PM2 (Process Manager)**
   ```bash
   sudo npm install -g pm2
   pm2 start server.js --name "virtual-cafe"
   pm2 startup
   pm2 save
   ```

7. **Setup Nginx (Reverse Proxy)**
   ```bash
   sudo apt-get install nginx
   sudo nano /etc/nginx/sites-available/default
   ```

   Add:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   Restart Nginx:
   ```bash
   sudo systemctl restart nginx
   ```

8. **Setup SSL (Optional)**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Option 4: Docker Deployment

1. **Create Dockerfile**
   See included `Dockerfile` or create:
   ```dockerfile
   FROM node:16-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --production
   COPY . .
   EXPOSE 3000
   CMD ["node", "server.js"]
   ```

2. **Build Image**
   ```bash
   docker build -t virtual-cafe:latest .
   ```

3. **Run Container**
   ```bash
   docker run -p 3000:3000 virtual-cafe:latest
   ```

4. **Push to Docker Hub** (optional)
   ```bash
   docker tag virtual-cafe:latest username/virtual-cafe:latest
   docker push username/virtual-cafe:latest
   ```

### Option 5: DigitalOcean App Platform

1. **Connect GitHub Repository**
   - Go to DigitalOcean Dashboard
   - Click "Create" → "Apps"
   - Select GitHub Repository

2. **Configure**
   - Runtime: Node.js
   - Build: `npm install`
   - Run: `npm start`
   - Port: `3000`

3. **Deploy**
   - Click "Create Resources"
   - DigitalOcean will handle deployment

---

## Environment Variables

Create a `.env` file (or set in deployment platform):

```env
PORT=3000
NODE_ENV=production
SOCKET_CORS_ORIGIN=https://your-domain.com
```

---

## Database Integration (Optional)

### MongoDB Atlas

1. Create account at mongodb.com/cloud/atlas
2. Create cluster
3. Get connection string
4. Update in `.env`:
   ```env
   DATABASE_URL=mongodb+srv://user:password@cluster.mongodb.net/dbname
   ```

### PostgreSQL

1. Create database
2. Update in `.env`:
   ```env
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   ```

---

## Performance Optimization

### Enable Gzip Compression
Add to server.js:
```javascript
const compression = require('compression');
app.use(compression());
```

### Add Caching Headers
```javascript
app.use(express.static('public', {
  maxAge: '1d'
}));
```

### Use CDN for Static Assets
- Upload `public/` to AWS S3 or Cloudflare
- Update HTML to point to CDN URLs

---

## Monitoring & Logging

### Setup Application Monitoring
- **Sentry**: Error tracking
- **New Relic**: Performance monitoring
- **DataDog**: Log aggregation
- **LogRocket**: Frontend monitoring

### Example: Sentry Integration
```bash
npm install @sentry/node
```

```javascript
const Sentry = require("@sentry/node");
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

---

## Scaling Considerations

### Horizontal Scaling

1. **Use Redis for Session Store**
   ```bash
   npm install redis socket.io-redis
   ```

2. **Connect to Redis**
   ```javascript
   const redis = require('redis');
   const adapter = require('socket.io-redis');
   io.adapter(adapter({
     host: process.env.REDIS_HOST,
     port: process.env.REDIS_PORT
   }));
   ```

3. **Load Balancer Setup**
   - Use Nginx or AWS Load Balancer
   - Configuration: Round-robin load balancing
   - Sticky sessions: Yes (for WebSocket)

### Database Scaling
- Add read replicas
- Implement caching layer (Redis)
- Use connection pooling

---

## Backup & Recovery

### Database Backup
```bash
# MongoDB
mongodump --archive=backup.archive

# PostgreSQL
pg_dump dbname > backup.sql
```

### Automated Backups
- Use managed database services (MongoDB Atlas, AWS RDS)
- Setup daily backups
- Test recovery procedures

---

## Security Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Disable debug logging
- [ ] Use HTTPS/SSL certificates
- [ ] Implement rate limiting
- [ ] Add CORS headers
- [ ] Sanitize user inputs
- [ ] Use environment variables for secrets
- [ ] Enable WebSocket authentication
- [ ] Regular security updates
- [ ] Monitor for suspicious activity

---

## Troubleshooting

### Port Already in Use
```bash
# Change port in .env
PORT=4000
```

### WebSocket Connection Failed
- Check CORS settings
- Verify domain in `SOCKET_CORS_ORIGIN`
- Check firewall rules

### Memory Leaks
- Monitor with `node --inspect`
- Use tools like Clinic.js
- Check for unbounded event listeners

### Database Connection Issues
- Verify connection string
- Check firewall/IP whitelist
- Test with native client

---

## Rollback Plan

1. Keep previous versions tagged in git
2. Maintain database backups
3. Document deployment steps
4. Have rollback procedure:
   ```bash
   git revert <commit-hash>
   git push
   ```

---

## Support

For deployment issues, consult the platform-specific documentation or reach out to the development team.

**Last Updated**: March 30, 2026
