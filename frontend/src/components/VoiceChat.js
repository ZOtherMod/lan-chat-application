import React, { useState, useEffect, useRef } from 'react';import React, { useState, useEffect, useRef } from 'react';import React, { useState, useEffect, useRef } from 'react';import React, { useState, useEffect, useRef } from 'react';



const VoiceChat = ({ ws, nickname, isOpen, onClose }) => {

  const [localStream, setLocalStream] = useState(null);

  const [isVideoEnabled, setIsVideoEnabled] = useState(true);const VoiceChat = ({ ws, nickname, users = [], isOpen, onClose }) => {

  const [isMuted, setIsMuted] = useState(false);

  const localVideoRef = useRef(null);  const [localStream, setLocalStream] = useState(null);



  useEffect(() => {  const [isVideoEnabled, setIsVideoEnabled] = useState(true);const VoiceChat = ({ ws, nickname, users = [], isOpen, onClose }) => {const VoiceChat = ({ ws, nickname, users = [], isOpen, onClose }) => {

    if (isOpen) {

      startMedia();  const [isMuted, setIsMuted] = useState(false);

    }

    return () => {  const [localStream, setLocalStream] = useState(null);  const [localStream, setLocalStream] = useState(null);

      stopMedia();

    };  const localVideoRef = useRef(null);

  }, [isOpen]);

  const [isVideoEnabled, setIsVideoEnabled] = useState(true);  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const startMedia = async () => {

    try {  // Initialize media when component opens

      const stream = await navigator.mediaDevices.getUserMedia({

        video: true,  useEffect(() => {  const [isMuted, setIsMuted] = useState(false);  const [isMuted, setIsMuted] = useState(false);

        audio: true

      });    if (isOpen) {

      setLocalStream(stream);

      if (localVideoRef.current) {      initializeMedia();  const [remoteStreams, setRemoteStreams] = useState({});  const [remoteStreams, setRemoteStreams] = useState({});

        localVideoRef.current.srcObject = stream;

      }    }

    } catch (error) {

      console.error('Error accessing media:', error);    return () => {  const [peerConnections, setPeerConnections] = useState({});  const [peerConnections, setPeerConnections] = useState({});

      alert('Please allow camera and microphone access to use voice chat.');

    }      cleanup();

  };

    };  const [isInitialized, setIsInitialized] = useState(false);

  const stopMedia = () => {

    if (localStream) {  }, [isOpen]);

      localStream.getTracks().forEach(track => track.stop());

      setLocalStream(null);  const localVideoRef = useRef(null);

    }

  };  const initializeMedia = async () => {



  const toggleMute = () => {    try {  const remoteVideosRef = useRef({});  const localVideoRef = useRef(null);

    if (localStream) {

      const audioTracks = localStream.getAudioTracks();      const stream = await navigator.mediaDevices.getUserMedia({

      audioTracks.forEach(track => {

        track.enabled = isMuted;        video: true,  const remoteVideosRef = useRef({});

      });

      setIsMuted(!isMuted);        audio: true

    }

  };      });  // WebRTC configuration



  const toggleVideo = () => {      

    if (localStream) {

      const videoTracks = localStream.getVideoTracks();      setLocalStream(stream);  const rtcConfiguration = {  // WebRTC configuration

      videoTracks.forEach(track => {

        track.enabled = !isVideoEnabled;      if (localVideoRef.current) {

      });

      setIsVideoEnabled(!isVideoEnabled);        localVideoRef.current.srcObject = stream;    iceServers: [  const rtcConfiguration = {

    }

  };      }



  const handleClose = () => {      { urls: 'stun:stun.l.google.com:19302' },    iceServers: [

    stopMedia();

    onClose();      // Join voice chat room

  };

      if (ws && ws.readyState === WebSocket.OPEN) {      { urls: 'stun:stun1.l.google.com:19302' }      { urls: 'stun:stun.l.google.com:19302' },

  if (!isOpen) return null;

        ws.send(JSON.stringify({

  return (

    <div className="voice-chat-overlay">          type: 'voice_join',    ]      { urls: 'stun:stun1.l.google.com:19302' }

      <div className="voice-chat-container">

        <div className="voice-chat-header">          nickname: nickname

          <h3>🎤 Voice & Video Chat</h3>

          <button className="close-btn" onClick={handleClose}>✕</button>        }));  };    ]

        </div>

              }

        <div className="video-container">

          <div className="local-video">    } catch (error) {  };

            <video

              ref={localVideoRef}      console.error('Error accessing media devices:', error);

              autoPlay

              playsInline      alert('Unable to access camera/microphone. Please allow access to use voice chat.');  // Initialize media when component opens

              muted

              style={{ width: '100%', height: '300px', backgroundColor: '#000' }}    }

            />

            <div className="video-label">You ({nickname})</div>  };  useEffect(() => {  // Initialize local media stream

          </div>

        </div>



        <div className="voice-controls">  const cleanup = () => {    if (isOpen) {  const initializeMedia = async () => {

          <button onClick={toggleMute} className="control-btn">

            {isMuted ? '🔇 Muted' : '🎤 Mic On'}    // Stop local stream

          </button>

          <button onClick={toggleVideo} className="control-btn">    if (localStream) {      initializeMedia();    try {

            {isVideoEnabled ? '📹 Video On' : '📷 Video Off'}

          </button>      localStream.getTracks().forEach(track => track.stop());

          <button onClick={handleClose} className="control-btn leave-btn">

            📞 Leave    }    }      const stream = await navigator.mediaDevices.getUserMedia({

          </button>

        </div>    



        <div className="chat-status">    // Clear states    return () => {        video: true,

          <p>✅ Your camera and microphone are working!</p>

          <p>Voice chat is ready to use.</p>    setLocalStream(null);

        </div>

      </div>  };      cleanup();        audio: true

    </div>

  );

};

  // Toggle mute    };      });

export default VoiceChat;
  const toggleMute = () => {

    if (localStream) {  }, [isOpen]);      

      const audioTracks = localStream.getAudioTracks();

      audioTracks.forEach(track => {      setLocalStream(stream);

        track.enabled = isMuted;

      });  const initializeMedia = async () => {      if (localVideoRef.current) {

      setIsMuted(!isMuted);

    }    try {        localVideoRef.current.srcObject = stream;

  };

      const stream = await navigator.mediaDevices.getUserMedia({      }

  // Toggle video

  const toggleVideo = () => {        video: true,      

    if (localStream) {

      const videoTracks = localStream.getVideoTracks();        audio: true      setIsInitialized(true);

      videoTracks.forEach(track => {

        track.enabled = !isVideoEnabled;      });      

      });

      setIsVideoEnabled(!isVideoEnabled);            // Join voice chat room

    }

  };      setLocalStream(stream);      if (ws && ws.readyState === WebSocket.OPEN) {



  // Close voice chat      if (localVideoRef.current) {        ws.send(JSON.stringify({

  const handleClose = () => {

    // Leave voice chat        localVideoRef.current.srcObject = stream;          type: 'voice_join',

    if (ws && ws.readyState === WebSocket.OPEN) {

      ws.send(JSON.stringify({      }          nickname: nickname

        type: 'voice_leave',

        nickname: nickname        }));

      }));

    }      // Join voice chat room      }

    

    cleanup();      if (ws && ws.readyState === WebSocket.OPEN) {    } catch (error) {

    onClose();

  };        ws.send(JSON.stringify({      console.error('Error accessing media devices:', error);



  if (!isOpen) return null;          type: 'voice_join',      alert('Unable to access camera/microphone. Please check permissions.');



  return (          nickname: nickname    }

    <div className="voice-chat-overlay">

      <div className="voice-chat-container">        }));  };

        <div className="voice-chat-header">

          <h3>🎤 Voice & Video Chat</h3>      }

          <button className="close-btn" onClick={handleClose}>✕</button>

        </div>    } catch (error) {  useEffect(() => {

        

        <div className="video-grid">      console.error('Error accessing media devices:', error);    if (!ws || !isOpen) return;

          {/* Local video */}

          <div className="video-wrapper local-video-wrapper">      alert('Unable to access camera/microphone. Please allow access to use voice chat.');

            <video

              ref={localVideoRef}    }    const handleWebRTCMessage = (event) => {

              autoPlay

              playsInline  };      const data = JSON.parse(event.data);

              muted

              className="video-element"      

            />

            <div className="video-label">You ({nickname})</div>  const cleanup = () => {      switch (data.type) {

          </div>

        </div>    // Stop local stream        case 'voice_offer':



        <div className="voice-chat-controls">    if (localStream) {          handleOffer(data.offer, data.from);

          <button

            className={`control-btn ${isMuted ? 'muted' : ''}`}      localStream.getTracks().forEach(track => track.stop());          break;

            onClick={toggleMute}

            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}    }        case 'voice_answer':

          >

            {isMuted ? '🔇' : '🎤'}          handleAnswer(data.answer, data.from);

          </button>

              // Close peer connections          break;

          <button

            className={`control-btn ${!isVideoEnabled ? 'disabled' : ''}`}    Object.values(peerConnections).forEach(pc => pc.close());        case 'voice_ice_candidate':

            onClick={toggleVideo}

            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}              handleIceCandidate(data.candidate, data.from);

          >

            {isVideoEnabled ? '📹' : '📷'}    // Clear states          break;

          </button>

              setLocalStream(null);        case 'voice_user_joined':

          <button

            className="control-btn leave-btn"    setRemoteStreams({});          initiateCall(data.user);

            onClick={handleClose}

            title="Leave voice chat"    setPeerConnections({});          break;

          >

            📞 Leave  };        case 'voice_user_left':

          </button>

        </div>          handleUserLeft(data.user);



        <div className="waiting-message">  // Toggle mute          break;

          <p>✅ Voice chat is ready!</p>

          <p>Camera and microphone access granted. You can now communicate!</p>  const toggleMute = () => {        default:

        </div>

      </div>    if (localStream) {          break;

    </div>

  );      const audioTracks = localStream.getAudioTracks();      }

};

      audioTracks.forEach(track => {    };

export default VoiceChat;
        track.enabled = isMuted;

      });    ws.addEventListener('message', handleWebRTCMessage);

      setIsMuted(!isMuted);    return () => ws.removeEventListener('message', handleWebRTCMessage);

    }  }, [ws, isOpen, peerConnections]);

  };

  const startVoiceChat = async () => {

  // Toggle video    try {

  const toggleVideo = () => {      const stream = await navigator.mediaDevices.getUserMedia({

    if (localStream) {        audio: true,

      const videoTracks = localStream.getVideoTracks();        video: isVideoEnabled

      videoTracks.forEach(track => {      });

        track.enabled = !isVideoEnabled;      

      });      setLocalStream(stream);

      setIsVideoEnabled(!isVideoEnabled);      if (localVideoRef.current) {

    }        localVideoRef.current.srcObject = stream;

  };      }

      

  // Close voice chat      setIsConnected(true);

  const handleClose = () => {      

    // Leave voice chat      // Notify server that we joined voice chat

    if (ws && ws.readyState === WebSocket.OPEN) {      ws.send(JSON.stringify({

      ws.send(JSON.stringify({        type: 'voice_join',

        type: 'voice_leave',        nickname: nickname

        nickname: nickname      }));

      }));      

    }    } catch (error) {

          console.error('Error accessing media devices:', error);

    cleanup();      alert('Could not access microphone/camera. Please check permissions.');

    onClose();    }

  };  };



  if (!isOpen) return null;  const stopVoiceChat = () => {

    if (localStream) {

  return (      localStream.getTracks().forEach(track => track.stop());

    <div className="voice-chat-overlay">      setLocalStream(null);

      <div className="voice-chat-container">    }

        <div className="voice-chat-header">    

          <h3>🎤 Voice & Video Chat</h3>    // Close all peer connections

          <button className="close-btn" onClick={handleClose}>✕</button>    Object.values(peerConnections).forEach(pc => pc.close());

        </div>    setPeerConnections({});

            setRemoteStreams({});

        <div className="video-grid">    

          {/* Local video */}    setIsConnected(false);

          <div className="video-wrapper local-video-wrapper">    

            <video    // Notify server that we left voice chat

              ref={localVideoRef}    if (ws) {

              autoPlay      ws.send(JSON.stringify({

              playsInline        type: 'voice_leave',

              muted        nickname: nickname

              className="video-element"      }));

            />    }

            <div className="video-label">You ({nickname})</div>  };

          </div>

  const initiateCall = async (targetUser) => {

          {/* Remote videos */}    if (!localStream || targetUser === nickname) return;

          {Object.entries(remoteStreams).map(([user, stream]) => (

            <div key={user} className="video-wrapper remote-video-wrapper">    const peerConnection = new RTCPeerConnection(rtcConfiguration);

              <video    

                ref={el => {    // Add local stream to peer connection

                  if (el && stream) {    localStream.getTracks().forEach(track => {

                    remoteVideosRef.current[user] = el;      peerConnection.addTrack(track, localStream);

                    el.srcObject = stream;    });

                  }    

                }}    // Handle remote stream

                autoPlay    peerConnection.ontrack = (event) => {

                playsInline      const remoteStream = event.streams[0];

                className="video-element"      setRemoteStreams(prev => ({

              />        ...prev,

              <div className="video-label">{user}</div>        [targetUser]: remoteStream

            </div>      }));

          ))}    };

        </div>    

    // Handle ICE candidates

        <div className="voice-chat-controls">    peerConnection.onicecandidate = (event) => {

          <button      if (event.candidate) {

            className={`control-btn ${isMuted ? 'muted' : ''}`}        ws.send(JSON.stringify({

            onClick={toggleMute}          type: 'voice_ice_candidate',

            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}          candidate: event.candidate,

          >          to: targetUser,

            {isMuted ? '🔇' : '🎤'}          from: nickname

          </button>        }));

                }

          <button    };

            className={`control-btn ${!isVideoEnabled ? 'disabled' : ''}`}    

            onClick={toggleVideo}    // Create and send offer

            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}    const offer = await peerConnection.createOffer();

          >    await peerConnection.setLocalDescription(offer);

            {isVideoEnabled ? '📹' : '📷'}    

          </button>    setPeerConnections(prev => ({

                ...prev,

          <button      [targetUser]: peerConnection

            className="control-btn leave-btn"    }));

            onClick={handleClose}    

            title="Leave voice chat"    ws.send(JSON.stringify({

          >      type: 'voice_offer',

            📞 Leave      offer: offer,

          </button>      to: targetUser,

        </div>      from: nickname

    }));

        {Object.keys(remoteStreams).length === 0 && (  };

          <div className="waiting-message">

            <p>Waiting for others to join...</p>  const handleOffer = async (offer, fromUser) => {

            <p>Share the room link with friends to start video calling!</p>    if (!localStream || fromUser === nickname) return;

          </div>

        )}    const peerConnection = new RTCPeerConnection(rtcConfiguration);

      </div>    

    </div>    // Add local stream

  );    localStream.getTracks().forEach(track => {

};      peerConnection.addTrack(track, localStream);

    });

export default VoiceChat;    
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