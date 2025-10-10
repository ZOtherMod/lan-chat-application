import React, { useState } from 'react';
import config from '../config';

const ServerSelection = ({ nickname, onConnect, onBack, onHostServer, connectionError, connecting }) => {
  const [customUrl, setCustomUrl] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [serverName, setServerName] = useState('');
  const [showServerName, setShowServerName] = useState(false);
  const [discoveredServers, setDiscoveredServers] = useState([]);
  const [scanning, setScanning] = useState(false);

  const handleQuickConnect = () => {
    onConnect('ws://localhost:8765');
  };

  const handleCustomConnect = (e) => {
    e.preventDefault();
    if (customUrl.trim()) {
      let url = customUrl.trim();
      
      // Add protocol if missing
      if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
        url = 'ws://' + url;
      }
      
      // Add port if missing
      if (!url.includes(':', url.indexOf('://') + 3)) {
        url += ':8765';
      }
      
      onConnect(url);
    }
  };

  const handleServerNameConnect = async (e) => {
    e.preventDefault();
    if (serverName.trim()) {
      try {
        const serverInfo = await discoverServerByName(serverName.trim());
        if (serverInfo) {
          onConnect(serverInfo.ws_url);
        } else {
          // Try to discover by scanning common IPs
          const found = await scanForServerByName(serverName.trim());
          if (found) {
            onConnect(found.ws_url);
          } else {
            alert(`Server "${serverName}" not found. Make sure the server is running and you're on the same network.`);
          }
        }
      } catch (error) {
        alert(`Failed to connect to "${serverName}": ${error.message}`);
      }
    }
  };

  const discoverServerByName = async (name) => {
    // Try to discover server by hostname
    const baseIps = ['192.168.1', '192.168.0', '10.0.0', '172.16.0'];
    
    for (const baseIp of baseIps) {
      for (let i = 1; i <= 254; i++) {
        try {
          const ip = `${baseIp}.${i}`;
          const response = await fetch(`http://${ip}:8766/discover`, {
            method: 'GET',
            timeout: 1000
          });
          
          if (response.ok) {
            const serverInfo = await response.json();
            if (serverInfo.name.toLowerCase() === name.toLowerCase() || 
                serverInfo.hostname.toLowerCase() === name.toLowerCase()) {
              return serverInfo;
            }
          }
        } catch (error) {
          // Ignore connection errors, continue scanning
        }
      }
    }
    return null;
  };

  const scanForServerByName = async (name) => {
    // Fallback: scan common network ranges
    return discoverServerByName(name);
  };

  const scanForServers = async () => {
    setScanning(true);
    setDiscoveredServers([]);
    
    const baseIps = ['192.168.1', '192.168.0', '10.0.0', '172.16.0'];
    
    const promises = [];
    for (const baseIp of baseIps) {
      for (let i = 1; i <= 254; i++) {
        const ip = `${baseIp}.${i}`;
        promises.push(
          fetch(`http://${ip}:8766/discover`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000)
          })
          .then(response => response.ok ? response.json() : null)
          .then(data => data ? { ...data, ip } : null)
          .catch(() => null)
        );
      }
    }

    try {
      const results = await Promise.allSettled(promises);
      const servers = results
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => result.value)
        .filter((server, index, self) => 
          index === self.findIndex(s => s.name === server.name)
        ); // Remove duplicates
      
      setDiscoveredServers(servers);
    } catch (error) {
      console.error('Error scanning for servers:', error);
    }
    
    setScanning(false);
  };

  const connectToDiscoveredServer = (server) => {
    onConnect(server.ws_url);
  };

  return (
    <div className="server-selection">
      <div className="user-info">
        <p>👋 Hello <strong>{nickname}</strong>!</p>
        <p>Choose how you want to connect:</p>
      </div>

      {connectionError && (
        <div className="error-message">
          ❌ {connectionError}
        </div>
      )}

      {connecting && (
        <div className="success-message">
          🔄 Connecting to server...
        </div>
      )}

      <div className="server-options">
        <div className="server-option">
          <h3>� Connect to Online Server</h3>
          <p>Connect to the online chat server (accessible from anywhere)</p>
          <button 
            className="btn online-btn" 
            onClick={() => onConnect(config.ONLINE_SERVER_URL)}
            disabled={connecting}
          >
            Connect to Online Server
          </button>
        </div>

        <div className="server-option">
          <h3>�🏠 Connect to Local Server</h3>
          <p>Connect to a server running on this computer (localhost:8765)</p>
          <button 
            className="btn" 
            onClick={handleQuickConnect}
            disabled={connecting}
          >
            Connect to Local Server
          </button>
        </div>

        <div className="server-option">
          <h3>🔍 Find Server by Name</h3>
          <p>Connect to a server using the host computer's name (easiest option)</p>
          
          {!showServerName ? (
            <button 
              className="btn" 
              onClick={() => setShowServerName(true)}
              disabled={connecting}
            >
              Connect by Server Name
            </button>
          ) : (
            <form onSubmit={handleServerNameConnect}>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <input
                  type="text"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  placeholder="Enter computer name (e.g., John-PC, MyLaptop)"
                  style={{ marginBottom: '10px' }}
                  autoFocus
                />
                <small style={{ color: '#666', fontSize: '0.8em' }}>
                  Enter the name of the computer running the server
                </small>
              </div>
              <button 
                type="submit" 
                className="btn"
                disabled={!serverName.trim() || connecting}
              >
                Find & Connect
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                  setShowServerName(false);
                  setServerName('');
                }}
                disabled={connecting}
                style={{ marginLeft: '10px' }}
              >
                Cancel
              </button>
            </form>
          )}
        </div>

        <div className="server-option">
          <h3>🌐 Browse Available Servers</h3>
          <p>Automatically scan and find all available chat servers on your network</p>
          
          <button 
            className="btn btn-secondary" 
            onClick={scanForServers}
            disabled={connecting || scanning}
          >
            {scanning ? 'Scanning...' : 'Scan for Servers'}
          </button>
          
          {discoveredServers.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <h4 style={{ margin: '10px 0', color: '#333' }}>Found Servers:</h4>
              {discoveredServers.map((server, index) => (
                <div key={index} style={{ 
                  border: '1px solid #ddd', 
                  borderRadius: '8px', 
                  padding: '10px', 
                  margin: '5px 0',
                  backgroundColor: '#f9f9f9'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{server.name}</strong>
                      <br />
                      <small style={{ color: '#666' }}>
                        {server.platform} • {server.host}
                      </small>
                    </div>
                    <button 
                      className="btn"
                      style={{ padding: '5px 15px', fontSize: '0.9em' }}
                      onClick={() => connectToDiscoveredServer(server)}
                      disabled={connecting}
                    >
                      Connect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {scanning && (
            <div style={{ marginTop: '10px', color: '#666', fontSize: '0.9em' }}>
              🔍 Scanning network for servers... This may take a moment.
            </div>
          )}
        </div>

        <div className="server-option">
          <h3>🌐 Manual IP Connection</h3>
          <p>Connect using IP address (advanced users)</p>
          
          {!showCustom ? (
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowCustom(true)}
              disabled={connecting}
            >
              Enter IP Address
            </button>
          ) : (
            <form onSubmit={handleCustomConnect}>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="192.168.1.100:8765 or ws://192.168.1.100:8765"
                  style={{ marginBottom: '10px' }}
                  autoFocus
                />
                <small style={{ color: '#666', fontSize: '0.8em' }}>
                  Enter IP address and port (e.g., 192.168.1.100:8765)
                </small>
              </div>
              <button 
                type="submit" 
                className="btn"
                disabled={!customUrl.trim() || connecting}
              >
                Connect
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                  setShowCustom(false);
                  setCustomUrl('');
                }}
                disabled={connecting}
                style={{ marginLeft: '10px' }}
              >
                Cancel
              </button>
            </form>
          )}
        </div>

        <div className="server-option">
          <h3>🚀 Host a Server</h3>
          <p>Start your own server for others to connect to</p>
          <p style={{ fontSize: '0.8em', color: '#666', marginBottom: '15px' }}>
            <strong>Quick Start:</strong><br/>
            1. Go to the backend folder<br/>
            2. Double-click <code style={{ background: '#f1f1f1', padding: '2px 4px', borderRadius: '3px' }}>start-server.bat</code> (Windows)<br/>
            3. Share your <strong>computer name</strong> with others<br/>
            4. Others can connect using "Find Server by Name"
          </p>
          <p style={{ fontSize: '0.8em', color: '#666', marginBottom: '15px' }}>
            <strong>Manual Start:</strong><br/>
            1. Open terminal → navigate to backend folder<br/>
            2. Run: <code style={{ background: '#f1f1f1', padding: '2px 4px', borderRadius: '3px' }}>python server.py</code><br/>
            3. Server will show your computer name and IP address
          </p>
          <button 
            className="btn btn-secondary"
            onClick={() => alert('Start the server using the instructions above. Others can then find your server by computer name - no need to share IP addresses!')}
            disabled={connecting}
          >
            View Instructions
          </button>
        </div>
      </div>

      <div className="host-server-section">
        <div className="server-option">
          <h3>🖥️ Host Your Own Server</h3>
          <p>Create your own chat server that others can join</p>
          <button 
            className="btn host-server-btn" 
            onClick={onHostServer}
            disabled={connecting}
          >
            🚀 Host Server
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button 
          className="btn btn-secondary" 
          onClick={onBack}
          disabled={connecting}
        >
          ← Back to Nickname
        </button>
      </div>
    </div>
  );
};

export default ServerSelection;