import { ReactNode, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { Paperclip, Send, Users, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { OutgoingAttachment, uploadBlob } from '../../../lib/jmap';
import {
  contactEmails,
  contactName,
  fetchContacts,
} from '../../../lib/jmapContacts';
import {
  getLoginPayload,
  selectContactsAccountId,
} from '../../login/loginSlice';
import { useComposer } from './useComposer';
import { ComposeInitial } from './utils';

type ComposeDialogProps = {
  trigger: ReactNode;
  title?: string;
  initial?: ComposeInitial;
};

const formatBytes = (bytes?: number): string => {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
};

// Append a recipient to the comma-separated "To" field without duplicating it.
const appendRecipient = (current: string, entry: string): string => {
  const parts = current
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.some((p) => p.toLowerCase() === entry.toLowerCase())) {
    return current;
  }
  return [...parts, entry].join(', ');
};

function ComposeDialog({
  trigger,
  title = 'New message',
  initial,
}: ComposeDialogProps) {
  const [open, setOpen] = useState(false);
  const { identities, activeIdentityId, send } = useComposer();
  const { apiUrl, uploadUrl, activeAccountId, authorizationHeader } =
    useSelector(getLoginPayload);
  const contactsAccountId = useSelector(selectContactsAccountId);

  const [identityId, setIdentityId] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<OutgoingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [contactQuery, setContactQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seed the form from `initial` and the active identity each time it opens.
  useEffect(() => {
    if (open) {
      setTo(initial?.to || '');
      setSubject(initial?.subject || '');
      setBody(initial?.body || '');
      setIdentityId(activeIdentityId || identities[0]?.id || '');
      setAttachments([]);
      setShowContacts(false);
      setContactQuery('');
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const contactsQuery = useQuery({
    queryKey: ['contacts', contactsAccountId],
    queryFn: async () => {
      const r = await fetchContacts(
        apiUrl,
        contactsAccountId,
        authorizationHeader,
      );
      if (!r.success) throw new Error(r.message);
      return r.data;
    },
    enabled: open && showContacts && !!contactsAccountId,
  });

  const contactMatches = (contactsQuery.data ?? [])
    .map((c) => ({ name: contactName(c), email: contactEmails(c)[0] }))
    .filter((c) => c.email)
    .filter((c) => {
      const q = contactQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      );
    })
    .slice(0, 50);

  const onFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    for (const file of Array.from(files)) {
      const r = await uploadBlob(
        uploadUrl,
        activeAccountId,
        file,
        file.type || 'application/octet-stream',
        { Authorization: authorizationHeader },
      );
      if (r.success) {
        setAttachments((prev) => [
          ...prev,
          {
            blobId: r.data.blobId,
            type: r.data.type,
            name: file.name,
            size: r.data.size || file.size,
          },
        ]);
      } else {
        setError(r.message);
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSend = async () => {
    if (sending) {
      return;
    }
    setSending(true);
    setError('');
    const result = await send({
      to,
      subject,
      textBody: body,
      identityId,
      inReplyTo: initial?.inReplyTo,
      references: initial?.references,
      attachments,
    });
    setSending(false);
    if (!result.success) {
      setError(result.message || 'The message could not be sent.');
      return;
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="compose-from">From</Label>
            {identities.length > 0 ? (
              <Select value={identityId} onValueChange={setIdentityId}>
                <SelectTrigger id="compose-from" className="w-full">
                  <SelectValue placeholder="Select an identity" />
                </SelectTrigger>
                <SelectContent>
                  {identities.map((identity) => (
                    <SelectItem key={identity.id} value={identity.id}>
                      {identity.name
                        ? `${identity.name} <${identity.email}>`
                        : identity.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-muted-foreground text-sm">
                Loading identities…
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="compose-to">To</Label>
              {contactsAccountId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => setShowContacts((v) => !v)}
                >
                  <Users className="h-3.5 w-3.5" />
                  Contacts
                </Button>
              )}
            </div>
            <Input
              id="compose-to"
              type="text"
              placeholder="jane@example.com, John Doe <john@example.com>"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            {showContacts && contactsAccountId && (
              <div className="rounded-md border">
                <Input
                  autoFocus
                  className="border-0 border-b focus-visible:ring-0"
                  placeholder="Search contacts…"
                  value={contactQuery}
                  onChange={(e) => setContactQuery(e.target.value)}
                />
                <div className="max-h-40 overflow-auto p-1">
                  {contactsQuery.isLoading ? (
                    <p className="text-muted-foreground p-2 text-sm">
                      Loading…
                    </p>
                  ) : contactMatches.length === 0 ? (
                    <p className="text-muted-foreground p-2 text-sm">
                      No contacts found.
                    </p>
                  ) : (
                    contactMatches.map((c) => (
                      <button
                        key={`${c.name}-${c.email}`}
                        type="button"
                        className="hover:bg-muted flex w-full flex-col items-start rounded px-2 py-1 text-left"
                        onClick={() =>
                          setTo((prev) =>
                            appendRecipient(
                              prev,
                              c.name ? `${c.name} <${c.email}>` : c.email!,
                            ),
                          )
                        }
                      >
                        <span className="text-sm">{c.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {c.email}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="compose-subject">Subject</Label>
            <Input
              id="compose-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="compose-body">Message</Label>
            <Textarea
              id="compose-body"
              className="min-h-48 font-mono"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((a, i) => (
                <Badge
                  key={`${a.blobId}-${i}`}
                  variant="secondary"
                  className="gap-1.5 py-1"
                >
                  <Paperclip className="h-3 w-3" />
                  <span className="max-w-40 truncate">{a.name}</span>
                  {a.size ? (
                    <span className="text-muted-foreground">
                      {formatBytes(a.size)}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    aria-label={`Remove ${a.name}`}
                    onClick={() =>
                      setAttachments((prev) =>
                        prev.filter((_, idx) => idx !== i),
                      )
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          {uploadUrl ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => onFilesSelected(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
                {uploading ? 'Uploading…' : 'Attach'}
              </Button>
            </>
          ) : (
            <span />
          )}
          <Button
            onClick={onSend}
            disabled={
              sending ||
              uploading ||
              to.trim() === '' ||
              identities.length === 0
            }
          >
            <Send className="h-4 w-4" />
            {sending ? 'Sending…' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ComposeDialog;
