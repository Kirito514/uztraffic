import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('Mounting App...');
try {
  createRoot(document.getElementById('root')!).render(
    <App />
  )
  console.log('App mounted');
} catch (e) {
  console.error('Mount error:', e);
}
