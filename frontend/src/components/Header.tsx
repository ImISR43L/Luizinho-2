import React from 'react';
import { User } from '../types';

interface HeaderProps {
  user: User;
  currentView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({
  user,
  currentView,
  onNavigate,
  onLogout,
}) => {
  return (
    <header className="main-header">
      <div className="header-left">
        <h1>Golden Habits</h1>
        {currentView !== 'pet' && (
          <div className="header-currency">
            <span>💰 Gold: {user.gold}</span>
            <span>💎 Gems: {user.gems}</span>
          </div>
        )}
      </div>
      <nav>
        <button onClick={() => onNavigate('habits')}>Habits</button>
        <button onClick={() => onNavigate('dailies')}>Dailies</button>
        <button onClick={() => onNavigate('todos')}>To-Dos</button>
        <button onClick={() => onNavigate('rewards')}>Rewards</button>
        <button onClick={() => onNavigate('groups')}>Groups</button>
        <button onClick={() => onNavigate('challenges')}>Challenges</button>
        <button onClick={() => onNavigate('pet')}>Pet</button>
        <button onClick={onLogout} style={{ marginLeft: '20px' }}>
          Logout
        </button>
      </nav>
    </header>
  );
};

export default Header;
