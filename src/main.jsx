import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import './app/globals.css'
import { TranscriptProvider } from './app/contexts/TranscriptContext'
import { EventProvider } from './app/contexts/EventContext'
import App from './app/App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<div>Loading...</div>}>
      <TranscriptProvider>
        <EventProvider>
          <App />
        </EventProvider>
      </TranscriptProvider>
    </Suspense>
  </React.StrictMode>,
)
