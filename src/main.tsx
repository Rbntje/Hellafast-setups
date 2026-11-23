import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/barlow-condensed/latin-700-italic.css'
import '@fontsource/barlow-condensed/latin-800-italic.css'
import '@fontsource-variable/inter'
import { Capacitor } from '@capacitor/core'
import App from './app/App'
import './style.css'

createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>)

if (import.meta.env.PROD && !Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(new URL('./sw.js', document.baseURI)).catch(console.error)
  })
}
