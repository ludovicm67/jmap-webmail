import { Switch } from 'react-router';
import { Redirect, Route } from 'react-router-dom';
import '@fortawesome/fontawesome-free/js/all';
import MailLayout from './features/mail/Layout';
import LoginLayout from './features/login/Layout';
import { FEATURE_URL as MailUrl } from './features/mail/utils';
import { FEATURE_URL as LoginUrl } from './features/login/utils';
import './App.css';
import { useSelector } from 'react-redux';
import { isAuthenticated } from './features/login/loginSlice';

function App(): JSX.Element {
  const authenticated = useSelector(isAuthenticated);

  return (
    <div className="app">
      <nav className="navbar is-primary">
        <div className="navbar-brand">
          <div className="navbar-item">JMAP Webmail</div>
        </div>
      </nav>
      <div className="app-container">
        <Switch>
          <Route path={`${MailUrl}:mailboxId/:mailId`}>
            {authenticated ? <MailLayout /> : <Redirect to={LoginUrl} />}
          </Route>
          <Route path={`${MailUrl}:mailboxId`}>
            {authenticated ? <MailLayout /> : <Redirect to={LoginUrl} />}
          </Route>
          <Route path={MailUrl}>
            {authenticated ? <MailLayout /> : <Redirect to={LoginUrl} />}
          </Route>
          <Route path={LoginUrl}>
            {!authenticated ? <LoginLayout /> : <Redirect to={MailUrl} />}
          </Route>
          <Route path="/" exact={false}>
            {authenticated ? (
              <Redirect to={MailUrl} />
            ) : (
              <Redirect to={LoginUrl} />
            )}
          </Route>
        </Switch>
      </div>
    </div>
  );
}

export default App;
