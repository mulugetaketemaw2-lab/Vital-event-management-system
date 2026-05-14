import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../Common/LanguageSelector';
import './Home.css';

const Home = () => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();

  // Redirect to respective dashboard if already logged in
  if (currentUser) {
    const userRole = currentUser.role;
    let targetRoute = '/';
    
    if (userRole === 'national' || userRole === 'national_representative') targetRoute = '/national';
    else if (userRole === 'region' || userRole === 'region_representative') targetRoute = '/region';
    else if (userRole === 'zone' || userRole === 'zone_representative') targetRoute = '/zone';
    else if (userRole === 'woreda' || userRole === 'woreda_representative') targetRoute = '/woreda';
    else if (userRole === 'kebele' || userRole === 'kebele_representative') targetRoute = '/kebele';
    else if (userRole === 'citizen') targetRoute = '/citizen';
    else targetRoute = `/${userRole}`;
    
    return <Navigate to={targetRoute} replace />;
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="slideshow-container">
          <div className="slide" style={{ backgroundColor: '#2c3e50', backgroundImage: "linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('/backgrounds/slide1.png')" }}></div>
          <div className="slide" style={{ backgroundColor: '#34495e', backgroundImage: "linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('/backgrounds/slide2.png')" }}></div>
          <div className="slide" style={{ backgroundColor: '#1a1a1a', backgroundImage: "linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('/backgrounds/slide3.png')" }}></div>
        </div>
        <div className="container">
          <div className="language-container">
            <LanguageSelector />
          </div>
          <h1>{t('ethiopia_vital_events')}</h1>
          <p>{t('ethiopia_vital_events_desc')}</p>

          <div className="auth-buttons">
            <Link to="/login" className="btn btn-primary">{t('login')}</Link>
            <Link to="/register-citizen" className="btn btn-secondary">{t('register_citizen')}</Link>
          </div>
        </div>
      </header>

      <section className="features-section">
        <div className="container">
          <h2>{t('system_features')}</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>👤 {t('for_citizens')}</h3>
              <ul>
                <li>{t('feature_citizens_1')}</li>
                <li>{t('feature_citizens_2')}</li>
                <li>{t('feature_citizens_3')}</li>
                <li>{t('feature_citizens_4')}</li>
              </ul>
            </div>

            <div className="feature-card">
              <h3>🏠 {t('for_kebele')}</h3>
              <ul>
                <li>{t('feature_kebele_1')}</li>
                <li>{t('feature_kebele_2')}</li>
                <li>{t('feature_kebele_3')}</li>
                <li>{t('feature_kebele_4')}</li>
              </ul>
            </div>

            <div className="feature-card">
              <h3>🏢 {t('for_woreda')}</h3>
              <ul>
                <li>{t('feature_woreda_1')}</li>
                <li>{t('feature_woreda_2')}</li>
                <li>{t('feature_woreda_3')}</li>
                <li>{t('feature_woreda_4')}</li>
              </ul>
            </div>

            <div className="feature-card">
              <h3>🌍 {t('for_zone')}</h3>
              <ul>
                <li>{t('feature_zone_1')}</li>
                <li>{t('feature_zone_2')}</li>
                <li>{t('feature_zone_3')}</li>
                <li>{t('feature_zone_4')}</li>
              </ul>
            </div>

            <div className="feature-card">
              <h3>🏛️ {t('for_region')}</h3>
              <ul>
                <li>{t('feature_region_1')}</li>
                <li>{t('feature_region_2')}</li>
                <li>{t('feature_region_3')}</li>
                <li>{t('feature_region_4')}</li>
              </ul>
            </div>

            <div className="feature-card">
              <h3>🏢 {t('for_national')}</h3>
              <ul>
                <li>{t('feature_national_1')}</li>
                <li>{t('feature_national_2')}</li>
                <li>{t('feature_national_3')}</li>
                <li>{t('feature_national_4')}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="system-info">
        <div className="container">
          <h2>{t('administrative_hierarchy')}</h2>
          <div className="hierarchy-flow">
            <div className="hierarchy-step">
              <span className="step-number">1</span>
              <h4>{t('citizen')}</h4>
              <p>{t('hierarchy_citizen_desc')}</p>
            </div>
            <div className="arrow">→</div>
            <div className="hierarchy-step">
              <span className="step-number">2</span>
              <h4>{t('kebele')}</h4>
              <p>{t('hierarchy_kebele_desc')}</p>
            </div>
            <div className="arrow">→</div>
            <div className="hierarchy-step">
              <span className="step-number">3</span>
              <h4>{t('woreda')}</h4>
              <p>{t('hierarchy_woreda_desc')}</p>
            </div>
            <div className="arrow">→</div>
            <div className="hierarchy-step">
              <span className="step-number">4</span>
              <h4>{t('zone')}</h4>
              <p>{t('hierarchy_zone_desc')}</p>
            </div>
            <div className="arrow">→</div>
            <div className="hierarchy-step">
              <span className="step-number">5</span>
              <h4>{t('region')}</h4>
              <p>{t('hierarchy_region_desc')}</p>
            </div>
            <div className="arrow">→</div>
            <div className="hierarchy-step">
              <span className="step-number">6</span>
              <h4>{t('national')}</h4>
              <p>{t('hierarchy_national_desc')}</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <div className="container">
          <p>&copy; 2026 {t('footer_text')}</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;