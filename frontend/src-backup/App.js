import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Auth Components
import Login from './components/Auth/Login';
import RegisterCitizen from './components/Auth/RegisterCitizen';

// Dashboard Components
import CitizenDashboard from './components/Dashboards/CitizenDashboard';
import KebeleDashboard from './components/Dashboards/KebeleDashboard';
import WoredaDashboard from './components/Dashboards/WoredaDashboard';
import ZoneDashboard from './components/Dashboards/ZoneDashboard';
import RegionDashboard from './components/Dashboards/RegionDashboard';
import NationalDashboard from './components/Dashboards/NationalDashboard';
import Layout from './components/Layout/Layout';

// Home Component
import Home from './components/Home/Home';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // Handle both simple and full role names
  const userRole = currentUser.role;
  const isAllowed = allowedRoles.some(role => {
    if (role === 'kebele') return userRole === 'kebele' || userRole === 'kebele_representative';
    if (role === 'woreda') return userRole === 'woreda' || userRole === 'woreda_representative';
    if (role === 'zone') return userRole === 'zone' || userRole === 'zone_representative';
    if (role === 'region') return userRole === 'region' || userRole === 'region_representative';
    if (role === 'national') return userRole === 'national' || userRole === 'national_representative';
    if (role === 'citizen') return userRole === 'citizen';
    return userRole === role;
  });

  if (!isAllowed) {
    // Navigate to appropriate dashboard based on actual role
    let targetRoute = '/';
    if (userRole.includes('kebele')) targetRoute = '/kebele';
    else if (userRole.includes('woreda')) targetRoute = '/woreda';
    else if (userRole.includes('zone')) targetRoute = '/zone';
    else if (userRole.includes('region')) targetRoute = '/region';
    else if (userRole.includes('national')) targetRoute = '/national';
    else if (userRole === 'citizen') targetRoute = '/citizen';
    
    return <Navigate to={targetRoute} />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register-citizen" element={<RegisterCitizen />} />
            
            <Route path="/citizen" element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <Layout>
                  <CitizenDashboard />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/kebele" element={
              <ProtectedRoute allowedRoles={['kebele']}>
                <Layout>
                  <KebeleDashboard />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/woreda" element={
              <ProtectedRoute allowedRoles={['woreda']}>
                <Layout>
                  <WoredaDashboard />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/zone" element={
              <ProtectedRoute allowedRoles={['zone']}>
                <Layout>
                  <ZoneDashboard />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/region" element={
              <ProtectedRoute allowedRoles={['region']}>
                <Layout>
                  <RegionDashboard />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/national" element={
              <ProtectedRoute allowedRoles={['national']}>
                <Layout>
                  <NationalDashboard />
                </Layout>
              </ProtectedRoute>
            } />

            
            
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <ToastContainer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;