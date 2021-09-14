import './Layout.css';
import MailContent from './content/Mail';
import MailEmpty from './content/Empty';
import MailList from './list/List';
import Mailboxes from './mailboxes/List';
import { getRouteParams } from './utils';

function Layout(): JSX.Element {
  const routeParams = getRouteParams();

  let mailboxesClass = '';
  let listClass = 'hide-mobile';
  let contentClass = 'hide-mobile';

  if (routeParams.mailboxId) {
    if (routeParams.mailId) {
      mailboxesClass = 'hide-mobile';
      listClass = 'hide-mobile';
      contentClass = '';
    } else {
      mailboxesClass = 'hide-mobile';
      listClass = '';
      contentClass = 'hide-mobile';
    }
  }

  return (
    <div className="mail-layout">
      <div className={`mail-layout-mailboxes ${mailboxesClass}`}>
        <Mailboxes />
      </div>
      <div className={`mail-layout-focused mail-layout-list ${listClass}`}>
        <MailList />
      </div>
      <div className={`mail-layout-content ${contentClass}`}>
        {routeParams.mailboxId && routeParams.mailId ? (
          <MailContent mailId={routeParams.mailId} />
        ) : (
          <MailEmpty />
        )}
      </div>
    </div>
  );
}

export default Layout;
