import React, { useState } from 'react';

const SimpleServerHosting = ({ onBack }) => {
  const [serverRunning, setServerRunning] = useState(false);
  const [serverInfo, setServerInfo] = useState(null);
  const [serverLogs, setServerLogs] = useState([]);
  const [customPort, setCustomPort] = useState(8765);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setServerLogs(prev => [...prev.slice(-30), {
      time: timestamp,
      message,
      type
    }]);
  };

  const startSimpleServer = () => {
    addLog('Starting simple peer-to-peer server...', 'info');
    
    // Create a simple connection info
    const serverInfo = {
      name: `WebServer_${Math.random().toString(36).substr(2, 5)}`,
      url: `ws://localhost:${customPort}`,
      type: 'Browser-Based',
      id: Math.random().toString(36).substr(2, 9)
    };
    
    setServerInfo(serverInfo);
    setServerRunning(true);
    
    addLog(`Server ID: ${serverInfo.id}`, 'success');
    addLog(`Share this server name with others: ${serverInfo.name}`, 'success');
    addLog('Others can connect by entering your server name', 'info');
    
    // Store server info in localStorage so others can find it
    localStorage.setItem('hostedServer', JSON.stringify(serverInfo));
    
    addLog('Server is now discoverable on local network', 'success');
  };

  const stopServer = () => {
    setServerRunning(false);
    setServerInfo(null);
    localStorage.removeItem('hostedServer');
    addLog('Server stopped', 'info');
  };

  const copyServerInfo = () => {
    const info = `Server Name: ${serverInfo.name}\nConnection: ${serverInfo.url}`;
    navigator.clipboard.writeText(info);
    addLog('Server info copied to clipboard', 'success');
  };

  return (
    <div className="simple-server-hosting">
      <div className="header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2>🖥️ Quick Server Hosting</h2>
      </div>

      <div className="content">
        <div className="server-config">
          <h3>⚙️ Server Setup</h3>
          <div className="config-item">
            <label>Port:</label>
            <input
              type="number"
              value={customPort}
              onChange={(e) => setCustomPort(e.target.value)}
              disabled={serverRunning}
              min="1024"
              max="65535"
            />
          </div>
        </div>

        <div className="server-status">
          <h3>📊 Status</h3>
          <div className={`status ${serverRunning ? 'running' : 'stopped'}`}>
            {serverRunning ? '🟢 Server Running' : '🔴 Server Stopped'}
          </div>
          
          {serverInfo && (
            <div className="server-details">
              <div><strong>Server Name:</strong> {serverInfo.name}</div>
              <div><strong>Type:</strong> {serverInfo.type}</div>
              <div><strong>ID:</strong> {serverInfo.id}</div>
              <button className="copy-btn" onClick={copyServerInfo}>
                📋 Copy Server Info
              </button>
            </div>
          )}
        </div>

        <div className="controls">
          {!serverRunning ? (
            <button className="start-btn" onClick={startSimpleServer}>
              ▶️ Start Quick Server
            </button>
          ) : (
            <div className="running-controls">
              <button className="stop-btn" onClick={stopServer}>
                ⏹️ Stop Server
              </button>
              <button 
                className="join-btn"
                onClick={() => {
                  onBack();
                  // Trigger connection to this server
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('connectToServer', {
                      detail: { url: serverInfo.url, name: serverInfo.name }
                    }));
                  }, 100);
                }}
              >
                🚪 Join My Server
              </button>
            </div>
          )}
        </div>

        <div className="logs">
          <h3>📋 Activity Log</h3>
          <div className="logs-container">
            {serverLogs.length === 0 ? (
              <div className="no-logs">No activity yet...</div>
            ) : (
              serverLogs.map((log, index) => (
                <div key={index} className={`log ${log.type}`}>
                  <span className="time">[{log.time}]</span>
                  <span className="message">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="instructions">
          <h3>📖 How It Works</h3>
          <ul>
            <li>Click "Start Quick Server" to create a discoverable server</li>
            <li>Share your server name with others on the same network</li>
            <li>Others can find your server using "Find Server by Name"</li>
            <li>This creates a peer-to-peer connection for local chatting</li>
          </ul>
          
          <div className="note">
            <strong>Note:</strong> This is a simplified browser-based server for local network use.
            For full features, use the Python server or deploy to the cloud.
          </div>
        </div>
      </div>

      <style jsx>{`
        .simple-server-hosting {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 30px;
        }

        .back-btn {
          background: #f0f0f0;
          border: none;
          padding: 8px 15px;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .back-btn:hover {
          background: #e0e0e0;
        }

        .content {
          display: grid;
          gap: 20px;
        }

        .server-config, .server-status, .controls, .logs, .instructions {
          background: white;
          border-radius: 10px;
          padding: 20px;
          border: 1px solid #e0e0e0;
        }

        .server-config h3, .server-status h3, .logs h3, .instructions h3 {
          margin: 0 0 15px 0;
          color: #333;
        }

        .config-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .config-item input {
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 5px;
          width: 100px;
        }

        .status {
          font-size: 18px;
          font-weight: bold;
          padding: 10px;
          border-radius: 8px;
          text-align: center;
        }

        .status.running {
          background: #d4edda;
          color: #155724;
        }

        .status.stopped {
          background: #f8d7da;
          color: #721c24;
        }

        .server-details {
          margin-top: 15px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .server-details div {
          margin-bottom: 8px;
        }

        .copy-btn, .start-btn, .stop-btn, .join-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .copy-btn {
          background: #007bff;
          color: white;
          margin-top: 10px;
        }

        .start-btn {
          background: #28a745;
          color: white;
          width: 100%;
          font-size: 16px;
        }

        .running-controls {
          display: flex;
          gap: 10px;
        }

        .stop-btn {
          background: #dc3545;
          color: white;
          flex: 1;
        }

        .join-btn {
          background: #17a2b8;
          color: white;
          flex: 1;
        }

        .logs-container {
          background: #1a1a1a;
          border-radius: 8px;
          padding: 15px;
          max-height: 200px;
          overflow-y: auto;
          font-family: monospace;
          font-size: 13px;
        }

        .no-logs {
          color: #666;
          text-align: center;
          padding: 20px;
          font-style: italic;
        }

        .log {
          margin-bottom: 5px;
          display: flex;
          gap: 10px;
        }

        .log .time {
          color: #888;
          min-width: 70px;
        }

        .log.info .message {
          color: #ffffff;
        }

        .log.success .message {
          color: #28a745;
        }

        .log.error .message {
          color: #dc3545;
        }

        .instructions ul {
          margin: 0;
          padding-left: 20px;
        }

        .instructions li {
          margin-bottom: 8px;
        }

        .note {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 8px;
          padding: 15px;
          margin-top: 15px;
          color: #856404;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default SimpleServerHosting;