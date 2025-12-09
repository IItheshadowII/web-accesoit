import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'
import './index.css'

const DEFAULT_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com'

async function bootstrap() {
  let clientId = DEFAULT_GOOGLE_CLIENT_ID;
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const json = await res.json();
      if (json && json.googleClientId) clientId = json.googleClientId;
    }
  } catch (err) {
    // ignore — we'll fallback to built-time variable
    console.warn('Could not fetch runtime config, using build-time clientId', err && err.message);
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <GoogleOAuthProvider clientId={clientId}>
        <App />
      </GoogleOAuthProvider>
    </React.StrictMode>
  );
}

bootstrap();
