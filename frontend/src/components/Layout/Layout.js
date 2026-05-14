import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

import UserProfileDropdown from './UserProfileDropdown';
import NotificationBell from '../Notifications/NotificationBell';
import './Layout.css';

const Layout = ({ children }) => {
  const { currentUser, logout } = useAuth();
  const { t } = useTranslation();

  const getRoleDisplayName = (role) => {
    const roleNames = {
      citizen: t('citizen'),
      kebele: t('for_kebele'),
      woreda: t('for_woreda'),
      zone: t('for_zone'),
      region: t('for_region'),
      national: t('for_national'),
    };
    return roleNames[role] || role;
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <h1>{t('ethiopia_vital_events')}</h1>
          <div className="header-actions">
            <NotificationBell />
            <UserProfileDropdown />
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