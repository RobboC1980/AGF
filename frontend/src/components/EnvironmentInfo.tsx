import React from 'react';
import { API_CONFIG, APP_CONFIG, FEATURE_FLAGS, debugLog, isDevelopment } from '../config/env';

// Example component showing how to use environment variables
const EnvironmentInfo: React.FC = () => {
  // Log debug information when component mounts
  React.useEffect(() => {
    debugLog('EnvironmentInfo component mounted');
    debugLog('Current configuration:', {
      API: API_CONFIG,
      APP: APP_CONFIG,
      FEATURES: FEATURE_FLAGS,
    });
  }, []);

  // Only show this component in development
  if (!isDevelopment()) {
    return null;
  }

  return (
    <div style={{ 
      padding: '16px', 
      margin: '16px', 
      border: '1px solid #ccc', 
      borderRadius: '8px',
      backgroundColor: '#f9f9f9',
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      <h3>Environment Configuration (Development Only)</h3>
      
      <div style={{ marginBottom: '12px' }}>
        <strong>App Info:</strong>
        <ul>
          <li>Name: {APP_CONFIG.NAME}</li>
          <li>Version: {APP_CONFIG.VERSION}</li>
          <li>Environment: {APP_CONFIG.ENVIRONMENT}</li>
        </ul>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <strong>API Configuration:</strong>
        <ul>
          <li>Base URL: {API_CONFIG.BASE_URL}</li>
          <li>Timeout: {API_CONFIG.TIMEOUT}ms</li>
        </ul>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <strong>Feature Flags:</strong>
        <ul>
          <li>Analytics: {FEATURE_FLAGS.ENABLE_ANALYTICS ? '✅' : '❌'}</li>
          <li>Debug: {FEATURE_FLAGS.ENABLE_DEBUG ? '✅' : '❌'}</li>
        </ul>
      </div>

      <div style={{ fontSize: '10px', color: '#666' }}>
        💡 This component only appears in development mode
      </div>
    </div>
  );
};

export default EnvironmentInfo; 