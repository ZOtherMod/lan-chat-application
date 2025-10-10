import React, { useState, useEffect } from 'react';
import './ServerHosting.css';

const ServerHosting = ({ onBack, onServerStarted }) => {
  const [serverStatus, setServerStatus] = useState('stopped'); // stopped, starting, running, error
  const [serverUrl, setServerUrl] = useState('');
  const [serverName, setServerName] = useState('');
  const [serverPort, setServerPort] = useState(8765);
  const [connectedClients, setConnectedClients] = useState(0);
  const [serverLogs, setServerLogs] = useState([]);
  const [useCustomName, setUseCustomName] = useState(false);
  const [customServerName, setCustomServerName] = useState('');
  const [serverProcess, setServerProcess] = useState(null);

  // Add log message
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setServerLogs(prev => [...prev.slice(-50), { // Keep last 50 logs
      time: timestamp,
      message,
      type
    }]);
  };

  // Start server function
  const startServer = async () => {
    try {
      setServerStatus('starting');
      addLog('Starting server...', 'info');

      // Use custom name if provided, otherwise use computer name
      const finalServerName = useCustomName && customServerName.trim() 
        ? customServerName.trim() 
        : 'WebHostedServer';

      // Create server configuration
      const serverConfig = {
        port: serverPort,
        serverName: finalServerName,
        host: '0.0.0.0'
      };

      // In a real implementation, this would start the Python server
      // For now, we'll simulate it with a WebSocket server in JavaScript
      const worker = new Worker('/server-worker.js');
      
      worker.postMessage({ action: 'start', config: serverConfig });
      
      worker.onmessage = (event) => {
        const { type, data } = event.data;
        
        switch(type) {
          case 'started':
            setServerStatus('running');
            setServerUrl(data.url);
            setServerName(data.name);
            addLog(`Server started successfully on ${data.url}`, 'success');
            if (onServerStarted) {
              onServerStarted(data.url, data.name);
            }
            break;
            
          case 'client_connected':
            setConnectedClients(data.count);
            addLog(`Client connected. Total clients: ${data.count}`, 'info');
            break;
            
          case 'client_disconnected':
            setConnectedClients(data.count);
            addLog(`Client disconnected. Total clients: ${data.count}`, 'info');
            break;
            
          case 'error':
            setServerStatus('error');
            addLog(`Server error: ${data.message}`, 'error');
            break;
            
          case 'log':
            addLog(data.message, data.level);
            break;
        }
      };
      
      setServerProcess(worker);
      
    } catch (error) {
      setServerStatus('error');
      addLog(`Failed to start server: ${error.message}`, 'error');
    }
  };

  // Stop server function
  const stopServer = () => {
    if (serverProcess) {
      serverProcess.postMessage({ action: 'stop' });
      serverProcess.terminate();
      setServerProcess(null);
    }
    
    setServerStatus('stopped');
    setConnectedClients(0);
    setServerUrl('');
    setServerName('');
    addLog('Server stopped', 'info');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (serverProcess) {
        serverProcess.terminate();
      }
    };
  }, [serverProcess]);

  return (
    <div className="server-hosting">
      <div className="server-hosting-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2>🖥️ Host Your Own Server</h2>
      </div>

      <div className="server-hosting-content">
        {/* Server Configuration */}
        <div className="server-config">
          <h3>⚙️ Server Configuration</h3>
          
          <div className="config-group">
            <label>
              <input
                type="checkbox"
                checked={useCustomName}
                onChange={(e) => setUseCustomName(e.target.checked)}
                disabled={serverStatus === 'running'}
              />
              Use custom server name
            </label>
            
            {useCustomName && (
              <input
                type="text"
                placeholder="Enter server name..."
                value={customServerName}
                onChange={(e) => setCustomServerName(e.target.value)}
                disabled={serverStatus === 'running'}
                className="server-name-input"
              />
            )}
          </div>

          <div className="config-group">
            <label>Port:</label>
            <input
              type="number"
              value={serverPort}
              onChange={(e) => setServerPort(parseInt(e.target.value))}
              disabled={serverStatus === 'running'}
              min="1024"
              max="65535"
              className="port-input"
            />
          </div>
        </div>

        {/* Server Status */}
        <div className="server-status">
          <h3>📊 Server Status</h3>
          
          <div className={`status-indicator ${serverStatus}`}>
            <span className="status-dot"></span>
            <span className="status-text">
              {serverStatus === 'stopped' && 'Server Stopped'}
              {serverStatus === 'starting' && 'Starting Server...'}
              {serverStatus === 'running' && 'Server Running'}
              {serverStatus === 'error' && 'Server Error'}
            </span>
          </div>

          {serverStatus === 'running' && (
            <div className="server-info">
              <div className="info-item">
                <strong>Server Name:</strong> {serverName}
              </div>
              <div className="info-item">
                <strong>Connection URL:</strong> 
                <code className="server-url">{serverUrl}</code>
                <button 
                  className="copy-btn"
                  onClick={() => navigator.clipboard.writeText(serverUrl)}
                >
                  Copy
                </button>
              </div>
              <div className="info-item">
                <strong>Connected Clients:</strong> {connectedClients}
              </div>
            </div>
          )}
        </div>

        {/* Server Controls */}
        <div className="server-controls">
          {serverStatus === 'stopped' || serverStatus === 'error' ? (
            <button 
              className="btn start-server-btn"
              onClick={startServer}
              disabled={serverStatus === 'starting'}
            >
              {serverStatus === 'starting' ? 'Starting...' : '▶️ Start Server'}
            </button>
          ) : (
            <button 
              className="btn stop-server-btn"
              onClick={stopServer}
            >
              ⏹️ Stop Server
            </button>
          )}
          
          {serverStatus === 'running' && (
            <button 
              className="btn join-server-btn"
              onClick={() => {
                // Switch to chat with this server
                onBack();
                // This would trigger connection to the local server
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('connectToServer', {
                    detail: { url: serverUrl }
                  }));
                }, 100);
              }}
            >
              🚪 Join This Server
            </button>
          )}
        </div>

        {/* Server Logs */}
        <div className="server-logs">
          <h3>📋 Server Logs</h3>
          <div className="logs-container">
            {serverLogs.length === 0 ? (
              <div className="no-logs">No logs yet...</div>
            ) : (
              serverLogs.map((log, index) => (
                <div key={index} className={`log-entry ${log.type}`}>
                  <span className="log-time">[{log.time}]</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="server-instructions">
          <h3>📖 How to Use</h3>
          <ol>
            <li>Configure your server name and port (optional)</li>
            <li>Click "Start Server" to begin hosting</li>
            <li>Share the connection URL with others</li>
            <li>Others can connect using the URL or server name</li>
            <li>Monitor connections and logs in real-time</li>
          </ol>
          
          <div className="note">
            <strong>Note:</strong> This browser-based server works for local network connections. 
            For internet-wide access, you'll need port forwarding or cloud deployment.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerHosting;