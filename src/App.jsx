import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ContactPage from "./pages/Contact";

import CustomerPage from "./pages/Customer";
import CustomerDetailPage from "./pages/CustomerDetail";
import EditCustomerPage from "./pages/EditCustomerPage";

import StoragePage from "./pages/Storage";
import StorageDetailPage from "./pages/StorageDetail";
import EditCarPage from "./pages/EditCarPage";

import ProjectPage from "./pages/Project";
import ProjectDetailsPage from "./pages/ProjectDetailsPage";
import EditProjectPage from "./pages/EditProjectPage";

import BusinessHome from "./pages/business/Home";
import EmployeeHome from "./pages/employee/Home";
import EmployeeManagement from "./pages/business/EmployeeManagement";

function App() {
  return (
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
          path="/Contact"
          element={
            <ProtectedRoute>
              <ContactPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Customer"
          element={
            <ProtectedRoute>
              <CustomerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/:customerId"
          element={
            <ProtectedRoute>
              <CustomerDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Storage"
          element={
            <ProtectedRoute>
              <StoragePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/storage/:storageId"
          element={
            <ProtectedRoute>
              <StorageDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/business/home"
          element={
            <ProtectedRoute>
              <BusinessHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/business/employees"
          element={
            <ProtectedRoute>
              <EmployeeManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/home"
          element={
            <ProtectedRoute>
              <EmployeeHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs"
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
          path="/customer/:customerId/edit"
          element={
            <ProtectedRoute>
              <EditCustomerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/storage/:storageId/edit"
          element={
            <ProtectedRoute>
              <EditCarPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;