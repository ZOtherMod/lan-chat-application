import React, { useState, useEffect, useRef } from 'react';

const VoiceChat = ({ ws, nickname, users, isOpen, onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [peerConnections, setPeerConnections] = useState({});
  
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef({});

  // WebRTC configuration
  const rtcConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    if (!ws || !isOpen) return;

    const handleWebRTCMessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'voice_offer':
          handleOffer(data.offer, data.from);
          break;
        case 'voice_answer':
          handleAnswer(data.answer, data.from);
          break;
        case 'voice_ice_candidate':
          handleIceCandidate(data.candidate, data.from);
          break;
        case 'voice_user_joined':
          initiateCall(data.user);
          break;
        case 'voice_user_left':
          handleUserLeft(data.user);
          break;
        default:
          break;
      }
    };

    ws.addEventListener('message', handleWebRTCMessage);
    return () => ws.removeEventListener('message', handleWebRTCMessage);
  }, [ws, isOpen, peerConnections]);

  const startVoiceChat = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideoEnabled
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setIsConnected(true);
      
      // Notify server that we joined voice chat
      ws.send(JSON.stringify({
        type: 'voice_join',
        nickname: nickname
      }));
      
    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Could not access microphone/camera. Please check permissions.');
    }
  };

  const stopVoiceChat = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    // Close all peer connections
    Object.values(peerConnections).forEach(pc => pc.close());
    setPeerConnections({});
    setRemoteStreams({});
    
    setIsConnected(false);
    
    // Notify server that we left voice chat
    if (ws) {
      ws.send(JSON.stringify({
        type: 'voice_leave',
        nickname: nickname
      }));
    }
  };

  const initiateCall = async (targetUser) => {
    if (!localStream || targetUser === nickname) return;

    const peerConnection = new RTCPeerConnection(rtcConfiguration);
    
    // Add local stream to peer connection
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });
    
    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setRemoteStreams(prev => ({
        ...prev,
        [targetUser]: remoteStream
      }));
    };
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        ws.send(JSON.stringify({
          type: 'voice_ice_candidate',
          candidate: event.candidate,
          to: targetUser,
          from: nickname
        }));
      }
    };
    
    // Create and send offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    setPeerConnections(prev => ({
      ...prev,
      [targetUser]: peerConnection
    }));
    
    ws.send(JSON.stringify({
      type: 'voice_offer',
      offer: offer,
      to: targetUser,
      from: nickname
    }));
  };

  const handleOffer = async (offer, fromUser) => {
    if (!localStream || fromUser === nickname) return;

    const peerConnection = new RTCPeerConnection(rtcConfiguration);
    
    // Add local stream
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });
    
    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setRemoteStreams(prev => ({
        ...prev,
        [fromUser]: remoteStream
      }));
    };
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        ws.send(JSON.stringify({
          type: 'voice_ice_candidate',
          candidate: event.candidate,
          to: fromUser,
          from: nickname
        }));
      }
    };
    
    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    setPeerConnections(prev => ({
      ...prev,
      [fromUser]: peerConnection
    }));
    
    ws.send(JSON.stringify({
      type: 'voice_answer',
      answer: answer,
      to: fromUser,
      from: nickname
    }));
  };

  const handleAnswer = async (answer, fromUser) => {
    const peerConnection = peerConnections[fromUser];
    if (peerConnection) {
      await peerConnection.setRemoteDescription(answer);
    }
  };

  const handleIceCandidate = async (candidate, fromUser) => {
    const peerConnection = peerConnections[fromUser];
    if (peerConnection) {
      await peerConnection.addIceCandidate(candidate);
    }
  };

  const handleUserLeft = (user) => {
    if (peerConnections[user]) {
      peerConnections[user].close();
      setPeerConnections(prev => {
        const newConnections = { ...prev };
        delete newConnections[user];
        return newConnections;
      });
    }
    
    setRemoteStreams(prev => {
      const newStreams = { ...prev };
      delete newStreams[user];
      return newStreams;
    });
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = async () => {
    if (isVideoEnabled) {
      // Turn off video
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          localStream.removeTrack(videoTrack);
        }
      }
      setIsVideoEnabled(false);
    } else {
      // Turn on video
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = videoStream.getVideoTracks()[0];
        
        if (localStream && videoTrack) {
          localStream.addTrack(videoTrack);
          
          // Add video track to all existing peer connections
          Object.values(peerConnections).forEach(pc => {
            const sender = pc.getSenders().find(s => 
              s.track && s.track.kind === 'video'
            );
            if (sender) {
              sender.replaceTrack(videoTrack);
            } else {
              pc.addTrack(videoTrack, localStream);
            }
          });
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
          }
        }
        setIsVideoEnabled(true);
      } catch (error) {
        console.error('Error enabling video:', error);
        alert('Could not access camera. Please check permissions.');
      }
    }
  };

  useEffect(() => {
    // Update remote video elements when streams change
    Object.entries(remoteStreams).forEach(([user, stream]) => {
      if (remoteVideosRef.current[user]) {
        remoteVideosRef.current[user].srcObject = stream;
      }
    });
  }, [remoteStreams]);

  if (!isOpen) return null;

  return (
    <div className="voice-chat-overlay">
      <div className="voice-chat-panel">
        <div className="voice-chat-header">
          <h3>🎤 Voice Chat</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        
        <div className="voice-chat-content">
          {!isConnected ? (
            <div className="voice-chat-join">
              <p>Join voice chat to talk with others!</p>
              <div className="voice-options">
                <label>
                  <input
                    type="checkbox"
                    checked={isVideoEnabled}
                    onChange={(e) => setIsVideoEnabled(e.target.checked)}
                  />
                  Enable Camera
                </label>
              </div>
              <button onClick={startVoiceChat} className="join-voice-btn">
                Join Voice Chat
              </button>
            </div>
          ) : (
            <div className="voice-chat-active">
              <div className="local-video-container">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  className={`local-video ${isVideoEnabled ? 'video-enabled' : 'video-disabled'}`}
                />
                <div className="local-user-label">You ({nickname})</div>
              </div>
              
              <div className="remote-videos">
                {Object.entries(remoteStreams).map(([user, stream]) => (
                  <div key={user} className="remote-video-container">
                    <video
                      ref={el => remoteVideosRef.current[user] = el}
                      autoPlay
                      className="remote-video"
                    />
                    <div className="remote-user-label">{user}</div>
                  </div>
                ))}
              </div>
              
              <div className="voice-controls">
                <button
                  onClick={toggleMute}
                  className={`control-btn ${isMuted ? 'muted' : ''}`}
                >
                  {isMuted ? '🔇' : '🎤'}
                </button>
                <button
                  onClick={toggleVideo}
                  className={`control-btn ${isVideoEnabled ? 'video-on' : 'video-off'}`}
                >
                  {isVideoEnabled ? '📹' : '📷'}
                </button>
                <button onClick={stopVoiceChat} className="control-btn leave-btn">
                  📞 Leave
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceChat;