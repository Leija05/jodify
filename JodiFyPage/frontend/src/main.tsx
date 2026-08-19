import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/outfit';
import '@fontsource-variable/manrope';
import '@fontsource/jetbrains-mono/400.css';
import './index.css';
import './styles/layout.css';
import './styles/player.css';
import './styles/components.css';
import './styles/features.css';
import './styles/social.css';
import './styles/admin.css';
import './styles/dev.css';
import './styles/auth.css';
import './styles/updater.css';
import './styles/responsive.css';
import App from './App';

const isFileProtocol = window.location.protocol === 'file:';
if (!isFileProtocol && 'serviceWorker' in navigator) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
