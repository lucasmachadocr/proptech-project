import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { preloadBriefModel, preloadDisabled } from './ai/modelStatus';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Start downloading the brief-reader model in the background once the first screen is drawn.
if (!preloadDisabled()) {
  const start = () => void preloadBriefModel();
  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 2000 });
  else setTimeout(start, 800);
}
