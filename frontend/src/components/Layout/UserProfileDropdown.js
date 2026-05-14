import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import './UserProfileDropdown.css';

const UserProfileDropdown = () => {
  const { currentUser, logout } = useAuth();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [openSections, setOpenSections] = useState({
    system_operations: true,
    data_and_stats: false,
    regional_admin: false,
    reports_cat: false,
    citizen_dashboard: true,
    citizen_events: false,
    citizen_certificates: false,
    citizen_credentials: false,
    citizen_profile: false,
    citizen_logout: false,
    user_options: false
  });
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const toggleSection = (sectionId) => {
    setOpenSections(prev => {
      const newState = {};
      Object.keys(prev).forEach(key => {
        newState[key] = false;
      });
      newState[sectionId] = !prev[sectionId];
      return newState;
    });
  };

  const toggleDropdown = () => setIsOpen(!isOpen);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleInfo = (role) => {
    const r = role.toLowerCase();
    if (r.includes('national')) return { 
        name: t('national_dashboard') || 'National Dashboard', 
        role: t('for_national') || 'National Administrator',
        gradient: 'linear-gradient(135deg, #f97316, #facc15)',
        icon: '🇪🇹'
    };
    if (r.includes('region')) return { 
        name: t('region_dashboard') || 'Region Dashboard', 
        role: t('for_region') || 'Region Director',
        gradient: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
        icon: '🗺️'
    };
    if (r.includes('zone')) return { 
        name: t('zone_dashboard') || 'Zone Dashboard', 
        role: t('for_zone') || 'Zone Supervisor',
        gradient: 'linear-gradient(135deg, #10b981, #3b82f6)',
        icon: '🌍'
    };
    if (r.includes('woreda')) return { 
        name: t('woreda_dashboard') || 'Woreda Dashboard', 
        role: t('for_woreda') || 'Woreda Coordinator',
        gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
        icon: '🏢'
    };
    if (r.includes('kebele')) return { 
        name: t('kebele_dashboard') || 'Kebele Dashboard', 
        role: t('for_kebele') || 'Kebele Administrator',
        gradient: 'linear-gradient(135deg, #6366f1, #a855f7)',
        icon: '🏠'
    };
    
    // Default to citizen
    return { 
        name: t('citizen_dashboard') || 'Citizen Dashboard', 
        role: t('citizen') || 'Citizen User',
        gradient: 'linear-gradient(135deg, #3b82f6, #2dd4bf)',
        icon: '👤'
    };
  };

  const role = currentUser?.role || 'citizen';
  const roleInfo = getRoleInfo(role);
  const name = currentUser?.personalInfo?.firstName ? `${currentUser.personalInfo.firstName} ${currentUser.personalInfo.lastName || ''}` : currentUser?.username || 'User';
  const email = currentUser?.email || 'user@vital.et';
  const initials = roleInfo.icon;

  // Define tasks based on role
  const getTasksByRole = (role) => {
    const r = role.toLowerCase();
    
    // Grouped sections for more complex roles like National
    let sections = [];

    if (r.includes('national')) {
      sections = [
        {
          id: 'system_operations',
          label: t('system_operations') || 'Monitoring & Operations',
          tasks: [
            { id: 'overview', label: t('national_overview') || 'National Overview', icon: '📊', tabId: 'overview', color: '#4f46e5', bgColor: '#eef2ff' },
            { id: 'registrations', label: t('registrations_tab') || 'Registrations', icon: '📋', tabId: 'registrations', color: '#059669', bgColor: '#ecfdf5' },
          ]
        },
        {
          id: 'data_and_stats',
          label: t('data_and_stats') || 'Data & Statistics',
          tasks: [
            { id: 'records', label: t('records_tab') || 'Records', icon: '📂', tabId: 'records', color: '#0d9488', bgColor: '#f0fdfa' },
            { id: 'statistics', label: t('statistics_tab') || 'Statistics', icon: '📊', tabId: 'statistics', color: '#0284c7', bgColor: '#f0f9ff' },
          ]
        },
        {
          id: 'regional_admin',
          label: t('regional_admin') || 'Regional Administration',
          tasks: [
            { id: 'regions', label: t('regional_management') || 'Regional Management', icon: '🌍', tabId: 'regions', color: '#db2777', bgColor: '#fdf2f8' },
            { id: 'create-regional', label: t('create_regional') || 'Create Regional', icon: '➕', tabId: 'create-regional', color: '#f59e0b', bgColor: '#fffbeb' },
          ]
        },
        {
          id: 'reports_cat',
          label: t('Reports') || 'Reports',
          tasks: [
            { id: 'reports', label: t('generate_reports') || 'Generate Reports', icon: '📈', tabId: 'reports', color: '#7c3aed', bgColor: '#f5f3ff' },
            { id: 'inbox', label: t('report_inbox') || 'Report Inbox', icon: '📬', tabId: 'inbox', color: '#ea580c', bgColor: '#fff7ed' },
          ]
        }
      ];
    } else if (r.includes('zone')) {
      sections = [
        {
          id: 'zone_overview_section',
          label: t('zone_overview') || '📊 Zone Overview',
          tasks: [
            { id: 'overview', label: t('zone_overview') || 'Zone Overview', icon: '📊', tabId: 'overview', color: '#4f46e5', bgColor: '#eef2ff' },
            { id: 'citizens', label: t('citizens_tab') || 'Citizens', icon: '👥', tabId: 'citizens', color: '#059669', bgColor: '#ecfdf5' },
            { id: 'events', label: t('events_tab') || 'Events', icon: '📋', tabId: 'events', color: '#d97706', bgColor: '#fffbeb' },
            { id: 'updates', label: t('update_requests') || 'Update Requests', icon: '🔄', tabId: 'updates', color: '#e11d48', bgColor: '#fff1f2' },
          ]
        },
        {
          id: 'zone_reports_section',
          label: t('Reports') || 'Reports',
          tasks: [
            { id: 'reports', label: t('generate_reports') || 'Generate Reports', icon: '📊', tabId: 'reports', color: '#7c3aed', bgColor: '#f5f3ff' },
            { id: 'inbox', label: t('report_inbox') || 'Report Inbox', icon: '📬', tabId: 'inbox', color: '#ea580c', bgColor: '#fff7ed' },
          ]
        },
        {
          id: 'zone_stats_section',
          label: t('statistics_tab') || 'Statistics',
          tasks: [
            { id: 'statistics', label: t('statistics_tab') || 'Statistics', icon: '📈', tabId: 'statistics', color: '#0284c7', bgColor: '#f0f9ff' },
            { id: 'records', label: t('records_tab') || 'Records', icon: '📂', tabId: 'records', color: '#0d9488', bgColor: '#f0fdfa' },
          ]
        },
        {
          id: 'zone_admin_section',
          label: t('account_management') || 'Account Management',
          tasks: [
            { id: 'woredas', label: t('woreda_management') || 'Woreda Management', icon: '🏢', tabId: 'woredas', color: '#db2777', bgColor: '#fdf2f8' },
            { id: 'create-woreda', label: t('create_woreda') || 'Create Woreda', icon: '➕', tabId: 'create-woreda', color: '#f59e0b', bgColor: '#fffbeb' },
          ]
        },
      ];
    } else if (r.includes('region')) {
      sections = [
        {
          id: 'region_overview_section',
          label: t('regional_overview') || 'Regional Overview',
          tasks: [
            { id: 'overview', label: t('regional_overview') || 'Regional Overview', icon: '📊', tabId: 'overview', color: '#4f46e5', bgColor: '#eef2ff' },
            { id: 'citizens', label: t('citizens_tab') || 'Citizens', icon: '👥', tabId: 'citizens', color: '#059669', bgColor: '#ecfdf5' },
            { id: 'events', label: t('events_tab') || 'Events', icon: '📋', tabId: 'events', color: '#d97706', bgColor: '#fffbeb' },
            { id: 'updates', label: t('update_requests') || 'Update Requests', icon: '🔄', tabId: 'updates', color: '#e11d48', bgColor: '#fff1f2' },
          ]
        },
        {
          id: 'region_reports_section',
          label: t('Reports') || 'Reports',
          tasks: [
            { id: 'reports', label: t('generate_reports') || 'Generate Reports', icon: '📊', tabId: 'reports', color: '#7c3aed', bgColor: '#f5f3ff' },
            { id: 'inbox', label: t('report_inbox') || 'Report Inbox', icon: '📬', tabId: 'inbox', color: '#ea580c', bgColor: '#fff7ed' },
          ]
        },
        {
          id: 'region_stats_section',
          label: t('statistics_tab') || 'Statistics',
          tasks: [
            { id: 'statistics', label: t('statistics_tab') || 'Statistics', icon: '📈', tabId: 'statistics', color: '#0284c7', bgColor: '#f0f9ff' },
            { id: 'records', label: t('records_tab') || 'Records', icon: '📂', tabId: 'records', color: '#0d9488', bgColor: '#f0fdfa' },
          ]
        },
        {
          id: 'region_admin_section',
          label: t('account_management') || 'Account Management',
          tasks: [
            { id: 'zones', label: t('zone_management') || 'Zone Management', icon: '🏢', tabId: 'zones', color: '#db2777', bgColor: '#fdf2f8' },
            { id: 'create-zone', label: t('create_zone') || 'Create Zone', icon: '➕', tabId: 'create-zone', color: '#f59e0b', bgColor: '#fffbeb' },
          ]
        },
      ];
    } else if (r.includes('woreda')) {
      sections = [
        {
          id: 'woreda_overview_section',
          label: t('woreda_overview') || 'Woreda Overview',
          tasks: [
            { id: 'overview', label: t('woreda_overview') || 'Woreda Overview', icon: '📊', tabId: 'overview', color: '#4f46e5', bgColor: '#eef2ff' },
            { id: 'citizens', label: t('citizens_tab') || 'Citizens', icon: '👥', tabId: 'citizens', color: '#059669', bgColor: '#ecfdf5' },
            { id: 'events', label: t('events_tab') || 'Events', icon: '📋', tabId: 'events', color: '#d97706', bgColor: '#fffbeb' },
            { id: 'updates', label: t('update_requests') || 'Update Requests', icon: '🔄', tabId: 'updates', color: '#e11d48', bgColor: '#fff1f2' },
          ]
        },
        {
          id: 'woreda_reports_section',
          label: t('Reports') || 'Reports',
          tasks: [
            { id: 'reports', label: t('generate_reports') || 'Generate Reports', icon: '📊', tabId: 'reports', color: '#7c3aed', bgColor: '#f5f3ff' },
            { id: 'inbox', label: t('report_inbox') || 'Report Inbox', icon: '📬', tabId: 'inbox', color: '#ea580c', bgColor: '#fff7ed' },
          ]
        },
        {
          id: 'woreda_stats_section',
          label: t('statistics_tab') || 'Statistics',
          tasks: [
            { id: 'statistics', label: t('statistics_tab') || 'Statistics', icon: '📈', tabId: 'statistics', color: '#0284c7', bgColor: '#f0f9ff' },
            { id: 'records', label: t('records_tab') || 'Records', icon: '📂', tabId: 'records', color: '#0d9488', bgColor: '#f0fdfa' },
          ]
        },
        {
          id: 'woreda_admin_section',
          label: t('account_management') || 'Account Management',
          tasks: [
            { id: 'kebeles', label: t('kebele_management') || 'Kebele Management', icon: '🏢', tabId: 'kebeles', color: '#db2777', bgColor: '#fdf2f8' },
            { id: 'create-kebele', label: t('create_kebele') || 'Create Kebele', icon: '➕', tabId: 'create-kebele', color: '#f59e0b', bgColor: '#fffbeb' },
          ]
        },
      ];
    } else if (r.includes('kebele')) {
      sections = [
        {
          id: 'kebele_overview_section',
          label: t('kebele_overview') || 'Kebele Overview',
          tasks: [
            { id: 'overview', label: t('kebele_overview') || 'Kebele Overview', icon: '📊', tabId: 'overview', color: '#4f46e5', bgColor: '#eef2ff' },
            { id: 'citizens', label: t('citizens_tab') || 'Citizens', icon: '👥', tabId: 'citizens', color: '#059669', bgColor: '#ecfdf5' },
            { id: 'events', label: t('events_tab') || 'Events', icon: '📋', tabId: 'events', color: '#d97706', bgColor: '#fffbeb' },
            { id: 'updates', label: t('update_requests') || 'Update Requests', icon: '🔄', tabId: 'updates', color: '#e11d48', bgColor: '#fff1f2' },
          ]
        },
        {
          id: 'kebele_reports_section',
          label: t('Reports') || 'Reports',
          tasks: [
            { id: 'reports', label: t('generate_reports') || 'Generate Reports', icon: '📊', tabId: 'reports', color: '#7c3aed', bgColor: '#f5f3ff' },
            { id: 'inbox', label: t('report_inbox') || 'Report Inbox', icon: '📬', tabId: 'inbox', color: '#ea580c', bgColor: '#fff7ed' },
          ]
        },
        {
          id: 'kebele_stats_section',
          label: t('statistics_tab') || 'Statistics',
          tasks: [
            { id: 'statistics', label: t('statistics_tab') || 'Statistics', icon: '📈', tabId: 'statistics', color: '#0284c7', bgColor: '#f0f9ff' },
            { id: 'records', label: t('records_tab') || 'Records', icon: '📂', tabId: 'records', color: '#0d9488', bgColor: '#f0fdfa' },
          ]
        },
      ];
    } else {
      // Citizen sections
      sections = [
        {
          id: 'citizen_dashboard',
          label: 'Dashboard',
          tasks: [
            { id: 'dashboard', label: t('dashboard_overview') || 'Dashboard Overview', icon: '📊', tabId: 'dashboard', color: '#4f46e5', bgColor: '#eef2ff' },
          ]
        },
        {
          id: 'citizen_events',
          label: 'EVENTS',
          tasks: [
            { id: 'register', label: 'Register Event', icon: '➕', tabId: 'register', color: '#d97706', bgColor: '#fffbeb' },
            { id: 'my-events', label: 'My Events (0)', icon: '📋', tabId: 'my-events', color: '#059669', bgColor: '#ecfdf5' },
          ]
        },
        {
          id: 'citizen_certificates',
          label: 'CERTIFICATE',
          tasks: [
            { id: 'birth_cert', label: 'Birth Certificate', icon: '🪪', tabId: 'certificates', color: '#7c3aed', bgColor: '#f5f3ff' },
            { id: 'other_cert', label: 'Other Certificates', icon: '📜', tabId: 'other-certificates', color: '#0284c7', bgColor: '#f0f9ff' },
          ]
        },
        {
          id: 'citizen_credentials',
          label: 'CREDENTIALS',
          tasks: [
            { id: 'reg_credentials', label: 'Registered Credentials (0)', icon: '🔐', tabId: 'registered-credentials', color: '#e11d48', bgColor: '#fff1f2' },
          ]
        },
        {
          id: 'citizen_profile',
          label: 'My Profile',
          tasks: [
            { id: 'profile', label: 'My Profile Settings', icon: '👤', tabId: 'profile', color: '#4f46e5', bgColor: '#eef2ff' },
          ]
        }
      ];
    }

    const standardTasks = [
      { id: 'profile', label: t('profile_settings') || 'Profile Settings', icon: '👤', tabId: 'profile', color: '#6366f1', bgColor: '#eef2ff' },
      { id: 'settings', label: t('system_preferences') || 'System Preferences', icon: '🛡️', tabId: 'dashboard', color: '#10b981', bgColor: '#ecfdf5' },
    ];

    return { sections, standardTasks };
  };

  const { sections, standardTasks } = getTasksByRole(role);

  const handleTaskClick = (task) => {
    setIsOpen(false);
    
    if (task.id === 'logout') {
      logout();
      return;
    }

    const r = (currentUser?.role || 'citizen').toLowerCase();
    let basePath = '/citizen';
    if (r.includes('kebele')) basePath = '/kebele';
    else if (r.includes('woreda')) basePath = '/woreda';
    else if (r.includes('zone')) basePath = '/zone';
    else if (r.includes('region')) basePath = '/region';
    else if (r.includes('national')) basePath = '/national';

    // Update hash immediately if we're on the right page
    if (window.location.pathname === basePath) {
      window.location.hash = task.tabId;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      // Navigate to the correct page with the hash
      navigate(`${basePath}#${task.tabId}`);
      // Also fire hashchange event just in case the router doesn't trigger it on mount for existing components
      setTimeout(() => window.dispatchEvent(new HashChangeEvent('hashchange')), 0);
    }
  };


  return (
    <div className="user-profile-dropdown" ref={dropdownRef}>
      <div className="profile-trigger" onClick={toggleDropdown}>
        <div className="avatar initials" style={{ background: roleInfo.gradient }}>
          {currentUser?.personalInfo?.photo?.url || currentUser?.profilePhoto?.url ? (
            <img 
              src={`http://localhost:5000${currentUser?.personalInfo?.photo?.url || currentUser?.profilePhoto?.url}`} 
              alt={name} 
              className="trigger-photo"
            />
          ) : initials}
        </div>
        <div className="trigger-info">
          <span className="user-name">{name}</span>
          <span className="user-role">{roleInfo.name}</span>
        </div>
        <span className={`chevron-icon ${isOpen ? 'open' : ''}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </div>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-header">
            <div className="avatar initials large" style={{ background: roleInfo.gradient }}>
              {currentUser?.personalInfo?.photo?.url || currentUser?.profilePhoto?.url ? (
                <img 
                  src={`http://localhost:5000${currentUser?.personalInfo?.photo?.url || currentUser?.profilePhoto?.url}`} 
                  alt={name} 
                  className="header-photo"
                />
              ) : initials}
            </div>
            <div className="header-user-info">
              <h4>{name}</h4>
              <p>{email}</p>
              <span className="status-online">
                <span className="status-dot"></span> Online
              </span>
            </div>
          </div>
          
          <div className="dropdown-divider"></div>

          {sections.map((section, idx) => (
            <React.Fragment key={idx}>
              <div className="dropdown-section">
                <div 
                  className={`section-header-clickable ${openSections[section.id] ? 'active' : ''}`}
                  onClick={() => toggleSection(section.id || idx)}
                >
                  <span className="section-label">{section.label}</span>
                  <span className="accordion-chevron">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </div>
                
                <div className={`collapsible-tasks ${openSections[section.id] ? 'expanded' : 'collapsed'}`}>
                  <div className="dropdown-tasks">
                    {section.tasks.map((task) => (
                      <div key={task.id} className="task-item" onClick={() => handleTaskClick(task)}>
                        <div className="task-icon-wrapper" style={{ backgroundColor: task.bgColor, color: task.color }}>
                          <span className="task-icon">{task.icon}</span>
                        </div>
                        <span className="task-label">{task.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="dropdown-divider"></div>
            </React.Fragment>
          ))}

          <div className="dropdown-section">
            <div 
              className={`section-header-clickable ${openSections.user_options ? 'active' : ''}`}
              onClick={() => toggleSection('user_options')}
            >
              <span className="section-label">{t('user_options') || 'User Options'}</span>
              <span className="accordion-chevron">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </span>
            </div>
            
            <div className={`collapsible-tasks ${openSections.user_options ? 'expanded' : 'collapsed'}`}>
              <div className="dropdown-tasks">
                {standardTasks.map((task) => (
                  <div key={task.id} className="task-item" onClick={() => handleTaskClick(task)}>
                    <div className="task-icon-wrapper" style={{ backgroundColor: task.bgColor, color: task.color }}>
                      <span className="task-icon">{task.icon}</span>
                    </div>
                    <span className="task-label">{task.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="dropdown-divider"></div>

          <div className="dropdown-footer">
            <div className="task-item logout-item" onClick={logout}>
              <div className="task-icon-wrapper logout-icon">
                <span className="task-icon">🚪</span>
              </div>
              <span className="task-label">{t('logout') || 'Logout'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileDropdown;
