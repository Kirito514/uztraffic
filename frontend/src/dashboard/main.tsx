import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { Dashboard } from './Dashboard'
import { ThemeProvider } from './theme'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <Dashboard />
    </ThemeProvider>
  </StrictMode>,
)
