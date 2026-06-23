import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { VersionStamp } from './components/VersionStamp';
import Login from './pages/Login';
import { Home } from './pages/Home';
import { Room } from './pages/Room';
import { CreateRoom } from './pages/CreateRoom';
import { JoinRoom } from './pages/JoinRoom';

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/room/:id" element={<ProtectedRoute><Room /></ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute><CreateRoom /></ProtectedRoute>} />
          <Route path="/join" element={<ProtectedRoute><JoinRoom /></ProtectedRoute>} />
          <Route path="/join/:code" element={<ProtectedRoute><JoinRoom /></ProtectedRoute>} />
        </Routes>

        <div className="fixed bottom-2 right-3">
          <VersionStamp />
        </div>
      </div>
    </AuthProvider>
  );
}
