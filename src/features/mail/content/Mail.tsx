import React from 'react';

type MailProps = {
  mailId: string;
};

function Mail(props: MailProps): JSX.Element {
  const mailId = props.mailId;
  return (
    <div className="mail-layout-center">
      <div className="has-text-weight-bold">Selected {mailId}</div>
    </div>
  );
}

export default Mail;
