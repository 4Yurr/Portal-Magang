import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { Spinner } from '../../components/ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { signIn } from '../../services/adminService';

export default function Login() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      showToast('Email dan password wajib diisi', 'error');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      console.error('Login error:', error);
      showToast('Login gagal. Periksa email dan password Anda.', 'error');
      return;
    }
    showToast('Login berhasil', 'success');
    navigate('/admin');
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Portal Admin</h1>
        <p>Aplikasi Magang BPJS Ketenagakerjaan</p>

        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@bpjs-magang.test"
          style={{ marginBottom: 14 }}
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
        />

        <button className="btn btn-primary btn-submit" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <Spinner size={16} /> Memproses...
            </>
          ) : (
            'LOGIN'
          )}
        </button>

        <p style={{ marginTop: 20, textAlign: 'center' }}>
          <a href="/" style={{ fontSize: '0.85rem' }}>
            ← Kembali ke Portal Peserta
          </a>
        </p>
      </div>
    </div>
  );
}
