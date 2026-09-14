import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign ONNX Runtime node-assignment / EP warnings emitted via Emscripten/WASM
if (typeof window !== 'undefined') {
  const filterBenignOrtLogs = (originalFn: (...args: unknown[]) => void) => {
    return (...args: unknown[]) => {
      const msg = args.map(a => (typeof a === 'string' ? a : (a instanceof Error ? a.message : ''))).join(' ');
      if (
        msg.includes('VerifyEachNodeIsAssignedToAnEp') ||
        msg.includes('Some nodes were not assigned to the preferred execution providers') ||
        msg.includes('Rerunning with verbose output on a non-minimal build')
      ) {
        return;
      }
      originalFn.apply(console, args);
    };
  };

  console.warn = filterBenignOrtLogs(console.warn);
  console.error = filterBenignOrtLogs(console.error);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
