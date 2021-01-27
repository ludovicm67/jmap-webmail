import React from 'react';
import Empty from './Empty';

type Mailbox = {
  name: string;
  role: string;
  id: string;
};

const mailboxes: Mailbox[] = [
  { name: 'INBOX', role: 'inbox', id: '00000000-0000-0000-0000-000000000001' },
  {
    name: 'Drafts',
    role: 'drafts',
    id: '00000000-0000-0000-0000-000000000002',
  },
  {
    name: 'Sent Messages',
    role: 'sent',
    id: '00000000-0000-0000-0000-000000000003',
  },
  { name: 'Junk', role: 'junk', id: '00000000-0000-0000-0000-000000000004' },
  {
    name: 'Deleted Messages',
    role: 'trash',
    id: '00000000-0000-0000-0000-000000000005',
  },
  {
    name: 'Archive',
    role: 'archive',
    id: '00000000-0000-0000-0000-000000000006',
  },
  { name: 'Notes', role: '', id: '00000000-0000-0000-0000-000000000007' },
];

function List(): JSX.Element {
  const selectedMailbox = mailboxes.length > 0 ? mailboxes[0].id : '';

  return mailboxes.length === 0 ? (
    <Empty />
  ) : (
    <div className="is-flex-grow-1">
      {mailboxes.map((mailbox) => {
        const className =
          mailbox.id === selectedMailbox ? 'app-item-selected' : 'app-item';
        return <div className={className}>{mailbox.name}</div>;
      })}
    </div>
  );
}

export default List;
