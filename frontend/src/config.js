// Configuration for different deployment environments
export const config = {
  // Online server URL (will be set after deployment)
  ONLINE_SERVER_URL: process.env.REACT_APP_SERVER_URL || 'wss://your-app-name.railway.app',
  
  // Default local server for development
  LOCAL_SERVER_URL: 'ws://localhost:8765',
  
  // Auto-detect environment
  isProduction: process.env.NODE_ENV === 'production',
  
  // Get the appropriate server URL
  getServerURL: () => {
    // If we're on GitHub Pages (production), use online server
    if (window.location.hostname === 'zothermod.github.io') {
      return config.ONLINE_SERVER_URL;
    }
    // Otherwise use local development server
    return config.LOCAL_SERVER_URL;
  }
};

export default config;