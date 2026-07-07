import { Mail, MailFrom, Mailbox } from '../types';
import { formatReceivedAt, getFromMail } from '../utils';

export type ComposeInitial = {
  to?: string;
  subject?: string;
  body?: string;
  inReplyTo?: string[];
  references?: string[];
};

export type Recipient = { email: string; name?: string };

export const formatRecipient = (person: MailFrom): string => {
  if (person?.name && person?.email) {
    return `${person.name} <${person.email}>`;
  }
  return person?.email || person?.name || '';
};

// Parse a comma-separated "Name <email>, other@example.com" input string.
export const parseRecipients = (input: string): Recipient[] => {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token) => {
      const match = token.match(/^(.*)<(.+)>$/);
      if (match) {
        const name = match[1].trim().replace(/^"|"$/g, '');
        return name
          ? { email: match[2].trim(), name }
          : { email: match[2].trim() };
      }
      return { email: token };
    });
};

export const findMailboxByRole = (
  mailboxes: Mailbox[],
  role: string,
): Mailbox | undefined => mailboxes.find((mailbox) => mailbox.role === role);

const RE_PREFIX = /^re:/i;

// Build the prefilled fields for a reply: recipient, "Re:" subject, quoted body
// and the In-Reply-To / References headers needed for threading.
export const buildReply = (mail: Mail, quoteText?: string): ComposeInitial => {
  const target = mail.replyTo?.[0] || mail.from?.[0];
  const to = target ? formatRecipient(target) : '';

  const baseSubject = mail.subject || '';
  const subject = RE_PREFIX.test(baseSubject.trim())
    ? baseSubject
    : `Re: ${baseSubject}`;

  let body = '';
  if (quoteText) {
    const attribution = `On ${formatReceivedAt(mail.receivedAt)}, ${getFromMail(
      mail,
    )} wrote:`;
    const quoted = quoteText
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
    body = `\n\n${attribution}\n${quoted}\n`;
  }

  const originalMessageId = mail.messageId?.[0];
  const inReplyTo = originalMessageId ? [originalMessageId] : undefined;
  const references = originalMessageId
    ? [...(mail.references || []), originalMessageId]
    : mail.references || undefined;

  return { to, subject, body, inReplyTo, references };
};
