import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './styles.css'
import App from './App.jsx'
import Home from './Home.jsx'
import Rules from './Rules.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<App />} />
        <Route path="/rules" element={<Rules />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)