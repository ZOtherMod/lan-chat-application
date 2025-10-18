import React, { useState, useEffect, useRef } from 'react';
import SecureMessaging from '../utils/SecureMessaging';
import VoiceChat from './VoiceChat';

const ChatRoom = ({ ws, nickname, serverUrl, onDisconnect }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [encryptionPassword, setEncryptionPassword] = useState('');
  const [showEncryptionSetup, setShowEncryptionSetup] = useState(false);
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const messagesEndRef = useRef(null);
  const secureMessaging = useRef(new SecureMessaging());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };



  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'chat_message':
          setMessages(prev => [...prev, {
            type: 'chat',
            nickname: data.nickname,
            content: data.content,
            timestamp: data.timestamp,
            isOwn: data.nickname === nickname,
            encrypted: false
          }]);
          break;
          
        case 'encrypted_chat_message':
          try {
            let content = data.encrypted_content;
            let decryptionFailed = false;
            
            // Try to decrypt if we have encryption enabled
            if (encryptionEnabled && encryptionPassword) {
              try {
                content = secureMessaging.current.decryptMessage(
                  data.encrypted_content, 
                  encryptionPassword
                );
              } catch (e) {
                console.log('Decryption failed:', e);
                content = '[🔒 Encrypted message - cannot decrypt]';
                decryptionFailed = true;
              }
            } else {
              content = '[🔒 Encrypted message - encryption not enabled]';
              decryptionFailed = true;
            }
            
            setMessages(prev => [...prev, {
              type: 'chat',
              nickname: data.nickname,
              content: content,
              timestamp: data.timestamp,
              isOwn: data.nickname === nickname,
              encrypted: true,
              decryptionFailed: decryptionFailed
            }]);
          } catch (e) {
            console.error('Error processing encrypted message:', e);
          }
          break;
          
        case 'user_joined':
          setMessages(prev => [...prev, {
            type: 'system',
            content: `${data.nickname} joined the chat`,
            timestamp: data.timestamp
          }]);
          break;
          
        case 'user_left':
          setMessages(prev => [...prev, {
            type: 'system',
            content: `${data.nickname} left the chat`,
            timestamp: data.timestamp
          }]);
          break;
          
        case 'nickname_changed':
          setMessages(prev => [...prev, {
            type: 'system',
            content: `${data.old_nickname} changed their name to ${data.new_nickname}`,
            timestamp: data.timestamp
          }]);
          break;
          
        case 'user_list':
          setUsers(data.users);
          break;
          
        case 'room_key':
          // Room key received but not needed for display
          break;
          
        case 'error':
          setMessages(prev => [...prev, {
            type: 'system',
            content: `Error: ${data.message}`,
            timestamp: new Date().toISOString()
          }]);
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    };

    ws.addEventListener('message', handleMessage);
    
    // Set nickname and request user list
    ws.send(JSON.stringify({ type: 'set_nickname', nickname: nickname }));
    ws.send(JSON.stringify({ type: 'get_users' }));

    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws, nickname, encryptionEnabled, encryptionPassword]);

  const sendMessage = (e) => {
    e.preventDefault();
    const message = inputMessage.trim();
    
    if (message && ws) {
      try {
        // Validate and sanitize input
        const sanitizedMessage = secureMessaging.current.sanitizeInput(message);
        
        if (encryptionEnabled && encryptionPassword) {
          // Send encrypted message
          const encryptedData = secureMessaging.current.encryptMessage(
            sanitizedMessage, 
            encryptionPassword
          );
          
          ws.send(JSON.stringify({
            type: 'chat_message',
            encrypted_content: encryptedData
          }));
        } else {
          // Send plain message
          ws.send(JSON.stringify({
            type: 'chat_message',
            content: sanitizedMessage
          }));
        }
        setInputMessage('');
      } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message: ' + error.message);
      }
    }
  };

  const enableEncryption = (password) => {
    setEncryptionPassword(password);
    setEncryptionEnabled(true);
    setShowEncryptionSetup(false);
    
    setMessages(prev => [...prev, {
      type: 'system',
      content: '🔒 End-to-end encryption enabled',
      timestamp: new Date().toISOString()
    }]);
  };

  const disableEncryption = () => {
    setEncryptionPassword('');
    setEncryptionEnabled(false);
    
    setMessages(prev => [...prev, {
      type: 'system',
      content: '🔓 End-to-end encryption disabled',
      timestamp: new Date().toISOString()
    }]);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getServerAddress = (url) => {
    try {
      const wsUrl = new URL(url);
      return `${wsUrl.hostname}:${wsUrl.port}`;
    } catch {
      return url;
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div>
          <h2>💬 Chat Room</h2>
          <div className="chat-info">
            Connected to {getServerAddress(serverUrl)} as {nickname}
            {encryptionEnabled && <span className="encryption-status"> 🔒 Encrypted</span>}
          </div>
        </div>
        <div className="header-controls">
          <button 
            className="btn btn-encryption" 
            onClick={() => setShowEncryptionSetup(!showEncryptionSetup)}
            title={encryptionEnabled ? "Encryption enabled" : "Enable encryption"}
          >
            {encryptionEnabled ? '🔒' : '🔓'}
          </button>
          <button 
            className="btn btn-voice" 
            onClick={() => setShowVoiceChat(true)}
            title="Join voice chat"
          >
            🎤 Voice Chat
          </button>
          <button className="btn btn-secondary" onClick={onDisconnect}>
            Disconnect
          </button>
        </div>
      </div>

      {showEncryptionSetup && (
        <EncryptionSetup 
          onEnable={enableEncryption}
          onDisable={disableEncryption}
          encryptionEnabled={encryptionEnabled}
          onClose={() => setShowEncryptionSetup(false)}
        />
      )}

      <div className="chat-content">
        <div className="messages-section">
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="system-message">
                Welcome to the chat! Start typing to send messages.
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={index}>
                  {message.type === 'system' ? (
                    <div className="system-message">
                      {message.content}
                    </div>
                  ) : (
                    <div className={`message ${message.isOwn ? 'own' : 'other'}`}>
                      <div className="message-header">
                        <strong>{message.nickname}</strong>
                        <span style={{ marginLeft: '10px' }}>
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <div className="message-content">
                        {message.content}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="message-input-container">
            <form className="message-input-form" onSubmit={sendMessage}>
              <input
                type="text"
                className="message-input"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                maxLength="500"
                autoFocus
              />
              <button 
                type="submit" 
                className="send-btn"
                disabled={!inputMessage.trim()}
              >
                Send
              </button>
            </form>
          </div>
        </div>

        <div className="users-panel">
          <h3>👥 Users ({users.length})</h3>
          <ul className="user-list">
            {users.map((user, index) => (
              <li 
                key={index} 
                className={`user-item ${user === nickname ? 'current-user' : ''}`}
              >
                {user === nickname ? `${user} (you)` : user}
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {showVoiceChat && (
        <VoiceChat 
          ws={ws} 
          nickname={nickname} 
          onClose={() => setShowVoiceChat(false)} 
        />
      )}
    </div>
  );
};

const EncryptionSetup = ({ onEnable, onDisable, encryptionEnabled, onClose }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleEnable = (e) => {
    e.preventDefault();
    if (password.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    onEnable(password);
  };

  return (
    <div className="encryption-setup">
      <div className="encryption-content">
        <h3>🔒 End-to-End Encryption</h3>
        {encryptionEnabled ? (
          <div>
            <p>Encryption is currently <strong>enabled</strong>. All messages are encrypted.</p>
            <button className="btn btn-danger" onClick={onDisable}>
              Disable Encryption
            </button>
          </div>
        ) : (
          <form onSubmit={handleEnable}>
            <p>Enable end-to-end encryption to secure your messages:</p>
            <div className="form-group">
              <label>Encryption Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a strong password"
                minLength="8"
                required
              />
            </div>
            <div className="form-group">
              <label>Confirm Password:</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                minLength="8"
                required
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Enable Encryption
              </button>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
            </div>
            <div className="encryption-info">
              <small>
                ⚠️ Share this password with other participants to decrypt messages.
                Keep it secure!
              </small>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ChatRoom;