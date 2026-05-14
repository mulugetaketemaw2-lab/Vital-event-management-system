import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Layout.css';

const Layout = ({ children }) => {
  const { currentUser, logout } = useAuth();

  const getRoleDisplayName = (role) => {
    const roleNames = {
      citizen: 'Citizen',
      kebele: 'Kebele Representative',
      woreda: 'Woreda Representative',
      zone: 'Zone Representative',
      region: 'Regional Representative',
      national: 'National Representative',
      // admin: 'System Administrator'
    };
    return roleNames[role] || role;
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <h1>Ethiopia Vital Events System</h1>
          <div className="user-info">
            <span>Welcome, {currentUser?.personalInfo?.firstName || currentUser?.username}</span>
            <span className="role-badge">{getRoleDisplayName(currentUser?.role)}</span>
            <button onClick={logout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;