import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// In App.js or main component
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/forms.css'; // Your custom CSS
// Auth Components
import Login from './components/Auth/Login';
import RegisterCitizen from './components/Auth/RegisterCitizen';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';


// Dashboard Components
import CitizenDashboard from './components/Dashboards/CitizenDashboard';
import KebeleDashboard from './components/Dashboards/KebeleDashboard';
import WoredaDashboard from './components/Dashboards/WoredaDashboard';
import ZoneDashboard from './components/Dashboards/ZoneDashboard';
import RegionDashboard from './components/Dashboards/RegionDashboard';
import NationalDashboard from './components/Dashboards/NationalDashboard';
import InitiateUpdateRequest from './components/Dashboards/InitiateUpdateRequest';
import UpdateReview from './components/Dashboards/UpdateReview';
import ViewCitizen from './components/Dashboards/ViewCitizen';
import Layout from './components/Layout/Layout';

// Home Component
import Home from './components/Home/Home';
import PaymentVerification from './components/PaymentVerification';
import PaymentSuccess from './components/PaymentSuccess';
import PaymentFailed from './components/PaymentFailed';



const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // Handle both simple and full role names
  const userRole = currentUser.role || '';
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
    if (userRole?.includes('kebele')) targetRoute = '/kebele';
    else if (userRole?.includes('woreda')) targetRoute = '/woreda';
    else if (userRole?.includes('zone')) targetRoute = '/zone';
    else if (userRole?.includes('region')) targetRoute = '/region';
    else if (userRole?.includes('national')) targetRoute = '/national';
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
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            <Route path="/citizen" element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <Layout>
                  <CitizenDashboard />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/initiate-update" element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <Layout>
                  <InitiateUpdateRequest />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/review-update/:citizenId" element={
              <ProtectedRoute allowedRoles={['kebele', 'woreda', 'zone', 'region', 'national']}>
                <Layout>
                  <UpdateReview />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/citizen-profile/:citizenId" element={
              <ProtectedRoute allowedRoles={['kebele', 'woreda', 'zone', 'region', 'national']}>
                <Layout>
                  <ViewCitizen />
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


            <Route path="/payment/verify" element={<PaymentVerification />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/failed" element={<PaymentFailed />} />
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={true}
            closeOnClick={true}
            rtl={false}
            pauseOnFocusLoss={true}
            draggable={true}
            pauseOnHover={true}
            theme="colored"
          />
        </div>
      </Router >
    </AuthProvider >
  );
}

export default App;