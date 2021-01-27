import React from 'react';
import './Layout.css';
import MailContent from './content/Empty';
import MailList from './list/Empty';
import Mailboxes from './mailboxes/Empty';

function Layout(): JSX.Element {
  return (
    <div className="mail-layout">
      <div className="mail-layout-mailboxes">
        <Mailboxes />
      </div>
      <div className="mail-layout-list">
        <MailList />
      </div>
      <div className="mail-layout-content">
        <MailContent />
      </div>
    </div>
  );
}

export default Layout;
