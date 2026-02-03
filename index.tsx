import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { WalletProvider } from './contexts/WalletProvider';
import { GhostPayProvider } from './contexts/GhostPayContext';

// Polyfill Buffer for browser (must be before other imports that use it)
import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;
(globalThis as any).Buffer = Buffer;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <WalletProvider>
      <GhostPayProvider>
        <App />
      </GhostPayProvider>
    </WalletProvider>
  </React.StrictMode>
);
