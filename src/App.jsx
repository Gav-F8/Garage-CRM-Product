import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import './App.css'

import ProtectedRoute from './components/ProtectedRoute';
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

        {/* Public routes */}
        <Route path="/Login" element={<Login />} />
        <Route path="/Signup" element={<Signup />} />

        {/* Protected routes */}
        <Route path="/" element={<Navigate to="/Home" />} />
        <Route path="/Home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/Contact" element={<ProtectedRoute><ContactPage /></ProtectedRoute>} />
        <Route path="/Customer" element={<ProtectedRoute><CustomerPage /></ProtectedRoute>} />
        <Route path="/Storage" element={<ProtectedRoute><StoragePage /></ProtectedRoute>} />
        <Route path="/business/home" element={<ProtectedRoute><BusinessHome /></ProtectedRoute>} />
        <Route path="/employee/home" element={<ProtectedRoute><EmployeeHome /></ProtectedRoute>} />

      </Routes>
    </BrowserRouter>
  )
}

export default App