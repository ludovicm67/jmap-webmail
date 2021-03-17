import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { selectMails } from '../mailSlice';
import { FEATURE_URL, getRouteParams } from '../utils';
import Empty from './Empty';

function List(): JSX.Element {
  const mailList = useSelector(selectMails);
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
