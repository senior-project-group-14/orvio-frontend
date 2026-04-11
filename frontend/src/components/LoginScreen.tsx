import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { login, setToken, setCurrentUserRole, setCurrentUserId } from '../api/client';

interface LoginScreenProps {
  onLogin: () => void;
  onNavigateToRegister?: () => void;
}

export default function LoginScreen({ onLogin, onNavigateToRegister }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.token) setToken(res.token);
      if (res.user?.user_id) {
        setCurrentUserId(res.user.user_id);
      }
      if (res.user?.role !== undefined && res.user?.role !== null) {
        setCurrentUserRole(res.user.role);
      }
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: '#F5F7FA' }}>
      {/* Logo / Title Area */}
      <div className="flex flex-col items-center" style={{ marginBottom: '48px' }}>
        {/* Logo Placeholder */}
        <div 
          className="rounded-full flex items-center justify-center"
          style={{
            width: '96px',
            height: '96px',
            backgroundColor: '#2563EB',
            marginBottom: '16px'
          }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 11H12.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 15H12.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        {/* Title */}
        <h1 
          className="tracking-tight"
          style={{
            fontSize: '24px',
            fontWeight: 600,
            color: '#1A1C1E'
          }}
        >
          Smart Fridge Admin Panel
        </h1>
      </div>

      {/* Login Card */}
      <div 
        className="bg-white"
        style={{
          width: '400px',
          padding: '32px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
        }}
      >
        <form onSubmit={handleLogin}>
          {/* Email Input */}
          <div style={{ marginBottom: '16px' }}>
            <label 
              htmlFor="email"
              className="block"
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#1A1C1E',
                marginBottom: '6px'
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              style={{
                height: '44px',
                border: '1px solid #D0D5DD',
                borderRadius: '8px',
                fontSize: '14px'
              }}
              required
            />
          </div>

          {/* Password Input */}
          <div style={{ marginBottom: '8px' }}>
            <label 
              htmlFor="password"
              className="block"
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#1A1C1E',
                marginBottom: '6px'
              }}
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                style={{
                  height: '44px',
                  border: '1px solid #D0D5DD',
                  borderRadius: '8px',
                  fontSize: '14px',
                  paddingRight: '40px'
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="text-right" style={{ marginBottom: '24px' }}>
            <a 
              href="#"
              className="inline-block hover:underline"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#3B82F6'
              }}
              onClick={(e) => {
                e.preventDefault();
                alert('Password reset functionality would go here');
              }}
            >
              Forgot password?
            </a>
          </div>

          {/* Error Message */}
          {error && (
            <div 
              style={{
                padding: '8px',
                borderRadius: '6px',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                fontSize: '13px',
                marginBottom: '16px'
              }}
            >
              {error}
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full transition-colors hover:bg-blue-700"
            style={{
              height: '44px',
              backgroundColor: '#2563EB',
              color: 'white',
              fontSize: '15px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.8 : 1
            }}
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        {/* Register Link */}
        {onNavigateToRegister && (
          <div className="text-center" style={{ marginTop: '24px' }}>
            <span style={{ fontSize: '14px', color: '#6B7280' }}>
              Don't have an account?{' '}
            </span>
            <button
              onClick={onNavigateToRegister}
              className="hover:underline"
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#2563EB',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0
              }}
            >
              Register
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: '32px' }}>
        <p 
          style={{
            fontSize: '12px',
            color: '#6B7280'
          }}
        >
          © 2025 Smart Fridge System
        </p>
      </div>
    </div>
  );
}