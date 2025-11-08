# Railway Deployment Guide

This guide explains how to deploy the Hostel Management System on Railway with both frontend and backend services.

## Architecture Overview

**Two-Service Deployment (Recommended)**:
- **Backend Service**: Express.js API (Node.js)
- **Frontend Service**: React SPA served with `serve`
- **Database**: MongoDB Atlas (external) or Railway MongoDB plugin

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **MongoDB Database**:
   - Option A: MongoDB Atlas (free tier available)
   - Option B: Railway MongoDB plugin (paid)
3. **GitHub Repository**: Push your code to GitHub

---

## Step-by-Step Deployment

### 1. Database Setup

#### Option A: MongoDB Atlas (Recommended for free tier)
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Create database user with password
4. Whitelist all IPs: `0.0.0.0/0` (for Railway dynamic IPs)
5. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/hostel-management`

#### Option B: Railway MongoDB Plugin
1. In Railway dashboard, click **"New"** → **"Database"** → **"Add MongoDB"**
2. Copy the `MONGO_URL` from plugin variables

---

### 2. Deploy Backend Service

1. **Create New Project** in Railway dashboard
2. **Click "New"** → **"GitHub Repo"** → Select your repository
3. **Configure Service**:
   - Name: `hostel-backend`
   - **IMPORTANT: Root Directory: `backend`** (no leading slash)
   - Railway will automatically detect `nixpacks.toml` and use it
   - Build and start commands are configured in `backend/nixpacks.toml`

4. **Add Environment Variables**:
   Go to service **Variables** tab and add:
   ```env
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=<your-mongodb-connection-string>
   JWT_SECRET=<generate-random-secret>
   JWT_REFRESH_SECRET=<generate-random-secret>
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   UPLOADS_DIR=./uploads
   MAX_FILE_SIZE=10485760
   CORS_ORIGIN=*
   ```

   **Generate Secrets**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. **Generate Domain**:
   - Go to **Settings** → **Networking** → **Generate Domain**
   - Copy the URL (e.g., `https://hostel-backend-production.up.railway.app`)
   - This is your `BACKEND_URL`

6. **Deploy**: Railway will auto-deploy on push

---

### 3. Deploy Frontend Service

1. **In Same Project**, click **"New Service"** → **"GitHub Repo"** → Same repository
2. **Configure Service**:
   - Name: `hostel-frontend`
   - **IMPORTANT: Root Directory: `frontend`** (no leading slash)
   - Railway will automatically detect `nixpacks.toml` and use it
   - Build and start commands are configured in `frontend/nixpacks.toml`

3. **Add Environment Variables**:
   Go to service **Variables** tab and add:
   ```env
   VITE_API_URL=<BACKEND_URL>/api
   ```

   Example:
   ```env
   VITE_API_URL=https://hostel-backend-production.up.railway.app/api
   ```

4. **Generate Domain**:
   - Go to **Settings** → **Networking** → **Generate Domain**
   - Copy the URL (e.g., `https://hostel-frontend-production.up.railway.app`)
   - This is your frontend URL

5. **Update Backend CORS**:
   Go back to backend service variables and update:
   ```env
   CORS_ORIGIN=https://hostel-frontend-production.up.railway.app
   ```
   Or use wildcard for testing:
   ```env
   CORS_ORIGIN=*
   ```

6. **Deploy**: Railway will auto-deploy

---

## Configuration Files Included

### Backend: `backend/nixpacks.toml`
```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["npm ci --production=false"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm run start"
```

### Frontend: `frontend/nixpacks.toml`
```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["npm ci --production=false"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm run start"
```

**Note**: Railway automatically detects and uses `nixpacks.toml` when present in the root directory of your service.

---

## Environment Variables Summary

### Backend Environment Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port (auto-set by Railway) | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |
| `JWT_SECRET` | JWT signing secret | `<random-64-char-hex>` |
| `JWT_REFRESH_SECRET` | Refresh token secret | `<random-64-char-hex>` |
| `JWT_EXPIRES_IN` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
| `UPLOADS_DIR` | File upload directory | `./uploads` |
| `MAX_FILE_SIZE` | Max upload size in bytes | `10485760` (10MB) |
| `CORS_ORIGIN` | Frontend URL for CORS | `https://your-frontend.railway.app` |

### Frontend Environment Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API endpoint | `https://your-backend.railway.app/api` |

---

## Post-Deployment Tasks

### 1. Seed Database (Optional)
Run from your local machine with production DB:
```bash
cd backend
MONGODB_URI=<production-db-url> npm run seed
```

Or use Railway CLI:
```bash
railway run npm run seed
```

