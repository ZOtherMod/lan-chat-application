# Security Features Documentation

## Overview

The LAN Chat Application has been enhanced with comprehensive security features to protect user communications and prevent common attacks.

## Security Features

### 1. **End-to-End Encryption**
- **AES-256-GCM encryption** for all messages
- **PBKDF2** key derivation with 100,000 iterations
- **Client-side encryption/decryption** - server never sees plaintext
- **Unique salt and IV** for each message

### 2. **Input Validation & Sanitization**
- **XSS prevention** - all user inputs are sanitized
- **Input length limits** to prevent DoS attacks
- **Nickname validation** with safe character filtering
- **JSON size limits** to prevent memory exhaustion

### 3. **Rate Limiting**
- **Connection throttling** - max 10 attempts per minute per IP
- **Message rate limiting** built into validation
- **Automatic cleanup** of old attempt records

### 4. **Session Management**
- **Secure session tokens** using cryptographically secure random generation
- **Session expiration** after 1 hour of inactivity
- **Automatic cleanup** of expired sessions

### 5. **Message Integrity**
- **HMAC signatures** for message authenticity
- **Signature verification** to detect tampering
- **Timestamp validation** to prevent replay attacks

## How Encryption Works

### Client-Side (Frontend)
1. User enables encryption and sets a password
2. Messages are encrypted using AES-256-GCM before sending
3. Encrypted data includes: ciphertext, salt, IV, and timestamp
4. Server relays encrypted messages without decrypting them
5. Other clients decrypt messages using the shared password

### Server-Side (Backend)
1. Server validates all inputs for security threats
2. Messages are relayed without server-side decryption
3. Rate limiting prevents spam and DoS attacks
4. Session management ensures secure connections

## Using Encryption

### For Users:
1. **Click the lock icon** in the chat header
2. **Enter a strong password** (minimum 8 characters)
3. **Share the password** with other participants securely
4. **All messages** will now be encrypted end-to-end

### Password Sharing:
- Use a secure channel (in person, phone call, separate app)
- Avoid sharing passwords in the same chat
- Use strong, unique passwords for each chat session

## Security Considerations

### What's Protected:
- Message content (with encryption enabled)  
- Protection against XSS attacks  
- Protection against DoS attacks  
- Rate limiting against spam  
- Input validation and sanitization  

### What's NOT Protected:
- Metadata (who's chatting, when, message count)  
- Network traffic analysis  
- Server compromise (use trusted networks only)  
- Password sharing over insecure channels  

## Technical Details

### Encryption Algorithms:
- **Symmetric encryption**: AES-256-GCM
- **Key derivation**: PBKDF2 with SHA-256
- **Random generation**: Cryptographically secure (crypto.getRandomValues)
- **Hashing**: SHA-256 for signatures

### Security Headers:
- Input sanitization for HTML/JavaScript
- JSON size limiting (100KB max)
- Connection rate limiting
- Session token validation

### Dependencies:
- **Frontend**: crypto-js (battle-tested crypto library)
- **Backend**: cryptography (Python's recommended crypto library)
- **Backend**: bcrypt (secure password hashing)

## Best Practices

### For Users:
1. **Use strong passwords** for encryption
2. **Share passwords securely** outside the chat
3. **Don't reuse passwords** across sessions
4. **Verify participants** before sharing sensitive info
5. **Use on trusted networks** only

### For Developers:
1. **Keep dependencies updated** for security patches
2. **Monitor for vulnerabilities** in crypto libraries
3. **Audit code regularly** for security issues
4. **Use HTTPS** when deploying to production
5. **Implement proper logging** for security events

## Security Audit Log

The server logs security events including:
- Failed authentication attempts
- Rate limit violations
- Invalid input attempts
- Signature verification failures

## Compliance Notes

This implementation provides:
- **Data encryption at rest and in transit**
- **Protection against common web attacks**
- **Secure session management**
- **Input validation and sanitization**

**Note**: For production use in regulated environments, additional compliance measures may be required.

## Reporting Security Issues

If you discover a security vulnerability:
1. **Do NOT** create a public issue
2. **Contact the maintainers** directly
3. **Provide detailed information** about the vulnerability
4. **Allow time** for the issue to be addressed before disclosure

---

**Remember**: Security is a shared responsibility. While we've implemented robust protections, users should follow best practices for secure communication.