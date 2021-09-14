import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { selectMailboxes, selectMails } from '../mailSlice';
import { newMailbox } from '../types';
import {
  FEATURE_URL,
  getFromMail,
  getMailboxName,
  getRouteParams,
  isUnreadMail,
} from '../utils';
import Empty from './Empty';

function List(): JSX.Element {
  const routeParams = getRouteParams();
  let mailboxId = routeParams.mailboxId;

  const mailboxes = useSelector(selectMailboxes);
  const mailListAll = useSelector(selectMails);

  if (!mailboxId) {
    const inboxMailbox = mailboxes.filter(
      (mailbox) => mailbox.role === 'inbox',
    );
    if (inboxMailbox.length > 0) {
      mailboxId = inboxMailbox[0].id;
    }
  }

  const currentMailboxes = mailboxes.filter(
    (mailbox) => mailbox.id === mailboxId,
  );

  const currentMailbox =
    currentMailboxes.length > 0 ? currentMailboxes[0] : newMailbox();

  const mailList = mailListAll.filter((mail) => {
    if (
      mail.mailboxIds &&
      Object.prototype.hasOwnProperty.call(mail.mailboxIds, currentMailbox.id)
    ) {
      return mail.mailboxIds[currentMailbox.id];
    }

    return false;
  });

  const mailId = routeParams.mailId || '';
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
        {getMailboxName(currentMailbox)}
      </div>
      <div
        className={`is-flex is-flex-grow-1 is-flex-direction-column overflowable ${backgroundClass}`}
      >
        {mailList.length === 0 ? (
          <Empty />
        ) : (
          mailList.map((mail) => {
            const className =
              isUnreadMail(mail) || mail.id === mailId
                ? 'app-item-selected'
                : 'app-item';
            return (
              <Link to={`${FEATURE_URL}${mailboxId}/${mail.id}`} key={mail.id}>
                <div className={className}>
                  <p>{getFromMail(mail)}</p>
                  <p>{mail.subject}</p>
                  <p>{mail.preview}</p>
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
