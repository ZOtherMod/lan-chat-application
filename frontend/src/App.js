import React, { useState, useRef, useCallback } from 'react';
import './App.css';
import NicknameForm from './components/NicknameForm';
import ServerSelection from './components/ServerSelection';
import ChatRoom from './components/ChatRoom';

const App = () => {
  const [currentScreen, setCurrentScreen] = useState('nickname'); // 'nickname', 'server', 'chat'
  const [nickname, setNickname] = useState('');
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const wsRef = useRef(null);

  const connectToServer = useCallback((url) => {
    setConnectionError('');
    setServerUrl(url);
    
    try {
      const websocket = new WebSocket(url);
      wsRef.current = websocket;
      
      websocket.onopen = () => {
        console.log('Connected to server');
        setWs(websocket);
        setConnected(true);
        
        // Set nickname on server
        websocket.send(JSON.stringify({
          type: 'set_nickname',
          nickname: nickname
        }));
      };

      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'nickname_set') {
          setCurrentScreen('chat');
        } else if (data.type === 'error') {
          setConnectionError(data.message);
          websocket.close();
        }
      };

      websocket.onclose = () => {
        console.log('Disconnected from server');
        setWs(null);
        setConnected(false);
        if (currentScreen === 'chat') {
          setCurrentScreen('server');
          setConnectionError('Connection lost. Please reconnect.');
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Failed to connect to server. Please check the URL and try again.');
        setConnected(false);
      };

    } catch (error) {
      setConnectionError('Invalid server URL. Please check and try again.');
    }
  }, [nickname, currentScreen]);

  const handleNicknameSubmit = (submittedNickname) => {
    setNickname(submittedNickname);
    setCurrentScreen('server');
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setWs(null);
    setConnected(false);
    setCurrentScreen('server');
    setConnectionError('');
  };

  const goBack = () => {
    if (currentScreen === 'server') {
      setCurrentScreen('nickname');
      setNickname('');
    } else if (currentScreen === 'chat') {
      disconnect();
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🌐 LAN Chat</h1>
        <p>Connect and chat with friends on your local network!</p>
      </header>

      <main className="App-main">
        {currentScreen === 'nickname' && (
          <NicknameForm onSubmit={handleNicknameSubmit} />
        )}

        {currentScreen === 'server' && (
          <ServerSelection
            nickname={nickname}
            onConnect={connectToServer}
            onBack={goBack}
            connectionError={connectionError}
            connecting={connected && currentScreen === 'server'}
          />
        )}

        {currentScreen === 'chat' && ws && (
          <ChatRoom
            ws={ws}
            nickname={nickname}
            serverUrl={serverUrl}
            onDisconnect={disconnect}
          />
        )}
      </main>
    </div>
  );
};

export default App;