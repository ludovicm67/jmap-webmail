import { useSelector } from 'react-redux';
import { useQuery } from 'react-query';
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

type FetchMailContentArgs = {
  endpoint: string;
  identifier: string;
  mailId: string;
  authorizationHeader: string;
  downloadUrl: string;
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

const fetchMailContent = async (
  args: FetchMailContentArgs,
): Promise<MailContent | undefined> => {
  const { endpoint, identifier, mailId, authorizationHeader, downloadUrl } =
    args;
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

  return fetch(blobUrl, {
    headers: new Headers({
      'Content-Type': 'application/json',
      Authorization: authorizationHeader,
    }),
  })
    .then((r) => r.text())
    .then((t) => ({
      content: t,
      type: body.type,
    }));
};

function Mail(props: MailProps): JSX.Element {
  const mailId = props.mailId;
  const loginDetails = useSelector(getLoginPayload);
  const { authorizationHeader, endpoint, identifier, downloadUrl } =
    loginDetails;

  const { isLoading, error, data } = useQuery(`mail/${mailId}`, () =>
    fetchMailContent({
      endpoint,
      identifier,
      mailId,
      authorizationHeader,
      downloadUrl,
    }),
  );

  if (isLoading) {
    return <p>Loading…</p>;
  }

  if (error || !data) {
    return (
      <p>
        An error occured while trying to load the email content… Please try
        refreshing the page!
      </p>
    );
  }

  return (
    <div className="mail-layout-center has-background-white is-flex-direction-column">
      <div className="has-text-left">
        {(data.type === 'text/plain' && (
          <pre className="p-4 has-background-white">
            <SanitizedHtml html={data.content} />
          </pre>
        )) || <SanitizedHtml html={data.content} />}
      </div>
    </div>
  );
}

export default Mail;
