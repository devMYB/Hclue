// import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import LoginInfo from './pages/LoginInfo';
import Pricing from './pages/Pricing';
import SessionDashboard from './pages/SessionDashboard';
import FacilitatorDashboard from './pages/FacilitatorDashboard';
import ParticipantView from './pages/ParticipantView';
import ManageSubscription from './pages/ManageSubscription';

function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/login-info" element={<LoginInfo />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <SessionDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/manage-subscription" element={
                  <ProtectedRoute>
                    <ManageSubscription />
                  </ProtectedRoute>
                } />
                <Route path="/facilitator/:sessionId" element={
                  <ProtectedRoute>
                    <FacilitatorDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/session/:sessionId" element={
                  <ProtectedRoute>
                    <ParticipantView />
                  </ProtectedRoute>
                } />
              </Routes>
            </main>
          </div>
        </Router>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default App;
