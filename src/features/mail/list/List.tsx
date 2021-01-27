import React from 'react';
import Empty from './Empty';

type MailList = {
  from: string;
  subject: string;
  content: string;
  unread: boolean;
  id: string;
};

const mailList: MailList[] = [
  {
    from: 'John Doe',
    subject: 'Test2',
    content: 'Is it also working?',
    unread: true,
    id: '00000000-0000-0000-0000-000000000001',
  },
  {
    from: 'John Doe',
    subject: 'Test',
    content: 'Is it working?',
    unread: false,
    id: '00000000-0000-0000-0000-000000000002',
  },
  {
    from: 'John Doe',
    subject: 'First Test',
    content: 'Is it working now?',
    unread: false,
    id: '00000000-0000-0000-0000-000000000003',
  },
];

function List(): JSX.Element {
  const selectedMail = mailList.length > 0 ? mailList[0].id : '';

  const backgroundClass = mailList.length > 0 ? 'has-background-white' : '';

  return (
    <div className="is-flex is-flex-grow-1 is-flex-direction-column">
      <div className="mail-layout-title">INBOX</div>
      <div
        className={`is-flex is-flex-grow-1 is-flex-direction-column ${backgroundClass}`}
      >
        {mailList.length === 0 ? (
          <Empty />
        ) : (
          mailList.map((mail) => {
            const className =
              mail.unread || mail.id === selectedMail
                ? 'app-item-selected'
                : 'app-item';
            return (
              <div className={className}>
                <p>{mail.from}</p>
                <p>{mail.subject}</p>
                <p>{mail.content}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default List;
