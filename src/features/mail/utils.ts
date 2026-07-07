import {
  Archive,
  Folder,
  Inbox,
  type LucideIcon,
  Pencil,
  Send,
  ShieldAlert,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { Mail, Mailbox, MailFrom } from './types';

export const FEATURE_URL = '/mail/';

export const getMailboxName = (mailbox: Mailbox): string => {
  switch (mailbox.role) {
    case 'inbox':
      return 'Inbox';
    case 'drafts':
      return 'Drafts';
    case 'sent':
      return 'Sent Messages';
    case 'junk':
      return 'Junk';
    case 'trash':
      return 'Deleted Messages';
    case 'archive':
      return 'Archive';
  }

  return mailbox.name;
};

export const getMailboxIcon = (mailbox: Mailbox): LucideIcon => {
  switch (mailbox.role) {
    case 'inbox':
      return Inbox;
    case 'drafts':
      return Pencil;
    case 'sent':
      return Send;
    case 'junk':
      return ShieldAlert;
    case 'trash':
      return Trash2;
    case 'archive':
      return Archive;
  }

  if (mailbox.name === 'Notes') {
    return StickyNote;
  }

  return Folder;
};

// Full literal class strings so Tailwind can detect them at build time.
export const getMailboxIconColor = (mailbox: Mailbox): string => {
  switch (mailbox.role) {
    case 'inbox':
      return 'text-blue-500';
    case 'drafts':
      return 'text-amber-500';
    case 'sent':
      return 'text-emerald-500';
    case 'junk':
      return 'text-orange-500';
    case 'trash':
      return 'text-rose-500';
    case 'archive':
      return 'text-violet-500';
  }

  if (mailbox.name === 'Notes') {
    return 'text-yellow-500';
  }

  return 'text-sky-500';
};

// In JMAP a read email has the `$seen` keyword set to true; unread emails omit
// it entirely (it is never set to false). So "unread" means `$seen` is not true,
// rather than explicitly false.
export const isUnreadMail = (mail: Mail): boolean => {
  return mail?.keywords?.$seen !== true;
};

const formatName = (from: MailFrom): string => {
  if (from?.name) {
    return from.name;
  } else if (from?.email) {
    return from.email;
  }

  return '(unknown)';
};

const formatList = (people?: MailFrom[]): string => {
  if (!people || people.length < 1) {
    return '(unknown)';
  }

  return people.map((p) => formatName(p)).join(', ');
};

export const getFromMail = (mail: Mail): string => {
  return formatList(mail.from);
};

export const getToMail = (mail: Mail): string => {
  return formatList(mail.to);
};

// Full "Name <email>" form for the reading pane, where both are useful.
const formatAddress = (person: MailFrom): string => {
  if (person?.name && person?.email) {
    return `${person.name} <${person.email}>`;
  }
  if (person?.name) {
    return person.name;
  }
  if (person?.email) {
    return person.email;
  }
  return '(unknown)';
};

const formatAddressList = (people?: MailFrom[]): string => {
  if (!people || people.length < 1) {
    return '(unknown)';
  }
  return people.map((p) => formatAddress(p)).join(', ');
};

export const getFromAddresses = (mail: Mail): string => {
  return formatAddressList(mail.from);
};

export const getToAddresses = (mail: Mail): string => {
  return formatAddressList(mail.to);
};

export const formatReceivedAt = (receivedAt?: string): string => {
  if (!receivedAt) {
    return '';
  }

  const date = new Date(receivedAt);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};
