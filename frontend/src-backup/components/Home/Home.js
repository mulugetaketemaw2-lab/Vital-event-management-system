import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Home.css';

const Home = () => {
  const { currentUser } = useAuth();

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="container">
          <h1>Ethiopia Vital Events Registration System</h1>
          <p>Digital platform for registering and managing vital events across Ethiopia</p>
          
          {!currentUser ? (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-primary">Login</Link>
              <Link to="/register-citizen" className="btn btn-secondary">Register as Citizen</Link>
            </div>
          ) : (
            <div className="welcome-section">
              <h2>Welcome back, {currentUser.personalInfo?.firstName}!</h2>
              <Link to={`/${currentUser.role}`} className="btn btn-primary">
                Go to Dashboard
              </Link>
            </div>
          )}
        </div>
      </header>

      <section className="features-section">
        <div className="container">
          <h2>System Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>👤 For Citizens</h3>
              <ul>
                <li>Register birth, death, marriage events</li>
                <li>Track application status</li>
                <li>Download certificates</li>
                <li>View event history</li>
              </ul>
            </div>
            
            <div className="feature-card">
              <h3>🏠 For Kebele Representatives</h3>
              <ul>
                <li>Review citizen submissions</li>
                <li>Verify event information</li>
                <li>Forward to woreda level</li>
                <li>Generate local reports</li>
              </ul>
            </div>
            
            <div className="feature-card">
              <h3>🏢 For Woreda Representatives</h3>
              <ul>
                <li>Review kebele submissions</li>
                <li>Coordinate multiple kebeles</li>
                <li>Forward to zone level</li>
                <li>Generate district reports</li>
              </ul>
            </div>
            
            <div className="feature-card">
              <h3>🌍 For Zone Representatives</h3>
              <ul>
                <li>Review woreda submissions</li>
                <li>Monitor regional statistics</li>
                <li>Forward to regional level</li>
                <li>Generate zonal reports</li>
              </ul>
            </div>
            
            <div className="feature-card">
              <h3>🏛️ For Regional Representatives</h3>
              <ul>
                <li>Review zone submissions</li>
                <li>Regional data analysis</li>
                <li>Forward to national level</li>
                <li>Generate regional reports</li>
              </ul>
            </div>
            
            <div className="feature-card">
              <h3>🏢 For National Representatives</h3>
              <ul>
                <li>National level review</li>
                <li>Country-wide statistics</li>
                <li>Final approval</li>
                <li>National reporting</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="system-info">
        <div className="container">
          <h2>Administrative Hierarchy</h2>
          <div className="hierarchy-flow">
            <div className="hierarchy-step">
              <span className="step-number">1</span>
              <h4>Citizen</h4>
              <p>Submits vital event registration</p>
            </div>
            <div className="arrow">→</div>
            <div className="hierarchy-step">
              <span className="step-number">2</span>
              <h4>Kebele</h4>
              <p>Local verification</p>
            </div>
            <div className="arrow">→</div>
            <div className="hierarchy-step">
              <span className="step-number">3</span>
              <h4>Woreda</h4>
              <p>District approval</p>
            </div>
            <div className="arrow">→</div>
            <div className="hierarchy-step">
              <span className="step-number">4</span>
              <h4>Zone</h4>
              <p>Zonal coordination</p>
            </div>
            <div className="arrow">→</div>
            <div className="hierarchy-step">
              <span className="step-number">5</span>
              <h4>Region</h4>
              <p>Regional oversight</p>
            </div>
            <div className="arrow">→</div>
            <div className="hierarchy-step">
              <span className="step-number">6</span>
              <h4>National</h4>
              <p>Final approval & reporting</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <div className="container">
          <p>&copy; 2024 Ethiopia Vital Events System. Supporting digital transformation in public services.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;