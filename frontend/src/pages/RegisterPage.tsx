import React, { useState } from 'react';
import apiClient from '../api/axiosConfig';
import './css/RegisterPage.css';

interface RegisterPageProps {
  onRegisterSuccess: () => void;
  switchToLogin: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({
  onRegisterSuccess,
  switchToLogin,
}) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/auth/register', { username, email, password });
      onRegisterSuccess();
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Registration failed. Please try again.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Create an Account</h2>
      <form onSubmit={handleRegister} className="auth-form">
        {error && <p className="error-message">{error}</p>}
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your username"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email-register">Email</label>
          <input
            id="email-register"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password-register">Password</label>
          <input
            id="password-register"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            required
            minLength={8}
          />
        </div>
        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Registering...' : 'Create Account'}
        </button>
      </form>
      <p className="switch-auth-text">
        Already have an account?{' '}
        <button onClick={switchToLogin} className="switch-auth-button">
          Login here
        </button>
      </p>
    </div>
  );
};

export default RegisterPage;
