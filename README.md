# Online Chat Application
A secure, real-time chat application accessible from anywhere on the internet. Features end-to-end encryption and can be deployed to the cloud for global access. Built with Python WebSocket backend and React frontend.

## Available Online
- Global Access: Connect from anywhere in the world
- Cloud Deployment: Easy deployment to Railway, Render, or Heroku  
- Production Security: Enhanced security for public internet access
- Cross-Platform: Works on any device with a web browser

## Features

### **Communication**
- **Nickname Selection**: Choose a unique nickname before joining
- **Real-time Chat**: Send and receive messages instantly
- **User List**: See who's currently online
- **End-to-End Encryption**: AES-256-GCM encryption for secure messaging

### **Connection**
- **Server Hosting**: Host your own chat server with automatic discovery
- **Server Discovery**: Find servers by computer name (no IP addresses needed!)
- **Smart Connection**: Multiple ways to connect:
  - By computer name (easiest)
  - Auto-scan for available servers
  - Manual IP address entry

### **Security**
- **AES-256-GCM Encryption**: Military-grade message encryption
- **Input Sanitization**: Protection against XSS and injection attacks
- **Rate Limiting**: DoS protection and spam prevention
- **Secure Sessions**: Cryptographically secure session management
- **Message Integrity**: HMAC signatures for tamper detection

## Deployment Options

### Option 1: Online Deployment (Recommended)
Deploy your chat server to the cloud for global access:

1. Deploy Backend: Use Railway, Render, or Heroku (see [DEPLOYMENT.md](DEPLOYMENT.md))
2. Update Config: Set your server URL in `frontend/src/config.js`
3. Access Globally: Anyone can use your chat via GitHub Pages

Live Demo: Try the frontend at `https://zothermod.github.io/lan-chat-application`

### Option 2: Local Network (LAN) Only
Run the server locally for same-network access only.

## Architecture

- **Backend**: Python with WebSockets for real-time communication
- **Frontend**: React.js with modern CSS styling
- **Communication**: JSON messages over WebSocket protocol

## Project Structure

```
Comp Sci Project/
├── backend/
│   ├── server.py          # WebSocket server
│   └── requirements.txt   # Python dependencies
├── frontend/
│   ├── public/
│   │   └── index.html     # HTML template
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── NicknameForm.js
│   │   │   ├── ServerSelection.js
│   │   │   └── ChatRoom.js
│   │   ├── App.js         # Main React app
│   │   ├── App.css        # Styles
│   │   └── index.js       # Entry point
│   └── package.json       # Node.js dependencies
└── README.md             # This file
```

## Quick Start

### Prerequisites

- Python 3.7+ 
- Node.js 14+ and npm
- All devices must be on the same network

### 1. Setup Backend (Python Server)

```bash
# Navigate to backend directory
cd "backend"

# Install Python dependencies  
pip install -r requirements.txt

# Start the server
python server.py
```

The server will display connection information:
```
LAN Chat Server Starting...
Server will be accessible at:
  Local: ws://localhost:8765
  LAN:   ws://192.168.1.100:8765
```

### 2. Setup Frontend (React App)

```bash
# Navigate to frontend directory  
cd "frontend"

# Install Node.js dependencies
npm install

# Start the development server
npm start
```

The React app will open in your browser at `http://localhost:3000`.

## Access Options

### Option A: Full Local Setup (Recommended for hosts)
Run both backend and frontend locally as described above.

### Option B: Use Hosted Frontend (For participants)
Visit the live frontend at: **https://zothermod.github.io/lan-chat-application**
- No need to download or install anything
- Just visit the link and connect to someone's running server
- Still requires someone to be hosting the backend server

## How to Use

### For the Host:
1. Start the Python server (see setup above)
2. Open the React app in your browser
3. Enter your nickname
4. Choose "Connect to Local Server"
5. Share your **computer name** (shown in server console) with others
   - Example: "Connect to MyLaptop" instead of "192.168.1.100:8765"

### For Clients (Multiple Easy Options):

#### Option 1: Connect by Computer Name (Easiest!)
1. Open the React app in your browser  
2. Enter your nickname
3. Choose "Find Server by Name"
4. Enter the host's computer name (e.g., "John-PC", "MyLaptop")
5. Click "Find & Connect" - done!

#### Option 2: Auto-Discover Servers
1. Open the React app in your browser
2. Enter your nickname  
3. Choose "Browse Available Servers"
4. Click "Scan for Servers"
5. Select from the list of found servers

#### Option 3: Manual IP (Advanced)
1. Choose "Manual IP Connection"
2. Enter the host's IP address if you know it
3. Connect normally

## Chat Features

- **Real-time messaging**: Messages appear instantly
- **User notifications**: See when users join/leave
- **Nickname display**: Each message shows sender and timestamp
- **User list**: View all connected users
- **Responsive design**: Works on desktop and mobile

## Technical Details

### WebSocket Messages

The application uses JSON messages for communication:

```javascript
// Set nickname
{
  "type": "set_nickname", 
  "nickname": "username"
}

// Send chat message
{
  "type": "chat_message",
  "content": "Hello everyone!"
}

// Receive chat message  
{
  "type": "chat_message",
  "nickname": "username", 
  "content": "Hello everyone!",
  "timestamp": "2025-10-07T..."
}
```

### Server Configuration

- **WebSocket Port**: 8765 (default)
- **Discovery Port**: 8766 (for server discovery)
- **Protocol**: WebSocket (ws://) + HTTP (for discovery)
- **Binding**: 0.0.0.0 (all interfaces)

### Server Discovery System

The application includes an intelligent server discovery system:

- **Automatic Broadcasting**: Servers announce their presence on the network
- **Name-Based Discovery**: Connect using friendly computer names
- **Network Scanning**: Automatically find all available servers
- **Multiple Protocols**: Uses both WebSocket (chat) and HTTP (discovery)

#### Discovery Tools

You can also use the standalone discovery utility:

```bash
# Run the server discovery tool
cd backend
python discover_servers.py
```

Or use the batch file:
```bash
# Windows users
discover-servers.bat
```

## Network Requirements

- All devices must be on the same local network (WiFi/Ethernet)
- Firewall may need to allow port 8765
- Server device should have a static/known IP address

## Security Notes

- This is designed for trusted local networks only
- No authentication or encryption implemented
- Messages are not stored/logged permanently
- Intended for educational/development use

## Development

### Adding Features

The modular structure makes it easy to add features:

- **Backend**: Modify `server.py` to handle new message types
- **Frontend**: Add new React components in `src/components/`
- **Styling**: Update `App.css` for visual changes

### Common Customizations

- Change server port in `server.py` 
- Modify UI colors/theme in `App.css`
- Add message validation/filtering
- Implement user authentication
- Add file sharing capabilities

## Troubleshooting

### Can't Connect to Server
- Ensure server is running and showing IP address
- Check that devices are on same network
- Try disabling firewall temporarily
- Verify correct IP address and port

### Messages Not Appearing  
- Check browser console for WebSocket errors
- Ensure server hasn't crashed
- Try refreshing the page

### Port Already in Use
- Stop any existing server instances
- Change port in `server.py` if needed
- Check for other applications using port 8765

## License

This project is for personal purposes.

## Contributing

This is a learning project, but suggestions and improvements are welcome!

---

**Happy Chatting!**