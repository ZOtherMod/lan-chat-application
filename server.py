#!/usr/bin/env python3
"""
Simple Chat Server
A basic WebSocket chat server for real-time messaging.
"""

import asyncio
import websockets
import json
import logging
import socket
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ChatServer:
    def __init__(self):
        self.clients = {}
        self.rooms = {"general": set()}

    async def handle_client(self, websocket, path):
        client_id = id(websocket)
        self.clients[client_id] = {
            'websocket': websocket,
            'nickname': None,
            'room': 'general'
        }
        
        try:
            async for message in websocket:
                await self.handle_message(client_id, message)
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.remove_client(client_id)

    async def handle_message(self, client_id, message):
        try:
            data = json.loads(message)
            message_type = data.get('type')
            
            if message_type == 'set_nickname':
                await self.set_nickname(client_id, data.get('nickname'))
            elif message_type == 'chat_message':
                await self.broadcast_message(client_id, data.get('content'))
            elif message_type == 'get_users':
                await self.send_user_list(client_id)
            elif message_type == 'voice_join':
                await self.handle_voice_join(client_id, data.get('nickname'))
            elif message_type == 'voice_leave':
                await self.handle_voice_leave(client_id, data.get('nickname'))
            elif message_type == 'voice_offer':
                await self.relay_voice_message(client_id, data)
            elif message_type == 'voice_answer':
                await self.relay_voice_message(client_id, data)
            elif message_type == 'voice_ice_candidate':
                await self.relay_voice_message(client_id, data)
                
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON from client {client_id}")

    async def set_nickname(self, client_id, nickname):
        if client_id in self.clients:
            was_new_user = not self.clients[client_id]['nickname']
            self.clients[client_id]['nickname'] = nickname
            
            await self.send_to_client(client_id, {
                'type': 'nickname_set',
                'nickname': nickname
            })
            
            # Send join notification to all users if this is a new user
            if was_new_user:
                join_message = {
                    'type': 'user_joined',
                    'nickname': nickname,
                    'timestamp': asyncio.get_event_loop().time()
                }
                await self.broadcast_to_all(join_message)
            
            await self.broadcast_user_list()

    async def broadcast_message(self, sender_id, message):
        if sender_id not in self.clients or not message:
            return
            
        sender = self.clients[sender_id]
        chat_message = {
            'type': 'chat_message',
            'nickname': sender['nickname'],
            'content': message,
            'timestamp': asyncio.get_event_loop().time()
        }
        
        room = sender['room']
        for client_id in list(self.clients.keys()):
            if self.clients[client_id]['room'] == room:
                await self.send_to_client(client_id, chat_message)

    async def handle_voice_join(self, client_id, nickname):
        if client_id in self.clients:
            # Notify other users that someone joined voice chat
            join_message = {
                'type': 'voice_user_joined',
                'user': nickname
            }
            
            # Send to all other clients in the same room
            room = self.clients[client_id]['room']
            for other_client_id in list(self.clients.keys()):
                if (other_client_id != client_id and 
                    self.clients[other_client_id]['room'] == room):
                    await self.send_to_client(other_client_id, join_message)

    async def handle_voice_leave(self, client_id, nickname):
        if client_id in self.clients:
            # Notify other users that someone left voice chat
            leave_message = {
                'type': 'voice_user_left',
                'user': nickname
            }
            
            # Send to all other clients in the same room
            room = self.clients[client_id]['room']
            for other_client_id in list(self.clients.keys()):
                if (other_client_id != client_id and 
                    self.clients[other_client_id]['room'] == room):
                    await self.send_to_client(other_client_id, leave_message)

    async def relay_voice_message(self, sender_id, data):
        # Relay WebRTC signaling messages between users
        target_nickname = data.get('to')
        if not target_nickname:
            return
            
        # Find the target client
        target_client_id = None
        for client_id, client in self.clients.items():
            if client['nickname'] == target_nickname:
                target_client_id = client_id
                break
        
        if target_client_id:
            await self.send_to_client(target_client_id, data)

    async def broadcast_to_all(self, message):
        for client_id in list(self.clients.keys()):
            await self.send_to_client(client_id, message)

    async def broadcast_user_list(self):
        users = [client['nickname'] for client in self.clients.values() if client['nickname']]
        user_list_message = {
            'type': 'user_list',
            'users': users
        }
        
        for client_id in list(self.clients.keys()):
            await self.send_to_client(client_id, user_list_message)

    async def send_to_client(self, client_id, message):
        if client_id in self.clients:
            try:
                await self.clients[client_id]['websocket'].send(json.dumps(message))
            except websockets.exceptions.ConnectionClosed:
                await self.remove_client(client_id)

    async def send_user_list(self, client_id):
        users = [client['nickname'] for client in self.clients.values() if client['nickname']]
        await self.send_to_client(client_id, {
            'type': 'user_list',
            'users': users
        })

    async def remove_client(self, client_id):
        if client_id in self.clients:
            nickname = self.clients[client_id]['nickname']
            del self.clients[client_id]
            
            # Send leave notification if user had a nickname
            if nickname:
                leave_message = {
                    'type': 'user_left',
                    'nickname': nickname,
                    'timestamp': asyncio.get_event_loop().time()
                }
                await self.broadcast_to_all(leave_message)
            
            await self.broadcast_user_list()

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "localhost"

async def main():
    server = ChatServer()
    host = "0.0.0.0"
    port = int(os.environ.get("PORT", 8765))
    
    print("Chat Server Starting...")
    print(f"Server listening on {get_local_ip()}:{port}")
    print("Press Ctrl+C to stop")
    
    try:
        async with websockets.serve(server.handle_client, host, port):
            await asyncio.Future()
    except KeyboardInterrupt:
        print("Server stopped")

if __name__ == "__main__":
    import os
    asyncio.run(main())