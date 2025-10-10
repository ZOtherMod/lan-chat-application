# Deploy to Render

## Backend Deployment

1. Go to [render.com](https://render.com) and sign up
2. Connect your GitHub account
3. Create new Web Service from your repository
4. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python server.py`
   - **Environment**: Python 3

## Frontend Configuration

After backend deployment, update the frontend:
1. Replace `your-chat-server` in `frontend/src/components/ServerSelection.js` with your actual Render service name
2. Your server URL will be: `https://YOUR-SERVICE-NAME.onrender.com`
3. Use `wss://` (secure WebSocket) for the frontend connection

## Usage

1. Deploy backend to Render
2. Update frontend with your server URL  
3. Frontend automatically deploys via GitHub Pages
4. Share the GitHub Pages URL for others to connect!