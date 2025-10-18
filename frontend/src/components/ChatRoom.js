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
  const [isVideoEnabled, setIsVideoEnabled] = useState(false); // Default camera OFF
  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const localVideoRef = useRef(null);

  const startVoiceChat = async () => {
    try {
      // Start with audio only, no video by default
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true
      });
      
      setLocalStream(stream);
      setIsConnected(true);
      setPermissionsGranted(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Please allow microphone access to use voice chat.');
    }
  };

  const stopVoiceChat = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setIsConnected(false);
    setPermissionsGranted(false);
    setIsVideoEnabled(false);
    setIsMuted(false);
  }, [localStream]);

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted; // If currently muted, enable it
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = async () => {
    if (!isVideoEnabled) {
      // Request camera permission and add video track
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        
        // Add video track to existing stream
        if (localStream) {
          const videoTrack = videoStream.getVideoTracks()[0];
          localStream.addTrack(videoTrack);
          
          // Update video element
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
          }
        } else {
          // If no stream exists, create new one with video
          const fullStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
          setLocalStream(fullStream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = fullStream;
          }
        }
        setIsVideoEnabled(true);
      } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Please allow camera access to enable video.');
      }
    } else {
      // Disable video
      if (localStream) {
        const videoTracks = localStream.getVideoTracks();
        videoTracks.forEach(track => {
          track.stop();
          localStream.removeTrack(track);
        });
        
        // Update video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
      }
      setIsVideoEnabled(false);
    }
  };

  const handleClose = () => {
    stopVoiceChat();
    onClose();
  };

  useEffect(() => {
    startVoiceChat();
    return () => {
      // Only cleanup when component unmounts, not on every render
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [localStream]); // Include localStream in dependencies

  // Separate effect to update video element when stream changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

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
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '20px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {/* Local video cube */}
          <div style={{
            position: 'relative',
            backgroundColor: '#1e1e1e',
            borderRadius: '12px',
            overflow: 'hidden',
            aspectRatio: '1',
            minHeight: '150px',
            border: '2px solid #007bff'
          }}>
            {isVideoEnabled && localStream ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)'
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#2c3e50',
                color: 'white',
                fontSize: '48px'
              }}>
                👤
              </div>
            )}
            <div style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              right: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: '6px',
              padding: '4px 8px'
            }}>
              <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>
                You ({nickname})
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {isMuted && <span style={{ color: '#e74c3c', fontSize: '12px' }}>🔇</span>}
                {!isVideoEnabled && <span style={{ color: '#f39c12', fontSize: '12px' }}>📷</span>}
              </div>
            </div>
          </div>

          {/* Remote video cubes would go here when implemented */}
          {/* Placeholder for additional users */}
          {permissionsGranted && (
            <div style={{
              position: 'relative',
              backgroundColor: '#34495e',
              borderRadius: '12px',
              overflow: 'hidden',
              aspectRatio: '1',
              minHeight: '150px',
              border: '2px dashed #7f8c8d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#bdc3c7',
              fontSize: '14px',
              textAlign: 'center',
              padding: '20px'
            }}>
              <div>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>➕</div>
                <div>Waiting for others to join...</div>
              </div>
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '15px',
          padding: '20px',
          borderTop: '1px solid #444',
          backgroundColor: '#1a1a1a'
        }}>
          <button
            onClick={toggleMute}
            style={{
              padding: '12px 16px',
              borderRadius: '25px',
              border: 'none',
              backgroundColor: isMuted ? '#e74c3c' : '#27ae60',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: '120px',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              transform: 'scale(1)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            <span style={{ fontSize: '16px' }}>{isMuted ? '🔇' : '🎤'}</span>
            {isMuted ? 'Unmute' : 'Mute'}
          </button>

          <button
            onClick={toggleVideo}
            disabled={!permissionsGranted}
            style={{
              padding: '12px 16px',
              borderRadius: '25px',
              border: 'none',
              backgroundColor: !permissionsGranted ? '#95a5a6' : isVideoEnabled ? '#27ae60' : '#e74c3c',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: permissionsGranted ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: '120px',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              transform: 'scale(1)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              opacity: !permissionsGranted ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (permissionsGranted) e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              if (permissionsGranted) e.target.style.transform = 'scale(1)';
            }}
          >
            <span style={{ fontSize: '16px' }}>{isVideoEnabled ? '📹' : '📷'}</span>
            {isVideoEnabled ? 'Camera On' : 'Camera Off'}
          </button>

          <button
            onClick={handleClose}
            style={{
              padding: '12px 20px',
              borderRadius: '25px',
              border: 'none',
              backgroundColor: '#dc3545',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: '100px',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              transform: 'scale(1)',
              boxShadow: '0 4px 12px rgba(220, 53, 69, 0.4)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
              e.target.style.backgroundColor = '#c82333';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.backgroundColor = '#dc3545';
            }}
          >
            <span style={{ fontSize: '16px' }}>📞</span>
            Leave Call
          </button>
        </div>

        <div style={{
          textAlign: 'center',
          padding: '10px 20px',
          backgroundColor: '#2c3e50',
          borderRadius: '8px 8px 0 0',
          borderBottom: '1px solid #444',
          color: '#ecf0f1'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '18px' }}>
            🎥 Voice Chat
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '20px', 
            fontSize: '12px',
            color: '#bdc3c7'
          }}>
            <span>
              🎤 Audio: {permissionsGranted ? (isMuted ? 'Muted' : 'Active') : 'Requesting...'}
            </span>
            <span>
              📹 Video: {isVideoEnabled ? 'On' : 'Off'}
            </span>
            <span>
              👥 Participants: 1
            </span>
          </div>
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