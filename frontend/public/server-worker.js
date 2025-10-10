// Web Worker for handling WebSocket server in the browser
class BrowserChatServer {
  constructor() {
    this.server = null;
    this.clients = new Map();
    this.rooms = new Map();
    this.messageHistory = new Map();
  }

  start(config) {
    try {
      // Create a WebSocket server using a library like ws (would need to be included)
      // For demo purposes, we'll simulate server functionality
      
      const { port, serverName, host } = config;
      const serverUrl = `ws://localhost:${port}`;
      
      // In a real implementation, you'd start an actual WebSocket server here
      // For now, we'll create a mock server that can accept connections
      this.simulateServer(serverUrl, serverName);
      
      this.postMessage({
        type: 'started',
        data: {
          url: serverUrl,
          name: serverName,
          port: port
        }
      });
      
      this.postMessage({
        type: 'log',
        data: {
          message: `Server started on ${serverUrl}`,
          level: 'info'
        }
      });
      
    } catch (error) {
      this.postMessage({
        type: 'error',
        data: {
          message: error.message
        }
      });
    }
  }

  simulateServer(url, name) {
    // This is a simplified simulation
    // In reality, you'd need a proper WebSocket server implementation
    
    this.postMessage({
      type: 'log',
      data: {
        message: `WebSocket server listening on ${url}`,
        level: 'info'
      }
    });

    this.postMessage({
      type: 'log',
      data: {
        message: `Server name: ${name}`,
        level: 'info'
      }
    });

    // Simulate periodic activity
    this.serverInterval = setInterval(() => {
      // Random chance of simulated activity
      if (Math.random() < 0.1) {
        this.postMessage({
          type: 'log',
          data: {
            message: 'Server heartbeat - all systems operational',
            level: 'info'
          }
        });
      }
    }, 10000);
  }

  stop() {
    if (this.serverInterval) {
      clearInterval(this.serverInterval);
    }
    
    // Disconnect all clients
    this.clients.clear();
    this.rooms.clear();
    this.messageHistory.clear();
    
    this.postMessage({
      type: 'log',
      data: {
        message: 'Server stopped',
        level: 'info'
      }
    });
  }

  postMessage(data) {
    // Send message back to main thread
    if (typeof self !== 'undefined' && self.postMessage) {
      self.postMessage(data);
    }
  }
}

// Web Worker message handler
let server = null;

self.onmessage = function(event) {
  const { action, config } = event.data;
  
  switch(action) {
    case 'start':
      if (!server) {
        server = new BrowserChatServer();
      }
      server.start(config);
      break;
      
    case 'stop':
      if (server) {
        server.stop();
        server = null;
      }
      break;
      
    default:
      console.log('Unknown action:', action);
  }
};