import React from 'react';
import { Navigate, Routes } from 'react-router';
import { Route } from 'react-router';
import '@fortawesome/fontawesome-free/js/all';
import MailLayout from './features/mail/Layout';
import LoginLayout from './features/login/Layout';
import { FEATURE_URL as MailUrl } from './features/mail/utils';
import { FEATURE_URL as LoginUrl } from './features/login/utils';
import './App.css';
import { useSelector } from 'react-redux';
import { isAuthenticated } from './features/login/loginSlice';

function App(): React.JSX.Element {
  const authenticated = useSelector(isAuthenticated);

  return (
    <div className="app">
      <nav className="navbar is-primary">
        <div className="navbar-brand">
          <div className="navbar-item">JMAP Webmail</div>
        </div>
      </nav>
      <div className="app-container">
        {authenticated ? (
          <Routes>
            {/* Mail subroutes */}
            <Route
              path={`${MailUrl}:mailboxId/:mailId`}
              element={<MailLayout />}
            />
            <Route path={`${MailUrl}:mailboxId`} element={<MailLayout />} />
            <Route path={MailUrl} element={<MailLayout />} />

            {/* Any attempt to hit login gets redirected back */}
            <Route
              path={LoginUrl}
              element={<Navigate to={MailUrl} replace />}
            />

            {/* Catch-all */}
            <Route path="/*" element={<Navigate to={MailUrl} replace />} />
          </Routes>
        ) : (
          <Routes>
            {/* Only login route allowed */}
            <Route path={LoginUrl} element={<LoginLayout />} />

            {/* Anything else goes to login */}
            <Route path="/*" element={<Navigate to={LoginUrl} replace />} />
          </Routes>
        )}
      </div>
    </div>
  );
}

export default App;
