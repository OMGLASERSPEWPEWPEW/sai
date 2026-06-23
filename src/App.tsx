import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { Home } from './pages/Home';
import { Room } from './pages/Room';
import { CreateRoom } from './pages/CreateRoom';
import { JoinRoom } from './pages/JoinRoom';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/room/:id" element={<ProtectedRoute><Room /></ProtectedRoute>} />
        <Route path="/create" element={<ProtectedRoute><CreateRoom /></ProtectedRoute>} />
        <Route path="/join" element={<ProtectedRoute><JoinRoom /></ProtectedRoute>} />
        <Route path="/join/:code" element={<ProtectedRoute><JoinRoom /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}
