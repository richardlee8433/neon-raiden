import { createRoot } from 'react-dom/client'
import App from './App'
import { gameStore } from './store/gameStore'
;(window as any)._store = gameStore

createRoot(document.getElementById('root')!).render(<App />)
