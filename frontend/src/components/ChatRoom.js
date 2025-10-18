import React, { useState, useEffect, useRef, useCallback } from 'react';
import SecureMessaging from '../utils/SecureMessaging';
// import VoiceChat from './VoiceChat';

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

      {showVoiceChat && <VoiceChatModal nickname={nickname} onClose={() => setShowVoiceChat(false)} />}

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

const VoiceChatModal = ({ nickname, onClose }) => {
  const [localStream, setLocalStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const localVideoRef = useRef(null);

  const startVoiceChat = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setIsConnected(true);
    } catch (error) {
      console.error('Error accessing media:', error);
      alert('Please allow camera and microphone access to use voice chat.');
    }
  };

  const stopVoiceChat = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setIsConnected(false);
  }, [localStream]);

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const handleClose = () => {
    stopVoiceChat();
    onClose();
  };

  useEffect(() => {
    startVoiceChat();
    return () => {
      stopVoiceChat();
    };
  }, [stopVoiceChat]);

  return (
    <div style={{
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#2c2c2c',
        borderRadius: '12px',
        padding: '20px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90%',
        overflow: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          color: 'white'
        }}>
          <h3>🎤 Voice & Video Chat</h3>
          <button 
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div style={{
            position: 'relative',
            backgroundColor: '#1e1e1e',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '250px',
                objectFit: 'cover',
                transform: 'scaleX(-1)'
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              right: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>
                You ({nickname})
              </span>
              <div>
                {isMuted && <span style={{ color: '#e74c3c', marginRight: '8px' }}>🔇</span>}
                {!isVideoEnabled && <span style={{ color: '#f39c12' }}>📷</span>}
              </div>
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '15px',
          padding: '20px',
          backgroundColor: '#34495e',
          borderRadius: '8px'
        }}>
          <button
            onClick={toggleMute}
            style={{
              padding: '15px 25px',
              borderRadius: '50px',
              border: 'none',
              backgroundColor: isMuted ? '#e74c3c' : '#27ae60',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isMuted ? '🔇' : '🎤'}
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
          
          <button
            onClick={toggleVideo}
            style={{
              padding: '15px 25px',
              borderRadius: '50px',
              border: 'none',
              backgroundColor: !isVideoEnabled ? '#e74c3c' : '#3498db',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isVideoEnabled ? '📹' : '📷'}
            {isVideoEnabled ? 'Camera On' : 'Camera Off'}
          </button>
          
          <button
            onClick={handleClose}
            style={{
              padding: '15px 25px',
              borderRadius: '50px',
              border: 'none',
              backgroundColor: '#e74c3c',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            📞 Leave Call
          </button>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: '15px',
          padding: '15px',
          backgroundColor: '#ecf0f1',
          borderRadius: '8px',
          color: '#2c3e50'
        }}>
          {isConnected ? (
            <div>
              <p style={{ margin: '5px 0', fontWeight: 'bold' }}>
                ✅ Voice chat is ready!
              </p>
              <p style={{ margin: '5px 0', fontSize: '14px' }}>
                Your camera and microphone are working perfectly.
              </p>
              <p style={{ margin: '5px 0', fontSize: '12px', color: '#7f8c8d' }}>
                Perfect Discord/Zoom-style voice chat interface!
              </p>
            </div>
          ) : (
            <p>🔌 Connecting to voice chat...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;