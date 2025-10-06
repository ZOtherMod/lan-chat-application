## Quick Start Guide

## Option 1: Using the Batch Files (Windows - Easiest)

### Step 1: Start the Server
1. Navigate to the `backend` folder
2. Double-click `start-server.bat`  
3. Wait for it to show the server IP address
4. Keep this window open

### Step 2: Start the Frontend
1. Navigate to the `frontend` folder
2. Double-click `start-frontend.bat`
3. Wait for your browser to open automatically
4. Keep this window open

### Step 3: Start Chatting!
1. Enter your nickname
2. Choose "Connect to Local Server" 
3. Start chatting!

---

## Option 2: Manual Setup (All Operating Systems)

### Prerequisites
- Python 3.7+ installed
- Node.js 14+ and npm installed

### Start the Backend Server

```bash
# Open terminal/command prompt
cd "backend"
pip install -r requirements.txt
python server.py
```

### Start the Frontend (New Terminal)

```bash  
# Open a new terminal/command prompt
cd "frontend"
npm install
npm start
```

---

## 💡 Tips

### For the Host (Person Running the Server):
- The server will display your **computer name** (like "John-PC" or "MyLaptop")  
- Share this computer name with friends who want to join
- Choose "Connect to Local Server" in the app

### For Friends Joining (Super Easy!):
- Get the host's **computer name** (not IP address!)
- Choose "Find Server by Name"
- Enter the computer name (e.g., "John-PC")
- Click "Find & Connect" - that's it!

### Alternative Methods:
- **Auto-Scan**: Choose "Browse Available Servers" → "Scan for Servers"
- **Manual IP**: Choose "Manual IP Connection" if you prefer the old way

### Troubleshooting:
- Make sure everyone is on the same WiFi network
- If connection fails, try temporarily disabling firewall
- Check that the server window is still running

---

**That's it! You should now have a working LAN chat application!**