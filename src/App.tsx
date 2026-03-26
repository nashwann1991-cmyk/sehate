import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { authService } from './services/authService';
import { UserProfile } from './types';
import { testConnection } from './firebase';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import LeaveResult from './pages/LeaveResult';
import Navbar from './components/Navbar';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testConnection();
    const unsubscribe = authService.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-medical-primary"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen flex flex-col" dir="rtl">
        <Navbar user={user} />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to={user.role === 'admin' ? '/admin' : '/doctor'} />} />
            <Route path="/verify/:leaveId" element={<LeaveResult />} />
            
            {/* Protected Routes */}
            <Route 
              path="/doctor/*" 
              element={user?.role === 'doctor' ? <DoctorDashboard user={user} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/admin/*" 
              element={user?.role === 'admin' ? <AdminDashboard user={user} /> : <Navigate to="/login" />} 
            />
          </Routes>
        </main>
        <footer className="bg-medical-dark text-white py-8 text-center">
          <p>© {new Date().getFullYear()} منصة إجازتي المرضية. جميع الحقوق محفوظة.</p>
        </footer>
      </div>
    </Router>
  );
}

