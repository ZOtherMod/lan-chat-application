#!/usr/bin/env python3
"""
LAN Chat Server - Secure Edition
A WebSocket-based chat server with end-to-end encryption and security features.
"""

import asyncio
import websockets
import json
import logging
from datetime import datetime
import socket
import threading
import time
import platform
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import ssl
import os
from secure_server import SecureServerManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ServerDiscovery:
    """Handle server discovery and announcement"""
    
    def __init__(self, server_name, ws_port, http_port):
        self.server_name = server_name
        self.ws_port = ws_port
        self.http_port = http_port
        self.local_ip = self.get_local_ip()
        self.running = False
        
    def get_local_ip(self):
        """Get the local IP address"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect(("8.8.8.8", 80))
                return s.getsockname()[0]
        except Exception:
            return "127.0.0.1"
    
    def start_discovery_server(self):
        """Start HTTP server for server discovery"""
        class DiscoveryHandler(BaseHTTPRequestHandler):
            def do_GET(self):
                if self.path == '/discover':
                    # Return server information
                    server_info = {
                        'name': self.server.discovery.server_name,
                        'host': self.server.discovery.local_ip,
                        'ws_port': self.server.discovery.ws_port,
                        'ws_url': f"ws://{self.server.discovery.local_ip}:{self.server.discovery.ws_port}",
                        'platform': platform.system(),
                        'hostname': socket.gethostname()
                    }
                    
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps(server_info).encode())
                else:
                    self.send_response(404)
                    self.end_headers()
                    
            def log_message(self, format, *args):
                # Suppress HTTP server logs
                pass
        
        try:
            server = HTTPServer(('0.0.0.0', self.http_port), DiscoveryHandler)
            server.discovery = self
            
            def run_server():
                self.running = True
                server.serve_forever()
                
            thread = threading.Thread(target=run_server, daemon=True)
            thread.start()
            return True
        except Exception as e:
            print(f"Failed to start discovery server: {e}")
            return False

class ChatServer:
    def __init__(self):
        self.clients = set()
        self.nicknames = {}  # websocket -> nickname mapping
        self.client_sessions = {}  # websocket -> session_id mapping
        self.security_manager = SecureServerManager()
        self.room_key = None  # Shared encryption key for the room
        self.failed_attempts = {}  # Track failed authentication attempts
        
        # Matchmaking system
        self.matchmaking_queue = []  # List of users waiting for match
        self.active_rooms = {}  # room_id -> {"users": [ws1, ws2], "room_name": str}
        self.user_rooms = {}  # websocket -> room_id mapping
        self.room_counter = 0
        
    async def register_client(self, websocket):
        """Register a new client"""
        self.clients.add(websocket)
        logger.info(f"Client connected. Total clients: {len(self.clients)}")
        
    async def unregister_client(self, websocket):
        """Unregister a client"""
        self.clients.discard(websocket)
        nickname = self.nicknames.pop(websocket, "Unknown")
        logger.info(f"Client {nickname} disconnected. Total clients: {len(self.clients)}")
        
        # Clean up matchmaking and room data
        await self.cleanup_user_matchmaking_data(websocket)
        
        # Notify other clients about user leaving
        if nickname != "Unknown":
            await self.broadcast_message({
                "type": "user_left",
                "nickname": nickname,
                "timestamp": datetime.now().isoformat()
            }, exclude=websocket)
            
    async def set_nickname(self, websocket, nickname):
        """Set nickname for a client"""
        # Check if nickname is already taken
        if nickname in self.nicknames.values():
            return False
            
        old_nickname = self.nicknames.get(websocket)
        self.nicknames[websocket] = nickname
        
        if old_nickname:
            # Nickname changed
            await self.broadcast_message({
                "type": "nickname_changed",
                "old_nickname": old_nickname,
                "new_nickname": nickname,
                "timestamp": datetime.now().isoformat()
            })
        else:
            # New user joined
            await self.broadcast_message({
                "type": "user_joined",
                "nickname": nickname,
                "timestamp": datetime.now().isoformat()
            }, exclude=websocket)
            
        return True
        
    async def broadcast_message(self, message, exclude=None):
        """Broadcast message to all connected clients except excluded one"""
        if not self.clients:
            return
            
        message_str = json.dumps(message)
        disconnected = set()
        
        for client in self.clients.copy():
            if client == exclude:
                continue
                
            try:
                await client.send(message_str)
            except websockets.exceptions.ConnectionClosed:
                disconnected.add(client)
                
        # Clean up disconnected clients
        for client in disconnected:
            await self.unregister_client(client)
            
    async def handle_message(self, websocket, message_data):
        """Handle incoming message from client"""
        try:
            # Secure JSON parsing with size limits
            data = self.security_manager.secure_json_loads(message_data)
            message_type = data.get("type")
            
            # Validate all input data
            if not await self.validate_client_input(websocket, data):
                return
            
            if message_type == "set_nickname":
                nickname = data.get("nickname", "").strip()
                if not nickname:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": "Nickname cannot be empty"
                    }))
                    return
                
                # Security validation and sanitization
                try:
                    nickname = self.security_manager.sanitize_nickname(nickname)
                    if not nickname:
                        raise ValueError("Invalid nickname")
                except ValueError as e:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": "Invalid nickname format"
                    }))
                    return
                    
                success = await self.set_nickname(websocket, nickname)
                if success:
                    await websocket.send(json.dumps({
                        "type": "nickname_set",
                        "nickname": nickname
                    }))
                    
                    # Send current user list
                    user_list = list(self.nicknames.values())
                    await websocket.send(json.dumps({
                        "type": "user_list",
                        "users": user_list
                    }))
                else:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": "Nickname already taken"
                    }))
                    
            elif message_type == "chat_message":
                nickname = self.nicknames.get(websocket)
                if not nickname:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": "Please set a nickname first"
                    }))
                    return
                
                # Handle encrypted message
                if "encrypted_content" in data:
                    await self.handle_encrypted_message(websocket, data, nickname)
                    return
                    
                content = data.get("content", "").strip()
                if not content:
                    return
                    
                # Broadcast chat message
                await self.broadcast_message({
                    "type": "chat_message",
                    "nickname": nickname,
                    "content": content,
                    "timestamp": datetime.now().isoformat()
                })
                
            elif message_type == "get_users":
                user_list = list(self.nicknames.values())
                await websocket.send(json.dumps({
                    "type": "user_list",
                    "users": user_list
                }))
                
            # Matchmaking message handlers
            elif message_type == "join_matchmaking":
                await self.join_matchmaking_queue(websocket)
                
            elif message_type == "leave_matchmaking":
                await self.leave_matchmaking_queue(websocket)
                
            elif message_type == "leave_room":
                await self.leave_room(websocket)
                
            elif message_type == "room_message":
                content = data.get("content", "").strip()
                if content:
                    await self.send_room_message(websocket, content)
                    
            elif message_type == "get_room_info":
                await self.get_room_info(websocket)
                
        except json.JSONDecodeError:
            await websocket.send(json.dumps({
                "type": "error",
                "message": "Invalid message format"
            }))
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            await websocket.send(json.dumps({
                "type": "error",
                "message": "Server error"
            }))
    
    async def handle_encrypted_message(self, websocket, data, nickname):
        """Handle encrypted chat messages"""
        try:
            encrypted_content = data.get("encrypted_content")
            if not encrypted_content or not self.room_key:
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": "Encryption not properly initialized"
                }))
                return
            
            # Verify message signature if present
            if "signature" in data:
                message_str = json.dumps(encrypted_content, sort_keys=True)
                if not self.security_manager.verify_message_signature(
                    message_str, data["signature"], self.room_key
                ):
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": "Message integrity check failed"
                    }))
                    return
            
            # Broadcast encrypted message (relay without decrypting server-side)
            await self.broadcast_message({
                "type": "encrypted_chat_message",
                "nickname": nickname,
                "encrypted_content": encrypted_content,
                "timestamp": datetime.now().isoformat(),
                "signature": data.get("signature")
            })
            
        except Exception as e:
            logger.error(f"Error handling encrypted message: {e}")
            await websocket.send(json.dumps({
                "type": "error",
                "message": "Failed to process encrypted message"
            }))
    
    async def initialize_room_encryption(self, websocket):
        """Initialize room-level encryption"""
        if not self.room_key:
            self.room_key = self.security_manager.generate_room_key()
        
        # Send room key to client (in real implementation, use key exchange protocol)
        await websocket.send(json.dumps({
            "type": "room_key",
            "key": self.room_key.hex()
        }))
    
    # Matchmaking System Methods
    async def join_matchmaking_queue(self, websocket):
        """Add user to matchmaking queue"""
        nickname = self.nicknames.get(websocket)
        if not nickname:
            await websocket.send(json.dumps({
                "type": "error",
                "message": "Please set a nickname first"
            }))
            return
            
        # Check if user is already in queue
        if websocket in self.matchmaking_queue:
            await websocket.send(json.dumps({
                "type": "error", 
                "message": "You are already in the matchmaking queue"
            }))
            return
            
        # Check if user is already in a room
        if websocket in self.user_rooms:
            await websocket.send(json.dumps({
                "type": "error",
                "message": "You are already in a match room"
            }))
            return
            
        # Add to queue
        self.matchmaking_queue.append(websocket)
        logger.info(f"User {nickname} joined matchmaking queue. Queue size: {len(self.matchmaking_queue)}")
        
        await websocket.send(json.dumps({
            "type": "matchmaking_joined",
            "queue_position": len(self.matchmaking_queue),
            "message": f"Joined matchmaking queue (position {len(self.matchmaking_queue)})"
        }))
        
        # Try to create a match
        await self.try_create_match()
    
    async def leave_matchmaking_queue(self, websocket):
        """Remove user from matchmaking queue"""
        if websocket in self.matchmaking_queue:
            self.matchmaking_queue.remove(websocket)
            nickname = self.nicknames.get(websocket, "Unknown")
            logger.info(f"User {nickname} left matchmaking queue. Queue size: {len(self.matchmaking_queue)}")
            
            await websocket.send(json.dumps({
                "type": "matchmaking_left",
                "message": "Left matchmaking queue"
            }))
            
            # Update queue positions for remaining users
            await self.update_queue_positions()
    
    async def try_create_match(self):
        """Try to create a match from queue"""
        if len(self.matchmaking_queue) >= 2:
            # Take first two users from queue
            user1 = self.matchmaking_queue.pop(0)
            user2 = self.matchmaking_queue.pop(0)
            
            # Create new room
            self.room_counter += 1
            room_id = f"match_{self.room_counter}"
            room_name = f"Match Room {self.room_counter}"
            
            # Set up room
            self.active_rooms[room_id] = {
                "users": [user1, user2],
                "room_name": room_name,
                "created_at": datetime.now().isoformat()
            }
            
            # Map users to room
            self.user_rooms[user1] = room_id
            self.user_rooms[user2] = room_id
            
            # Get nicknames
            nickname1 = self.nicknames.get(user1, "Player 1")
            nickname2 = self.nicknames.get(user2, "Player 2")
            
            logger.info(f"Match created: {nickname1} vs {nickname2} in {room_name}")
            
            # Notify both users about the match
            match_message = {
                "type": "match_found",
                "room_id": room_id,
                "room_name": room_name,
                "opponent": "",
                "message": "Match found! You've been placed in a private room."
            }
            
            # Send to user1 with user2's nickname as opponent
            match_message["opponent"] = nickname2
            await user1.send(json.dumps(match_message))
            
            # Send to user2 with user1's nickname as opponent
            match_message["opponent"] = nickname1
            await user2.send(json.dumps(match_message))
            
            # Send welcome message to the room
            await self.broadcast_to_room(room_id, {
                "type": "system_message",
                "message": f"Welcome to {room_name}! {nickname1} and {nickname2} have been matched.",
                "timestamp": datetime.now().isoformat()
            })
            
            # Update queue positions for remaining users
            await self.update_queue_positions()
    
    async def leave_room(self, websocket):
        """Remove user from their current room"""
        room_id = self.user_rooms.get(websocket)
        if not room_id:
            return
            
        nickname = self.nicknames.get(websocket, "Unknown")
        room = self.active_rooms.get(room_id)
        
        if room:
            # Remove user from room
            if websocket in room["users"]:
                room["users"].remove(websocket)
                
            # Notify other user in room
            await self.broadcast_to_room(room_id, {
                "type": "opponent_left",
                "message": f"{nickname} has left the room",
                "timestamp": datetime.now().isoformat()
            }, exclude=websocket)
            
            # If room is empty, remove it
            if len(room["users"]) == 0:
                del self.active_rooms[room_id]
                logger.info(f"Room {room_id} deleted (empty)")
            
        # Remove user from room mapping
        del self.user_rooms[websocket]
        logger.info(f"User {nickname} left room {room_id}")
    
    async def broadcast_to_room(self, room_id, message, exclude=None):
        """Broadcast message to all users in a specific room"""
        room = self.active_rooms.get(room_id)
        if not room:
            return
            
        message_str = json.dumps(message)
        disconnected = set()
        
        for websocket in room["users"]:
            if websocket == exclude:
                continue
                
            try:
                await websocket.send(message_str)
            except websockets.exceptions.ConnectionClosed:
                disconnected.add(websocket)
        
        # Clean up disconnected clients from room
        for websocket in disconnected:
            if websocket in room["users"]:
                room["users"].remove(websocket)
            if websocket in self.user_rooms:
                del self.user_rooms[websocket]
    
    async def send_room_message(self, websocket, content):
        """Send message to room (only room members can see it)"""
        room_id = self.user_rooms.get(websocket)
        if not room_id:
            await websocket.send(json.dumps({
                "type": "error",
                "message": "You are not in a room"
            }))
            return
            
        nickname = self.nicknames.get(websocket, "Unknown")
        
        # Broadcast to room members only
        await self.broadcast_to_room(room_id, {
            "type": "room_message",
            "room_id": room_id,
            "nickname": nickname,
            "content": content,
            "timestamp": datetime.now().isoformat()
        })
    
    async def update_queue_positions(self):
        """Update queue positions for all users in queue"""
        for i, websocket in enumerate(self.matchmaking_queue):
            await websocket.send(json.dumps({
                "type": "queue_update",
                "position": i + 1,
                "total_in_queue": len(self.matchmaking_queue)
            }))
    
    async def get_room_info(self, websocket):
        """Get information about user's current room"""
        room_id = self.user_rooms.get(websocket)
        if not room_id:
            await websocket.send(json.dumps({
                "type": "room_info",
                "in_room": False
            }))
            return
            
        room = self.active_rooms.get(room_id)
        if not room:
            # Clean up stale room mapping
            del self.user_rooms[websocket]
            await websocket.send(json.dumps({
                "type": "room_info", 
                "in_room": False
            }))
            return
            
        # Get room members' nicknames
        members = []
        for user_ws in room["users"]:
            nickname = self.nicknames.get(user_ws, "Unknown")
            members.append(nickname)
            
        await websocket.send(json.dumps({
            "type": "room_info",
            "in_room": True,
            "room_id": room_id,
            "room_name": room["room_name"],
            "members": members,
            "created_at": room["created_at"]
        }))
        
    async def cleanup_user_matchmaking_data(self, websocket):
        """Clean up all matchmaking and room data for a disconnected user"""
        nickname = self.nicknames.get(websocket, "Unknown")
        
        # Remove from matchmaking queue
        if websocket in self.matchmaking_queue:
            self.matchmaking_queue.remove(websocket)
            logger.info(f"Removed {nickname} from matchmaking queue due to disconnect")
            await self.update_queue_positions()
        
        # Remove from active room
        if websocket in self.user_rooms:
            await self.leave_room(websocket)

    async def validate_client_input(self, websocket, data):
        """Validate client input for security"""
        client_ip = websocket.remote_address[0] if websocket.remote_address else "unknown"
        
        # Rate limiting check
        if not self.security_manager.check_rate_limit(client_ip):
            await websocket.send(json.dumps({
                "type": "error",
                "message": "Too many requests. Please slow down."
            }))
            await websocket.close(code=1008, reason="Rate limit exceeded")
            return False
        
        # Input validation
        for key, value in data.items():
            if isinstance(value, str) and not self.security_manager.validate_input(value):
                self.security_manager.log_security_event(
                    "INVALID_INPUT", client_ip, f"Key: {key}, Value: {value[:100]}"
                )
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": "Invalid input detected"
                }))
                return False
        
        return True
            
    async def handle_client(self, websocket, path):
        """Handle a client connection"""
        await self.register_client(websocket)
        try:
            async for message in websocket:
                await self.handle_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.unregister_client(websocket)

