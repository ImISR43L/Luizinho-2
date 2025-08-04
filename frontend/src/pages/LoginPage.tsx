import React, { useState } from 'react';
import apiClient from '../api/axiosConfig';
import { User } from '../types';
import './css/LoginPage.css';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  switchToRegister: () => void;
}

interface LoginResponse {
  user: User;
  accessToken: string;
}

const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  switchToRegister,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        email,
        password,
      });
      const { accessToken, user } = response.data;

      localStorage.setItem('accessToken', accessToken);
      onLoginSuccess(user);
    } catch (err) {
      setError('Login failed. Please check your credentials.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Welcome Back!</h2>
      <form onSubmit={handleLogin} className="auth-form">
        {error && <p className="error-message">{error}</p>}
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password-login">Password</label>
          <input
            id="password-login"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
        </div>
        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p className="switch-auth-text">
        Don't have an account?{' '}
        <button onClick={switchToRegister} className="switch-auth-button">
          Register here
        </button>
      </p>
    </div>
  );
};

export default LoginPage;
