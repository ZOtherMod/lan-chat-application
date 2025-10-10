# 🚀 Deploy to Railway (Recommended)

## Step 1: Deploy Backend Server

1. **Create Railway Account**: Go to [Railway.app](https://railway.app) and sign up
2. **Deploy from GitHub**: 
   - Click "Deploy from GitHub repo"
   - Select your `lan-chat-application` repository
   - Railway will automatically detect it's a Python app

3. **Configure Environment Variables** (Optional):
   - `SERVER_NAME`: Set a custom name for your server (default: "OnlineChatServer")
   - `PORT`: Railway sets this automatically, don't change it

4. **Deploy**: Click deploy and wait for completion

## Step 2: Get Your Server URL

After deployment, Railway will give you a URL like:
```
https://your-app-name.railway.app
```

## Step 3: Update Frontend Configuration

1. Edit `frontend/src/config.js`
2. Replace `'wss://your-app-name.railway.app'` with your actual Railway URL
3. **Important**: Use `wss://` (secure WebSocket) not `ws://` for production

Example:
```javascript
ONLINE_SERVER_URL: 'wss://lan-chat-abc123.railway.app',
```

## Step 4: Test Your Online Server

1. Go to your GitHub Pages: `https://zothermod.github.io/lan-chat-application`
2. Click "Connect to Online Server"
3. Your chat is now ONLINE and accessible worldwide! 🌍

---

# Alternative: Deploy to Render

1. Go to [Render.com](https://render.com)
2. Connect your GitHub repository
3. Create a new Web Service
4. Use these settings:
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `python backend/server.py`
   - **Environment**: `RENDER=true`

---

# Security Features for Online Deployment ✅

- 🔐 **AES-256-GCM Encryption**: All messages encrypted end-to-end
- 🛡️ **Input Sanitization**: Prevents XSS and injection attacks  
- 🚦 **Rate Limiting**: Prevents spam and DoS attacks
- 🔑 **Secure Password Hashing**: Uses bcrypt for password protection
- 🌐 **WSS Support**: Secure WebSocket connections for production

Your chat application is now production-ready and secure! 🎉