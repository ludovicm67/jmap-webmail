import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { selectMailboxes } from '../mailSlice';
import { getMailboxIcon, getMailboxName, getRouteParams } from '../utils';
import Empty from './Empty';

function List(): JSX.Element {
  const mailboxes = useSelector(selectMailboxes);

  const routeParams = getRouteParams();
  let mailboxId = routeParams.mailboxId || 'inbox';
  if (mailboxId === 'inbox') {
    mailboxId = mailboxes.length > 0 ? mailboxes[0].id : '';
  }

  return mailboxes.length === 0 ? (
    <Empty />
  ) : (
    <div className="is-flex-grow-1 overflowable">
      {mailboxes.map((mailbox) => {
        const className =
          mailbox.id === mailboxId ? 'app-item-selected' : 'app-item';
        return (
          <Link to={`/mail/${mailbox.id}`} key={mailbox.id}>
            <div className={`icon-text ${className}`}>
              <span className="icon">
                <i className={getMailboxIcon(mailbox)}></i>
              </span>
              <span>{getMailboxName(mailbox)}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default List;
