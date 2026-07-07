import { useState } from 'react';
import { Send } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
  const { send } = useComposer();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

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
      <div className="flex justify-end">
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
