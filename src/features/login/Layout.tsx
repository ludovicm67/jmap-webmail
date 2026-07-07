import { JSX, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Mail as MailIcon } from 'lucide-react';
import ConditionalDisplay from '../../components/ConditionalDisplay';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  discoverJmapEndpoint,
  fetchMailboxes,
  fetchMails,
  fetchSession,
  getBasicToken,
  getMailAccountId,
} from '../../lib/jmap';
import { setList, setMailboxes } from '../mail/mailSlice';
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
    setError('');

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
      const authorizationHeader = `Basic ${getBasicToken(
        identifier,
        password,
      )}`;

      const sessionRequest = await fetchSession(endpoint, {
        Authorization: authorizationHeader,
      });
      if (!sessionRequest.success) {
        setError(sessionRequest.message);
        setLoading(false);
        return;
      }

      const session = sessionRequest.data;
      const accountId = getMailAccountId(session);
      if (!accountId) {
        setError('No mail account is available for these credentials.');
        setLoading(false);
        return;
      }

      const apiUrl = session.apiUrl;
      const downloadUrl = session.downloadUrl || '';

      const mailboxesRequest = await fetchMailboxes(apiUrl, accountId, {
        Authorization: authorizationHeader,
      });
      if (!mailboxesRequest.success) {
        setError(mailboxesRequest.message);
        setLoading(false);
        return;
      }

      const mailsRequest = await fetchMails(apiUrl, accountId, {
        Authorization: authorizationHeader,
      });
      if (!mailsRequest.success) {
        setError(mailsRequest.message);
        setLoading(false);
        return;
      }

      dispatch(
        login({
          identifier,
          authorizationHeader,
          apiUrl,
          downloadUrl,
          accountId,
          endpoint,
        }),
      );
      dispatch(setMailboxes(mailboxesRequest.data));
      dispatch(setList(mailsRequest.data));

      return;
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-auto p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="bg-primary text-primary-foreground mx-auto flex h-11 w-11 items-center justify-center rounded-full">
            <MailIcon className="h-5 w-5" />
          </div>
          <CardTitle className="mt-2">Sign in to JMAP Webmail</CardTitle>
          <CardDescription>
            Enter your email address to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="login-form-identifier">Identifier</Label>
            <Input
              autoFocus
              id="login-form-identifier"
              type="email"
              placeholder="john.doe@example.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          <ConditionalDisplay
            cond={more || step === LoginStep.Endpoint || hasCustomEndpoint}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="login-form-endpoint">Endpoint</Label>
              <Input
                id="login-form-endpoint"
                type="url"
                placeholder="https://example.com"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
              />
              <button
                type="button"
                className="text-primary self-start text-sm hover:underline"
                onClick={discoverEndpoint}
              >
                Discover endpoint
              </button>
            </div>
          </ConditionalDisplay>

          <ConditionalDisplay cond={more}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="login-form-method">Authentication method</Label>
              <Select value={method} disabled>
                <SelectTrigger id="login-form-method" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={method}>Password</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </ConditionalDisplay>

          <ConditionalDisplay cond={more || step >= LoginStep.Credentials}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="login-form-password">Password</Label>
              <Input
                id="login-form-password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </ConditionalDisplay>

          <Button
            className="w-full"
            onClick={() => actionButton()}
            disabled={loading || (identifier === '' && !more)}
          >
            {((more || step === LoginStep.Credentials) && 'Sign In') ||
              'Next »'}
          </Button>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={more}
              onCheckedChange={(checked) => setMore(checked === true)}
            />
            <span>More options</span>
          </label>
        </CardContent>
      </Card>
    </div>
  );
}

export default Layout;