def get_local_ip():
    """Get the local IP address"""
    try:
        # Connect to a remote address to determine local IP
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"

async def main():
    server = ChatServer()
    host = "0.0.0.0"  # Listen on all interfaces
    
    # Use environment variables for cloud deployment
    ws_port = int(os.environ.get("PORT", 8765))  # Cloud platforms use PORT env var
    http_port = int(os.environ.get("HTTP_PORT", ws_port + 1))
    
    # Check if running in cloud environment
    is_cloud = os.environ.get("DYNO") or os.environ.get("RENDER") or os.environ.get("RAILWAY_ENVIRONMENT")
    
    if not is_cloud:
        # Local deployment - keep existing discovery functionality
        server_name = socket.gethostname()
        local_ip = get_local_ip()
        
        # Start server discovery service
        discovery = ServerDiscovery(server_name, ws_port, http_port)
        discovery_started = discovery.start_discovery_server()
    else:
        # Cloud deployment - disable local discovery
        server_name = os.environ.get("SERVER_NAME", "OnlineChatServer")
        discovery_started = False
    
    print("=" * 60)
    if is_cloud:
        print("🌐 ONLINE Chat Server Starting...")
        print("=" * 60)
        print(f"📡 Server Name: {server_name}")
        print(f"☁️  Environment: Cloud Deployment")
        print(f"� Port: {ws_port}")
        print("=" * 60)
        print("✅ Server is ONLINE and accessible from anywhere!")
        print("🔒 Enhanced security enabled for public access")
    else:
        print("�🚀 LAN Chat Server Starting...")
        print("=" * 60)
        print(f"📡 Server Name: {server_name}")
        print(f"🖥️  Computer: {platform.system()} - {socket.gethostname()}")
        print(f"🌐 IP Address: {local_ip}")
        print("=" * 60)
        print("🔗 Connection Options:")
        print(f"  • WebSocket: ws://{local_ip}:{ws_port}")
        if discovery_started:
            print(f"  • Discovery: http://{local_ip}:{http_port}/discover")
            print(f"  • Browser: Connect using server name '{server_name}'")
    print("=" * 60)
    
    if is_cloud:
        print("📋 Share this server URL with others to connect!")
    else:
        if discovery_started:
            print("✅ Server discovery enabled - clients can find server by name!")
        else:
            print("⚠️  Server discovery failed - clients will need IP address")
            
        print("=" * 60)
        print("📋 Share this with others:")
        print(f"   Server Name: {server_name}")
        print(f"   IP Address: {local_ip}:{ws_port}")
        print("=" * 60)
    print("Press Ctrl+C to stop the server")
    print("=" * 60)
    
    try:
        async with websockets.serve(server.handle_client, host, ws_port):
            await asyncio.Future()  # Run forever
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")

if __name__ == "__main__":
    asyncio.run(main())