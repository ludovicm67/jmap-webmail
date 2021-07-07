import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import SanitizedHtml from '../../../components/SanitizedHtml';
import { fetchMail } from '../../../lib/jmap';
import { getLoginPayload } from '../../login/loginSlice';

type MailProps = {
  mailId: string;
};

type MailContent = {
  content: string;
  type: string;
};

const replaceDownloadUrl = (
  accountId: string,
  blobId: string,
  name: string,
  type: string,
  downloadUrl: string,
  endpoint: string,
) => {
  return new URL(
    downloadUrl
      .replace(/{accountId}/g, encodeURI(accountId))
      .replace(/{blobId}/g, encodeURI(blobId))
      .replace(/{name}/g, encodeURI(name))
      .replace(/{type}/g, encodeURI(type)),
    endpoint,
  ).href;
};

function Mail(props: MailProps): JSX.Element {
  const mailId = props.mailId;
  const loginDetails = useSelector(getLoginPayload);
  const { authorizationHeader, endpoint, identifier, downloadUrl } =
    loginDetails;
  const [mailContent, setMailContent] = useState<MailContent>({
    content: 'Loading…',
    type: 'text/plain',
  });

  const loadMailContent = async () => {
    const mailRequest = await fetchMail(endpoint, identifier, mailId, {
      Authorization: authorizationHeader,
    });

    if (!mailRequest.success) {
      return;
    }

    const mailData = mailRequest.data;

    if (!mailData.htmlBody || mailData.htmlBody.length < 1) {
      return;
    }

    const body = mailData.htmlBody[0];

    if (!body.blobId) {
      return;
    }

    const blobUrl = replaceDownloadUrl(
      identifier,
      body.blobId,
      'content',
      `${body.type};charset=${body.charset}`,
      downloadUrl,
      endpoint,
    );

    fetch(blobUrl, {
      headers: new Headers({
        'Content-Type': 'application/json',
        Authorization: authorizationHeader,
      }),
    })
      .then((r) => r.text())
      .then((t) => {
        setMailContent({
          content: t,
          type: body.type,
        });
      });
  };

  return (
    <div className="mail-layout-center has-background-white is-flex-direction-column">
      <div className="has-text-weight-bold">
        <button onClick={() => loadMailContent()}>Load mail content</button>
      </div>
      <div className="has-text-left">
        {(mailContent.type === 'text/plain' && (
          <pre className="p-4 has-background-white">
            <SanitizedHtml html={mailContent.content} />
          </pre>
        )) || <SanitizedHtml html={mailContent.content} />}
      </div>
    </div>
  );
}

export default Mail;
