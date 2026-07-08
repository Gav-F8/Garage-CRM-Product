import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import { useEffect, useState } from 'react';

import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CustomerPage from "./pages/Customer";
import CustomerDetailPage from "./pages/CustomerDetail";
import EditCustomerPage from "./pages/EditCustomerPage";

import VehiclePage from "./pages/Vehicle";
import VehicleDetailPage from "./pages/VehicleDetail";
import EditVehiclePage from "./pages/EditVehiclePage";

import ProjectPage from "./pages/Project";
import ProjectDetailsPage from "./pages/ProjectDetails";
import EditProjectPage from "./pages/EditProjectPage";

import EmployeeManagement from "./pages/EmployeeManagement";

export default function App() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setUpdateAvailable(true);
      })
    }
  }, [])

  return (
    <>
      {updateAvailable && (
        <div className="bg-blue-500 text-white p-4 text-center">
          New version available!{' '}
          <button onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      )}
      {
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/Login" element={<Login />} />
            <Route path="/Signup" element={<Signup />} />

            {/* Protected routes */}
            <Route path="/" element={<Navigate to="/Home" />} />
            <Route
              path="/Home"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <ProjectPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId"
              element={
                <ProtectedRoute>
                  <ProjectDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId/edit"
              element={
                <ProtectedRoute>
                  <EditProjectPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicles"
              element={
                <ProtectedRoute>
                  <VehiclePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicles/:vehicleId"
              element={
                <ProtectedRoute>
                  <VehicleDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicles/:vehicleId/edit"
              element={
                <ProtectedRoute>
                  <EditVehiclePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <CustomerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers/:customerId"
              element={
                <ProtectedRoute>
                  <CustomerDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers/:customerId/edit"
              element={
                <ProtectedRoute>
                  <EditCustomerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute>
                  <EmployeeManagement />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      }
    </>
  );
}
