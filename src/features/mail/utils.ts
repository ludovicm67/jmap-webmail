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

export const getMailboxIcon = (mailbox: Mailbox): string => {
  switch (mailbox.role) {
    case 'inbox':
      return 'fas fa-inbox';
    case 'drafts':
      return 'fas fa-pencil-alt';
    case 'sent':
      return 'fas fa-paper-plane';
    case 'junk':
      return 'far fa-times-circle';
    case 'trash':
      return 'fas fa-trash-alt';
    case 'archive':
      return 'fas fa-archive';
  }

  if (mailbox.name === 'Notes') {
    return 'far fa-sticky-note';
  }

  return 'far fa-folder';
};

export const isUnreadMail = (mail: Mail): boolean => {
  if (mail?.keywords?.$seen === false) {
    return true;
  }

  return false;
};

const formatName = (from: MailFrom): string => {
  if (from?.name) {
    return from.name;
  } else if (from?.email) {
    return from.email;
  }

  return '(unknown)';
};

export const getFromMail = (mail: Mail): string => {
  if (!mail.from || mail.from.length < 1) {
    return '(unknown)';
  }

  return mail.from.map((f) => formatName(f)).join(', ');
};
