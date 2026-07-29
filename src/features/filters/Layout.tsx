import { JSX, useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FileCode, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  SieveScript,
  activateScript,
  destroyScript,
  fetchScriptContent,
  fetchScripts,
  saveScript,
  validateScript,
} from '../../lib/jmapSieve';
import {
  getLoginPayload,
  selectSieveAccountId,
  selectUploadUrl,
} from '../login/loginSlice';
import { DEFAULT_SIEVE } from './utils';

function Layout(): JSX.Element {
  const { apiUrl, authorizationHeader, downloadUrl } =
    useSelector(getLoginPayload);
  const accountId = useSelector(selectSieveAccountId);
  const uploadUrl = useSelector(selectUploadUrl);
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [content, setContent] = useState(DEFAULT_SIEVE);
  const [makeActive, setMakeActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(
    null,
  );

  const scriptsQuery = useQuery({
    queryKey: ['sieve-scripts', accountId],
    queryFn: async () => {
      const r = await fetchScripts(apiUrl, accountId, authorizationHeader);
      if (!r.success) throw new Error(r.message);
      return r.data;
    },
    enabled: !!accountId,
  });

  const scripts = scriptsQuery.data ?? [];
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['sieve-scripts', accountId] });

  const selectScript = async (script: SieveScript) => {
    setSelectedId(script.id);
    setName(script.name);
    setMakeActive(script.isActive);
    setStatus(null);
    setContent('Loading…');
    if (script.blobId) {
      const r = await fetchScriptContent(
        downloadUrl,
        accountId,
        script.blobId,
        authorizationHeader,
      );
      setContent(r.success ? r.data : '# could not load script content');
    } else {
      setContent('');
    }
  };

  const startNew = () => {
    setSelectedId(null);
    setName('');
    setContent(DEFAULT_SIEVE);
    setMakeActive(true);
    setStatus(null);
  };

  const onValidate = async () => {
    setBusy(true);
    setStatus(null);
    const r = await validateScript(
      apiUrl,
      accountId,
      uploadUrl,
      content,
      authorizationHeader,
    );
    setBusy(false);
    if (!r.success) setStatus({ text: r.message, ok: false });
    else if (r.data) setStatus({ text: r.data, ok: false });
    else setStatus({ text: 'Script is valid.', ok: true });
  };

  const onSave = async () => {
    if (name.trim() === '') {
      setStatus({ text: 'Give the filter a name.', ok: false });
      return;
    }
    setBusy(true);
    setStatus(null);
    const r = await saveScript(
      apiUrl,
      accountId,
      uploadUrl,
      name.trim(),
      content,
      authorizationHeader,
      selectedId ?? undefined,
      makeActive,
    );
    setBusy(false);
    if (r.success) {
      setStatus({ text: 'Saved.', ok: true });
      refresh();
    } else {
      setStatus({ text: r.message, ok: false });
    }
  };

  const onDelete = async () => {
    if (!selectedId) return;
    setBusy(true);
    await destroyScript(apiUrl, accountId, selectedId, authorizationHeader);
    setBusy(false);
    startNew();
    refresh();
  };

  const onToggleActive = async (script: SieveScript) => {
    await activateScript(
      apiUrl,
      accountId,
      script.isActive ? null : script.id,
      authorizationHeader,
    );
    refresh();
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      <aside className="bg-sidebar flex w-56 shrink-0 flex-col overflow-y-auto border-r">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Filters</span>
          <Button variant="ghost" size="icon" onClick={startNew}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {scriptsQuery.isLoading ? (
          <p className="text-muted-foreground p-3 text-sm">Loading…</p>
        ) : scripts.length === 0 ? (
          <p className="text-muted-foreground p-3 text-sm">
            No filters yet. Create one.
          </p>
        ) : (
          <ul className="flex flex-col p-1">
            {scripts.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => selectScript(s)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted',
                    selectedId === s.id && 'bg-muted',
                  )}
                >
                  <FileCode className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  {s.isActive && (
                    <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b px-4 py-2">
          <h1 className="text-lg font-semibold">
            {selectedId ? 'Edit filter' : 'New filter'}
          </h1>
          {scripts.find((s) => s.id === selectedId) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onToggleActive(scripts.find((s) => s.id === selectedId)!)
              }
            >
              {scripts.find((s) => s.id === selectedId)?.isActive
                ? 'Deactivate'
                : 'Activate'}
            </Button>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
          {status && (
            <Alert variant={status.ok ? 'default' : 'destructive'}>
              <AlertDescription>{status.text}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="filter-name">Name</Label>
            <Input
              id="filter-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-filter"
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="filter-body">Sieve script</Label>
            <Textarea
              id="filter-body"
              className="min-h-64 flex-1 font-mono text-sm"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={makeActive}
              onCheckedChange={(v) => setMakeActive(v === true)}
            />
            <span>Set as the active filter after saving</span>
          </label>
        </div>

        <div className="flex items-center justify-between gap-2 border-t px-4 py-2">
          <div>
            {selectedId && (
              <Button variant="destructive" onClick={onDelete} disabled={busy}>
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onValidate} disabled={busy}>
              Validate
            </Button>
            <Button onClick={onSave} disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Layout;
