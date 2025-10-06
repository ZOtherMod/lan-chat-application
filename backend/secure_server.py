"""
Secure Server Module for LAN Chat
Implements encryption, authentication, and security features
"""

import hashlib
import secrets
import base64
import json
import time
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes, hmac
from cryptography.hazmat.backends import default_backend
import bcrypt
import logging

logger = logging.getLogger(__name__)

class SecureServerManager:
    """Handle server-side security operations"""
    
    def __init__(self):
        self.backend = default_backend()
        self.key_size = 32  # 256 bits
        self.iv_size = 16   # 128 bits
        self.salt_size = 32 # 256 bits
        self.iterations = 100000
        
        # Rate limiting
        self.connection_attempts = {}
        self.max_attempts_per_minute = 10
        
        # Session management
        self.active_sessions = {}
        self.session_timeout = 3600  # 1 hour
        
    def generate_secure_token(self, length=32):
        """Generate a cryptographically secure random token"""
        return secrets.token_urlsafe(length)
    
    def hash_password(self, password):
        """Hash password using bcrypt with salt"""
        if isinstance(password, str):
            password = password.encode('utf-8')
        
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password, salt)
    
    def verify_password(self, password, hashed):
        """Verify password against hash"""
        if isinstance(password, str):
            password = password.encode('utf-8')
        
        try:
            return bcrypt.checkpw(password, hashed)
        except Exception as e:
            logger.error(f"Password verification failed: {e}")
            return False
    
    def generate_room_key(self):
        """Generate a secure room encryption key"""
        return secrets.token_bytes(self.key_size)
    
    def derive_key(self, password, salt):
        """Derive encryption key from password using PBKDF2"""
        if isinstance(password, str):
            password = password.encode('utf-8')
            
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=self.key_size,
            salt=salt,
            iterations=self.iterations,
            backend=self.backend
        )
        return kdf.derive(password)
    
    def encrypt_message(self, message, key):
        """Encrypt message using AES-256-GCM"""
        try:
            if isinstance(message, str):
                message = message.encode('utf-8')
            
            # Generate random IV
            iv = secrets.token_bytes(self.iv_size)
            
            # Create cipher
            cipher = Cipher(
                algorithms.AES(key),
                modes.GCM(iv),
                backend=self.backend
            )
            encryptor = cipher.encryptor()
            
            # Encrypt and get auth tag
            ciphertext = encryptor.update(message) + encryptor.finalize()
            
            return {
                'ciphertext': base64.b64encode(ciphertext).decode('utf-8'),
                'iv': base64.b64encode(iv).decode('utf-8'),
                'tag': base64.b64encode(encryptor.tag).decode('utf-8')
            }
            
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise
    
    def decrypt_message(self, encrypted_data, key):
        """Decrypt message using AES-256-GCM"""
        try:
            ciphertext = base64.b64decode(encrypted_data['ciphertext'])
            iv = base64.b64decode(encrypted_data['iv'])
            tag = base64.b64decode(encrypted_data['tag'])
            
            # Create cipher
            cipher = Cipher(
                algorithms.AES(key),
                modes.GCM(iv, tag),
                backend=self.backend
            )
            decryptor = cipher.decryptor()
            
            # Decrypt
            plaintext = decryptor.update(ciphertext) + decryptor.finalize()
            return plaintext.decode('utf-8')
            
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise
    
    def validate_input(self, data, max_length=10000):
        """Validate and sanitize input data"""
        if not isinstance(data, str):
            return False
            
        if len(data) > max_length:
            return False
            
        # Check for dangerous patterns
        dangerous_patterns = [
            '<script',
            'javascript:',
            'on\w+\s*=',
            'eval\s*\(',
            'document\.',
        ]
        
        data_lower = data.lower()
        for pattern in dangerous_patterns:
            if pattern in data_lower:
                return False
                
        return True
    
    def sanitize_nickname(self, nickname):
        """Sanitize nickname for security"""
        if not self.validate_input(nickname, 50):
            raise ValueError("Invalid nickname")
            
        # Allow only alphanumeric, spaces, and safe special characters
        import re
        sanitized = re.sub(r'[^a-zA-Z0-9\s\-_.]', '', nickname)
        return sanitized.strip()[:30]  # Max 30 characters
    
    def check_rate_limit(self, client_ip):
        """Check if client has exceeded rate limits"""
        current_time = time.time()
        
        if client_ip not in self.connection_attempts:
            self.connection_attempts[client_ip] = []
        
        # Remove attempts older than 1 minute
        self.connection_attempts[client_ip] = [
            attempt for attempt in self.connection_attempts[client_ip]
            if current_time - attempt < 60
        ]
        
        # Check if limit exceeded
        if len(self.connection_attempts[client_ip]) >= self.max_attempts_per_minute:
            return False
            
        # Add current attempt
        self.connection_attempts[client_ip].append(current_time)
        return True
    
    def create_session(self, client_id, nickname):
        """Create a secure session for authenticated client"""
        session_id = self.generate_secure_token()
        
        self.active_sessions[session_id] = {
            'client_id': client_id,
            'nickname': nickname,
            'created_at': time.time(),
            'last_activity': time.time()
        }
        
        return session_id
    
    def validate_session(self, session_id):
        """Validate if session is active and not expired"""
        if session_id not in self.active_sessions:
            return False
            
        session = self.active_sessions[session_id]
        current_time = time.time()
        
        # Check if session expired
        if current_time - session['created_at'] > self.session_timeout:
            del self.active_sessions[session_id]
            return False
            
        # Update last activity
        session['last_activity'] = current_time
        return True
    
    def cleanup_expired_sessions(self):
        """Remove expired sessions"""
        current_time = time.time()
        expired_sessions = []
        
        for session_id, session in self.active_sessions.items():
            if current_time - session['created_at'] > self.session_timeout:
                expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            del self.active_sessions[session_id]
    
    def generate_message_signature(self, message, secret_key):
        """Generate HMAC signature for message integrity"""
        if isinstance(message, str):
            message = message.encode('utf-8')
        if isinstance(secret_key, str):
            secret_key = secret_key.encode('utf-8')
            
        h = hmac.HMAC(secret_key, hashes.SHA256(), backend=self.backend)
        h.update(message)
        return base64.b64encode(h.finalize()).decode('utf-8')
    
    def verify_message_signature(self, message, signature, secret_key):
        """Verify HMAC signature for message integrity"""
        try:
            expected_sig = self.generate_message_signature(message, secret_key)
            return secrets.compare_digest(signature, expected_sig)
        except Exception as e:
            logger.error(f"Signature verification failed: {e}")
            return False
    
    def secure_json_loads(self, json_str):
        """Safely parse JSON with size limits"""
        if len(json_str) > 100000:  # 100KB limit
            raise ValueError("JSON data too large")
            
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            raise ValueError("Invalid JSON format")
    
    def log_security_event(self, event_type, client_info, details):
        """Log security-related events"""
        timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
        logger.warning(
            f"SECURITY EVENT [{timestamp}] {event_type}: "
            f"Client: {client_info}, Details: {details}"
        )