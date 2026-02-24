import { useState } from 'react'
import { NavigationBar } from './components/NavigationBar'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import './App.css'

import HomePage from './pages/Home'
import Login from './pages/Login';
import JobPage from './pages/Job';
import ContactPage from './pages/Contact';
import CreateCustomerPage from './pages/Customer';

function App() {

  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Navigate to="/Home" />} />
        <Route path="/Home" element={<HomePage />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/Contact" element={<ContactPage />} />
        <Route path="/Jobs" element={<JobPage />} />
        <Route path="/Customer" element={<CreateCustomerPage />} />
        
      </Routes>
    </BrowserRouter>
  )
}

export default App