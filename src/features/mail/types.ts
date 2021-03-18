import { randomString } from '../../lib/random';

export type Mailbox = {
  name: string;
  role: string;
  id: string;
  unreadEmails: number;
};

export type MailFrom = {
  name?: string | null;
  email?: string | null;
};

export type Mail = {
  from: MailFrom;
  hasAttachment: boolean;
  id: string;
  mailboxIds: Record<string, boolean>;
  preview: string;
  subject: string;
  keywords: Record<string, boolean>;
};

export const newMailbox = (
  name?: string,
  role?: string,
  id?: string,
  unreadEmails?: number,
): Mailbox => {
  return {
    name: name || '(unknown)',
    role: role || '',
    id: id || randomString(36),
    unreadEmails: unreadEmails || 0,
  };
};

export const newMail = (
  mailboxId: string,
  subject?: string,
  preview?: string,
  seen = true,
): Mail => {
  return {
    from: {
      name: '' || randomString(8),
      email: '' || `${randomString(4)}@${randomString(4)}.${randomString(2)}`,
    },
    hasAttachment: false,
    id: randomString(36),
    mailboxIds: {
      [mailboxId]: true,
    },
    preview: preview || 'Lorem ipsum…',
    subject: subject || '(no subject)',
    keywords: {
      $seen: seen,
    },
  };
};
