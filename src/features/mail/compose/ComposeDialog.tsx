import { ReactNode, useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { useComposer } from './useComposer';
import { ComposeInitial } from './utils';

type ComposeDialogProps = {
  trigger: ReactNode;
  title?: string;
  initial?: ComposeInitial;
};

function ComposeDialog({
  trigger,
  title = 'New message',
  initial,
}: ComposeDialogProps) {
  const [open, setOpen] = useState(false);
  const { identities, send } = useComposer();

  const [identityId, setIdentityId] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Seed the form from `initial` each time the dialog opens.
  useEffect(() => {
    if (open) {
      setTo(initial?.to || '');
      setSubject(initial?.subject || '');
      setBody(initial?.body || '');
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Default to the first identity once they load.
  useEffect(() => {
    if (identities.length > 0 && !identityId) {
      setIdentityId(identities[0].id);
    }
  }, [identities, identityId]);

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
            <Label htmlFor="compose-to">To</Label>
            <Input
              id="compose-to"
              type="text"
              placeholder="jane@example.com, John Doe <john@example.com>"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
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
        </div>

        <DialogFooter>
          <Button
            onClick={onSend}
            disabled={sending || to.trim() === '' || identities.length === 0}
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
