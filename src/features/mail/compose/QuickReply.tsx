import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Mail } from '../types';
import { useComposer } from './useComposer';
import { buildReply } from './utils';

type QuickReplyProps = {
  mail: Mail;
  quoteText?: string;
};

// A compact reply box pinned to the bottom of the reading pane.
function QuickReply({ mail, quoteText }: QuickReplyProps) {
  const { identities, activeIdentityId, send } = useComposer();
  const [identityId, setIdentityId] = useState(activeIdentityId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setIdentityId(activeIdentityId);
  }, [activeIdentityId]);

  const onSend = async () => {
    if (sending || text.trim() === '') {
      return;
    }
    setSending(true);
    setError('');

    const reply = buildReply(mail, quoteText);
    const result = await send({
      to: reply.to || '',
      subject: reply.subject || '',
      textBody: `${text}${reply.body || ''}`,
      identityId,
      inReplyTo: reply.inReplyTo,
      references: reply.references,
    });

    setSending(false);
    if (!result.success) {
      setError(result.message || 'The reply could not be sent.');
      return;
    }
    setText('');
  };

  return (
    <div className="flex flex-col gap-2 border-t p-3">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Textarea
        placeholder="Quick reply…"
        className="min-h-16"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex items-center justify-between gap-2">
        {identities.length > 1 ? (
          <Select value={identityId} onValueChange={setIdentityId}>
            <SelectTrigger size="sm" className="max-w-[60%]">
              <SelectValue placeholder="From…" />
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
          <span />
        )}
        <Button
          size="sm"
          onClick={onSend}
          disabled={sending || text.trim() === ''}
        >
          <Send className="h-4 w-4" />
          {sending ? 'Sending…' : 'Reply'}
        </Button>
      </div>
    </div>
  );
}

export default QuickReply;
