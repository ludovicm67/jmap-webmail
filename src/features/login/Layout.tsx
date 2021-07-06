import React, { useState } from 'react';
import { batch, useDispatch } from 'react-redux';
import ConditionalDisplay from '../../components/ConditionalDisplay';
import {
  discoverJmapEndpoint,
  fetchMailboxes,
  getBasicToken,
  tryCredentials,
} from '../../lib/jmap';
import { setMailboxes } from '../mail/mailSlice';
import { Mailbox } from '../mail/types';
import './Layout.css';
import { login } from './loginSlice';

enum LoginStep {
  Identifier = 0,
  Endpoint,
  Credentials,
}

function Layout(): JSX.Element {
  const dispatch = useDispatch();

  const [step, setStep] = useState<LoginStep>(LoginStep.Identifier);
  const [error, setError] = useState<string>('');
  const [more, setMore] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [endpoint, setEndpoint] = useState<string>('');
  const [hasCustomEndpoint, setHasCustomEndpoint] = useState<boolean>(false);
  const method = 'Basic';

  const discoverEndpoint = async () => {
    if (loading) return;
    setLoading(true);

    if (!identifier.includes('@')) {
      setError(
        'Your identifier is not an email. Please specify an endpoint manually.',
      );
      setStep(LoginStep.Endpoint);
      setLoading(false);
      return;
    }

    const domain = identifier.trim().split('@').pop();
    if (!domain) {
      setError(
        'Unable to discover a domain name in your email identifier. Please specify an endpoint manually.',
      );
      setStep(LoginStep.Endpoint);
      setLoading(false);
      return;
    }

    const discoveredEndpoint = await discoverJmapEndpoint(domain);

    setEndpoint(discoveredEndpoint);
    setStep(LoginStep.Credentials);

    setLoading(false);
  };

  const actionButton = async () => {
    if (loading) return;
    setLoading(true);

    if (step === LoginStep.Identifier) {
      setLoading(false);
      await discoverEndpoint();
      setLoading(true);
    }

    if (step === LoginStep.Endpoint) {
      if (endpoint === '') {
        setError('Endpoint is empty.');
        setLoading(false);
        return;
      }
      setHasCustomEndpoint(true);
      setStep(LoginStep.Credentials);
    }

    if (step === LoginStep.Credentials) {
      const authHeader = `Basic ${getBasicToken(identifier, password)}`;
      try {
        await tryCredentials(endpoint, {
          Authorization: authHeader,
        });
      } catch (e) {
        setError('Bad credentials. Please retry.');
        setLoading(false);
        return;
      }
      const mailboxes: Mailbox[] = (await fetchMailboxes(endpoint, identifier, {
        Authorization: authHeader,
      })) as unknown as Mailbox[];

      batch(() => {
        dispatch(login(authHeader));
        dispatch(setMailboxes(mailboxes));
      });

      return;
    }

    setLoading(false);
  };

  return (
    <div className="login-layout">
      <div>
        {error && (
          <article className="message is-danger">
            <div className="message-body">{error}</div>
          </article>
        )}

        <div className="field">
          <label className="label" htmlFor="login-form-identifier">
            Identifier
          </label>
          <div className="control">
            <input
              autoFocus
              id="login-form-identifier"
              className="input"
              type="email"
              placeholder="john.doe@example.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>
        </div>

        <ConditionalDisplay
          cond={more || step === LoginStep.Endpoint || hasCustomEndpoint}
        >
          <div className="field">
            <label className="label" htmlFor="login-form-endpoint">
              Endpoint
            </label>
            <div className="control">
              <input
                id="login-form-endpoint"
                className="input"
                type="url"
                placeholder="https://example.com"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
              />
            </div>
            <p className="help">
              <span
                className="has-text-primary has-pointer"
                onClick={discoverEndpoint}
              >
                Discover endpoint
              </span>
            </p>
          </div>
        </ConditionalDisplay>

        <ConditionalDisplay cond={more}>
          <div className="field">
            <label className="label" htmlFor="login-form-method">
              Authentication method
            </label>
            <div className="control">
              <div className="select is-fullwidth">
                <select id="login-form-method" disabled>
                  <option value={method}>Password</option>
                </select>
              </div>
            </div>
            <p className="help">
              <span className="has-text-primary has-pointer">
                Discover the available authentication methods
              </span>
            </p>
          </div>
        </ConditionalDisplay>

        <ConditionalDisplay cond={more || step >= LoginStep.Credentials}>
          <div className="field">
            <label className="label" htmlFor="login-form-password">
              Password
            </label>
            <div className="control">
              <input
                id="login-form-password"
                className="input"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
        </ConditionalDisplay>

        <div className="login-layout-bottom">
          <button
            className="button is-primary"
            onClick={() => actionButton()}
            disabled={identifier === '' && !more}
          >
            {((more || step === LoginStep.Credentials) && 'Sign In') ||
              'Next »'}
          </button>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={more}
              onChange={(e) => setMore(e.target.checked)}
            />
            <span>More options</span>
          </label>
        </div>
      </div>
    </div>
  );
}

export default Layout;
