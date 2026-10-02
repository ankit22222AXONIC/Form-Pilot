import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import Dashboard from './Dashboard';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Dashboard />
  </StrictMode>
);
