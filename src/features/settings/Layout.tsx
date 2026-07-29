import { JSX, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, HardDrive, Plane } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  fetchQuotas,
  fetchVacation,
  saveVacation,
} from '../../lib/jmapSettings';
import {
  disablePush,
  enablePush,
  isPushEnabled,
  pushSupported,
} from '../../lib/push';
import {
  getLoginPayload,
  selectQuotaAccountId,
  selectVacationAccountId,
  selectVapidKey,
} from '../login/loginSlice';

const formatBytes = (bytes?: number): string => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
};

const dateOnly = (iso?: string | null): string => (iso ? iso.slice(0, 10) : '');

function VacationCard(): JSX.Element {
  const { apiUrl, authorizationHeader } = useSelector(getLoginPayload);
  const accountId = useSelector(selectVacationAccountId);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['vacation', accountId],
    queryFn: async () => {
      const r = await fetchVacation(apiUrl, accountId, authorizationHeader);
      if (!r.success) throw new Error(r.message);
      return r.data;
    },
    enabled: !!accountId,
  });

  const [isEnabled, setIsEnabled] = useState(false);
  const [subject, setSubject] = useState('');
  const [textBody, setTextBody] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(
    null,
  );

  useEffect(() => {
    if (!query.data) return;
    setIsEnabled(query.data.isEnabled);
    setSubject(query.data.subject || '');
    setTextBody(query.data.textBody || '');
    setFromDate(dateOnly(query.data.fromDate));
    setToDate(dateOnly(query.data.toDate));
  }, [query.data]);

  const onSave = async () => {
    setSaving(true);
    setStatus(null);
    const r = await saveVacation(
      apiUrl,
      accountId,
      {
        isEnabled,
        subject,
        textBody,
        fromDate: fromDate ? `${fromDate}T00:00:00Z` : null,
        toDate: toDate ? `${toDate}T23:59:59Z` : null,
      },
      authorizationHeader,
    );
    setSaving(false);
    if (r.success) {
      setStatus({ text: 'Saved.', ok: true });
      queryClient.invalidateQueries({ queryKey: ['vacation', accountId] });
    } else {
      setStatus({ text: r.message, ok: false });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plane className="h-5 w-5" />
          Vacation responder
        </CardTitle>
        <CardDescription>
          Automatically reply to incoming mail while you are away.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={isEnabled}
            onCheckedChange={(v) => setIsEnabled(v === true)}
          />
          <span>Enable auto-reply</span>
        </label>
        <div className="flex flex-col gap-2">
          <Label htmlFor="vac-subject">Subject</Label>
          <Input
            id="vac-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Out of office"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="vac-body">Message</Label>
          <Textarea
            id="vac-body"
            value={textBody}
            onChange={(e) => setTextBody(e.target.value)}
            placeholder="I'm away until…"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="vac-from">From (optional)</Label>
            <Input
              id="vac-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="vac-to">Until (optional)</Label>
            <Input
              id="vac-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>
        {status && (
          <p
            className={
              status.ok
                ? 'text-muted-foreground text-sm'
                : 'text-destructive text-sm'
            }
          >
            {status.text}
          </p>
        )}
        <div>
          <Button onClick={onSave} disabled={saving || query.isLoading}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function QuotaCard(): JSX.Element {
  const { apiUrl, authorizationHeader } = useSelector(getLoginPayload);
  const accountId = useSelector(selectQuotaAccountId);

  const query = useQuery({
    queryKey: ['quotas', accountId],
    queryFn: async () => {
      const r = await fetchQuotas(apiUrl, accountId, authorizationHeader);
      if (!r.success) throw new Error(r.message);
      return r.data;
    },
    enabled: !!accountId,
  });

  const octets = (query.data ?? []).find(
    (q) => q.resourceType === 'octets' || q.resourceType === undefined,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Storage
        </CardTitle>
        <CardDescription>How much of your quota is in use.</CardDescription>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : !octets || !octets.hardLimit ? (
          <p className="text-muted-foreground text-sm">
            The server does not report a storage quota for this account.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(((octets.used || 0) / octets.hardLimit) * 100),
                  )}%`,
                }}
              />
            </div>
            <p className="text-muted-foreground text-sm">
              {formatBytes(octets.used)} of {formatBytes(octets.hardLimit)} used
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NotificationsCard(): JSX.Element {
  const { apiUrl, authorizationHeader } = useSelector(getLoginPayload);
  const vapidKey = useSelector(selectVapidKey);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    isPushEnabled().then(setEnabled);
  }, []);

  const toggle = async () => {
    setBusy(true);
    setError('');
    if (enabled) {
      await disablePush(apiUrl, authorizationHeader);
      setEnabled(false);
    } else {
      const r = await enablePush(apiUrl, vapidKey, authorizationHeader);
      if (r.success) setEnabled(true);
      else setError(r.message);
    }
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
        </CardTitle>
        <CardDescription>
          Get a browser notification when new mail arrives, even when this tab
          is closed.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!pushSupported() ? (
          <p className="text-muted-foreground text-sm">
            This browser does not support push notifications.
          </p>
        ) : (
          <>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div>
              <Button
                variant={enabled ? 'outline' : 'default'}
                onClick={toggle}
                disabled={busy}
              >
                {busy
                  ? 'Working…'
                  : enabled
                    ? 'Disable notifications'
                    : 'Enable notifications'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Layout(): JSX.Element {
  const vacationAccountId = useSelector(selectVacationAccountId);
  const quotaAccountId = useSelector(selectQuotaAccountId);
  const vapidKey = useSelector(selectVapidKey);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="border-b px-4 py-2">
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 overflow-auto p-4">
        {vacationAccountId && <VacationCard />}
        {quotaAccountId && <QuotaCard />}
        {vapidKey && <NotificationsCard />}
      </div>
    </div>
  );
}

export default Layout;
