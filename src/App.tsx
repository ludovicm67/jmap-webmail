import React from 'react';
import MailLayout from './features/mail/Layout';
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
        <MailLayout />
      </div>
    </div>
  );
}

export default App;
