import { JSX, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { ChevronLeft, MailOpen, Mail as MailClosed, Reply } from 'lucide-react';
import SanitizedHtml from '../../../components/SanitizedHtml';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchMail, setEmailKeyword } from '../../../lib/jmap';
import { getLoginPayload } from '../../login/loginSlice';
import { selectMails, setMailSeen } from '../mailSlice';
import { Mail as MailType } from '../types';
import ComposeDialog from '../compose/ComposeDialog';
import QuickReply from '../compose/QuickReply';
import { buildReply } from '../compose/utils';
import {
  FEATURE_URL,
  formatReceivedAt,
  getFromAddresses,
  getToAddresses,
} from '../utils';

type MailProps = {
  mailId: string;
};

type DisplayBody = { value: string; type: string };

// Choose the best body part to display and report its media type. Some servers
// place a text/plain part in `htmlBody`, so we key the rendering off the part's
// actual type rather than assuming htmlBody == HTML.
const getDisplayBody = (mail: MailType): DisplayBody | undefined => {
  const parts =
    mail.htmlBody && mail.htmlBody.length > 0 ? mail.htmlBody : mail.textBody;
  if (!parts) {
    return undefined;
  }
  for (const part of parts) {
    const value = part.partId
      ? mail.bodyValues?.[part.partId]?.value
      : undefined;
    if (value !== undefined) {
      return { value, type: part.type || 'text/plain' };
    }
  }
  return undefined;
};

function Mail(props: MailProps): JSX.Element {
  const mailId = props.mailId;
  const dispatch = useDispatch();
  const { authorizationHeader, apiUrl, accountId } =
    useSelector(getLoginPayload);
  const mailFromList = useSelector(selectMails).find((m) => m.id === mailId);
  const autoMarked = useRef<string | null>(null);

  const { isLoading, error, data } = useQuery({
    queryKey: [`mail/${mailId}`],
    queryFn: async () => {
      const request = await fetchMail(apiUrl, accountId, mailId, {
        Authorization: authorizationHeader,
      });
      if (!request.success) {
        throw new Error(request.message);
      }
      return request.data;
    },
  });

  const setSeen = async (seen: boolean) => {
    dispatch(setMailSeen({ mailId, seen }));
    await setEmailKeyword(apiUrl, accountId, mailId, '$seen', seen, {
      Authorization: authorizationHeader,
    });
  };

  // Mark the email as read the first time it is opened (unread == $seen not set).
  useEffect(() => {
    if (!data || autoMarked.current === mailId) {
      return;
    }
    if (data.keywords?.$seen !== true) {
      autoMarked.current = mailId;
      setSeen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, mailId]);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-6 text-center">
        <p>
          An error occured while trying to load the email content… Please try
          refreshing the page!
        </p>
      </div>
    );
  }

  const seen = mailFromList
    ? mailFromList.keywords?.$seen === true
    : data.keywords?.$seen === true;

  const body = getDisplayBody(data);
  const isHtml = body?.type === 'text/html';
  // Only quote plain-text bodies; HTML would need stripping to quote cleanly.
  const quoteText = body && !isHtml ? body.value : undefined;
  const replyInitial = buildReply(data, quoteText);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-start gap-2 border-b px-4 py-3">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="mt-0.5 md:hidden"
        >
          <Link to={FEATURE_URL} aria-label="Back to mailboxes">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">
            {data.subject || '(no subject)'}
          </h1>
          <div className="text-muted-foreground mt-1 text-sm">
            <div className="break-words">
              <span className="text-foreground font-medium">From:</span>{' '}
              {getFromAddresses(data)}
            </div>
            {data.to && data.to.length > 0 && (
              <div className="break-words">
                <span className="text-foreground font-medium">To:</span>{' '}
                {getToAddresses(data)}
              </div>
            )}
            {data.receivedAt && <div>{formatReceivedAt(data.receivedAt)}</div>}
          </div>
        </div>
        <div className="mt-0.5 flex shrink-0 items-center gap-2">
          <ComposeDialog
            title="Reply"
            initial={replyInitial}
            trigger={
              <Button variant="outline" size="sm">
                <Reply className="h-4 w-4" />
                <span className="hidden sm:inline">Reply</span>
              </Button>
            }
          />
          <Button variant="outline" size="sm" onClick={() => setSeen(!seen)}>
            {seen ? (
              <>
                <MailClosed className="h-4 w-4" />
                <span className="hidden sm:inline">Mark as unread</span>
              </>
            ) : (
              <>
                <MailOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Mark as read</span>
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="bg-background flex-1 overflow-auto">
        {body === undefined ? (
          <p className="text-muted-foreground p-4">
            This email has no displayable content.
          </p>
        ) : isHtml ? (
          // HTML emails are authored for a light background; render them on
          // white so dark theme doesn't leave dark text on a dark surface.
          <div className="p-4">
            <SanitizedHtml
              html={body.value}
              className="rounded-md bg-white p-4 text-neutral-900"
            />
          </div>
        ) : (
          <pre className="p-4 font-mono text-sm break-words whitespace-pre-wrap">
            {body.value}
          </pre>
        )}
      </div>
      <QuickReply mail={data} quoteText={quoteText} />
    </div>
  );
}

export default Mail;