### 2. Test the Deployment
1. Visit frontend URL
2. Login with admin credentials:
   - Email: `admin@hostel.com`
   - Password: `admin123` (or your seeded password)

### 3. Custom Domain (Optional)
1. Go to **Settings** → **Networking** → **Custom Domain**
2. Add your domain (e.g., `hostel.yourdomain.com`)
3. Update CORS_ORIGIN in backend to match

---

## Troubleshooting

### Build Failures

**Issue**: Frontend build fails with TypeScript errors
**Solution**:
```bash
# Locally test the build
cd frontend
npm run build
```
Fix any TypeScript errors before pushing.

**Issue**: Backend build fails
**Solution**:
```bash
cd backend
npm run build
```

### CORS Errors

**Issue**: Frontend can't connect to backend
**Solution**:
1. Check `CORS_ORIGIN` in backend matches frontend URL exactly
2. Ensure `VITE_API_URL` includes `/api` path
3. Both URLs should use `https://`

### Database Connection Issues

**Issue**: Backend can't connect to MongoDB
**Solution**:
1. Check `MONGODB_URI` is correct
2. For MongoDB Atlas, whitelist `0.0.0.0/0` in Network Access
3. Check database user credentials

### Environment Variables Not Loading

**Issue**: `VITE_API_URL` is undefined
**Solution**:
- Vite requires rebuild when env vars change
- Trigger redeploy or push a new commit

---

## Monitoring and Logs

### View Logs
- Railway Dashboard → Select Service → **Deployments** tab
- Click on deployment to see real-time logs

### Common Log Issues

**Backend Logs**:
```
Error: connect ECONNREFUSED
```
→ MongoDB connection issue, check `MONGODB_URI`

**Frontend Logs**:
```
404 on /api/auth/login
```
→ Check `VITE_API_URL` is correct

---

## Cost Estimation

**Railway Pricing** (as of 2024):
- **Free Trial**: $5 credit/month
- **Hobby Plan**: $5/month (includes $5 usage credit)
- **Pro Plan**: $20/month (includes $20 usage credit)

**Estimated Usage**:
- Backend: ~$2-5/month (depends on traffic)
- Frontend: ~$1-3/month (static serving is cheap)
- MongoDB Plugin: ~$5/month (or use Atlas free tier)

**Total**: $3-8/month with Atlas free tier

---

## Alternative: Single Service Deployment

If you want to minimize costs, you can serve frontend from backend:

### Setup
1. Build frontend locally: `cd frontend && npm run build`
2. Copy `frontend/dist` to `backend/public`
3. Add static serving in `backend/src/app.ts`:
   ```typescript
   import express from 'express';
   import path from 'path';

   // ... existing code ...

   // Serve frontend in production
   if (process.env.NODE_ENV === 'production') {
     app.use(express.static(path.join(__dirname, '../public')));
     app.get('*', (req, res) => {
       res.sendFile(path.join(__dirname, '../public/index.html'));
     });
   }
   ```
4. Deploy only backend service

**Pros**: Single service = lower cost
**Cons**: Less flexible, harder to scale independently

---

## Continuous Deployment

Railway automatically deploys on git push:
1. Push to GitHub main/master branch
2. Railway detects changes
3. Rebuilds and redeploys affected services

**Branch Deployments**:
- Create new branch in GitHub
- Railway can auto-deploy preview environments
- Configure in **Settings** → **Environments**

---

## Security Checklist

- [ ] Use strong JWT secrets (64+ character random strings)
- [ ] Set `NODE_ENV=production` in backend
- [ ] Configure specific `CORS_ORIGIN` (not wildcard `*`)
- [ ] Use HTTPS for all URLs
- [ ] Enable MongoDB authentication
- [ ] Whitelist only necessary IPs in MongoDB (if possible)
- [ ] Don't commit `.env` files to Git
- [ ] Rotate JWT secrets periodically
- [ ] Set up Railway's built-in DDoS protection

---

## Support Resources

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **MongoDB Atlas**: [docs.atlas.mongodb.com](https://docs.atlas.mongodb.com)

---

## Quick Deploy Checklist

- [ ] MongoDB database created and connection string copied
- [ ] Backend service deployed with all env vars
- [ ] Backend domain generated
- [ ] Frontend service deployed with `VITE_API_URL`
- [ ] Frontend domain generated
- [ ] Backend `CORS_ORIGIN` updated with frontend URL
- [ ] Database seeded (optional)
- [ ] Admin login tested
- [ ] CSV import tested (Phase 1 feature)

---

**Deployment Complete!** 🚀

Your Hostel Management System is now live on Railway with both frontend and backend services running independently.
