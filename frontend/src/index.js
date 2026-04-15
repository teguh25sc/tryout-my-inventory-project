import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Pastikan kamu membuat file index.css yang berisi directive tailwind
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
