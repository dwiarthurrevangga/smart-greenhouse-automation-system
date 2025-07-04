// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';

const container = document.getElementById('root');
const root = createRoot(container);    // createRoot menggantikan ReactDOM.render
root.render(<App />);
