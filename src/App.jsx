import { useState } from 'react'
import { NavigationBar } from './components/NavigationBar'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import './App.css'

import HomePage from './pages/Home'
import Login from './pages/Login';
import Signup from './pages/Signup';
import ContactPage from './pages/Contact';
import CustomerPage from './pages/Customer';
import StoragePage from './pages/Storage';
import BusinessHome from './pages/business/Home';
import EmployeeHome from './pages/employee/Home';

function App() {

  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Navigate to="/Home" />} />
        <Route path="/Home" element={<HomePage />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/Signup" element={<Signup />} />
        <Route path="/Contact" element={<ContactPage />} />
        <Route path="/Customer" element={<CustomerPage />} />
        <Route path="/Storage" element={<StoragePage />} />
        <Route path="/business/home" element={<BusinessHome />} />
        <Route path="/employee/home" element={<EmployeeHome />} />
        
      </Routes>
    </BrowserRouter>
  )
}

export default App