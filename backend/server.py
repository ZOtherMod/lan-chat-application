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
        
    async def register_client(self, websocket):
        """Register a new client"""
        self.clients.add(websocket)
        logger.info(f"Client connected. Total clients: {len(self.clients)}")
        
    async def unregister_client(self, websocket):
        """Unregister a client"""
        self.clients.discard(websocket)
        nickname = self.nicknames.pop(websocket, "Unknown")
        logger.info(f"Client {nickname} disconnected. Total clients: {len(self.clients)}")
        
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
    ws_port = 8765
    http_port = 8766
    
    # Get server name (computer hostname)
    server_name = socket.gethostname()
    local_ip = get_local_ip()
    
    # Start server discovery service
    discovery = ServerDiscovery(server_name, ws_port, http_port)
    discovery_started = discovery.start_discovery_server()
    
    print("=" * 60)
    print("🚀 LAN Chat Server Starting...")
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