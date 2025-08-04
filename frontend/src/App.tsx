import React, { useState, useEffect, useCallback } from 'react';
import apiClient from './api/axiosConfig';
import { User } from './types';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import './App.css';

type AuthPage = 'login' | 'register';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSessionChecked, setIsSessionChecked] = useState(false);
  const [authPage, setAuthPage] = useState<AuthPage>('login');

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsSessionChecked(true);
      return null;
    }
    try {
      const response = await apiClient.get('/users/profile');
      setCurrentUser(response.data);
      return response.data;
    } catch (error) {
      console.log('Token is invalid or expired. Clearing session.');
      localStorage.removeItem('accessToken');
      setCurrentUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const checkUserSession = async () => {
      await fetchUser();
      setIsSessionChecked(true);
    };
    checkUserSession();
  }, [fetchUser]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleRegisterSuccess = () => {
    alert('Registration successful! Please log in.');
    setAuthPage('login');
  };

  const switchToLogin = () => {
    setAuthPage('login');
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setCurrentUser(null);
    setAuthPage('login');
  };

  if (!isSessionChecked) {
    return <div>Loading...</div>;
  }

  return (
    <div className="app-container">
      {currentUser ? (
        <DashboardPage
          user={currentUser}
          onLogout={handleLogout}
          refreshUser={fetchUser}
        />
      ) : (
        <main className="auth-page-wrapper">
          {authPage === 'login' ? (
            <LoginPage
              onLoginSuccess={handleLoginSuccess}
              switchToRegister={() => setAuthPage('register')}
            />
          ) : (
            <RegisterPage
              onRegisterSuccess={handleRegisterSuccess}
              switchToLogin={switchToLogin}
            />
          )}
        </main>
      )}
    </div>
  );
}
