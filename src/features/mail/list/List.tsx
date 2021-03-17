import React from 'react';
import { Link } from 'react-router-dom';
import { FEATURE_URL, getRouteParams } from '../utils';
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
  const routeParams = getRouteParams();
  const mailboxId = routeParams.mailboxId || 'inbox';
  const mailId =
    routeParams.mailId || (mailList.length > 0 ? mailList[0].id : '');

  const backgroundClass = mailList.length > 0 ? 'has-background-white' : '';

  return (
    <div className="is-flex is-flex-grow-1 is-flex-direction-column is-clipped">
      <div className="mail-layout-title">
        <Link
          to={FEATURE_URL}
          className="button is-small is-white mr-3 only-mobile"
        >
          <span className="icon is-small">
            <i className="fas fa-chevron-left"></i>
          </span>
        </Link>
        INBOX
      </div>
      <div
        className={`is-flex is-flex-grow-1 is-flex-direction-column overflowable ${backgroundClass}`}
      >
        {mailList.length === 0 ? (
          <Empty />
        ) : (
          mailList.map((mail) => {
            const className =
              mail.unread || mail.id === mailId
                ? 'app-item-selected'
                : 'app-item';
            return (
              <Link to={`${FEATURE_URL}${mailboxId}/${mail.id}`} key={mail.id}>
                <div className={className}>
                  <p>{mail.from}</p>
                  <p>{mail.subject}</p>
                  <p>{mail.content}</p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

export default List;
