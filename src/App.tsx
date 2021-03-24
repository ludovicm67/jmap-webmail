import React from 'react';
import { Switch } from 'react-router';
import { Route } from 'react-router-dom';
import '@fortawesome/fontawesome-free/js/all';
import MailLayout from './features/mail/Layout';
import LoginLayout from './features/login/Layout';
import { FEATURE_URL as MailUrl } from './features/mail/utils';
import { FEATURE_URL as LoginUrl } from './features/login/utils';
import './App.css';

function App(): JSX.Element {
  return (
    <div className="app">
      <nav className="navbar is-primary">
        <div className="navbar-brand">
          <div className="navbar-item">JMAP Webmail</div>
        </div>
      </nav>
      <div className="app-container">
        <Switch>
          <Route path={LoginUrl} component={LoginLayout} />
          <Route path={MailUrl} component={MailLayout} />
        </Switch>
      </div>
    </div>
  );
}

export default App;
