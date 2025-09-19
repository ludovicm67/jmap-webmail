import { JSX } from 'react';

function Empty(): JSX.Element {
  return (
    <div className="mail-layout-center">
      <div className="has-text-weight-bold">You do not have any mailboxes</div>
    </div>
  );
}

export default Empty;
