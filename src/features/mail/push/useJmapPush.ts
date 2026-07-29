import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMailboxes, fetchMails } from '../../../lib/jmap';
import { getLoginPayload } from '../../login/loginSlice';
import { setList, setMailboxes } from '../mailSlice';

const toBase64Url = (value: string): string =>
  btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Build a same-origin WebSocket URL from the advertised capability URL. This
// works behind the dev proxy (which injects the Authorization header the browser
// can't set) regardless of the hostname the server advertises.
const browserWsUrl = (capabilityUrl: string): string => {
  const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  let path = capabilityUrl;
  try {
    path = new URL(capabilityUrl, window.location.href).pathname;
  } catch {
    // keep the advertised value as-is
  }
  return `${scheme}//${window.location.host}${path}`;
};

type StateChange = {
  '@type'?: string;
  changed?: Record<string, Record<string, string>>;
};

/**
 * Subscribe to JMAP push over WebSocket (RFC 8887). When the server signals a
 * change to Email/Mailbox for the account, refetch the mailbox list and mail
 * list so the message list and unread counts update automatically. It's a no-op
 * when the server doesn't advertise WebSocket push.
 */
export const useJmapPush = (): void => {
  const dispatch = useDispatch();
  const { authorizationHeader, apiUrl, accountId, webSocketUrl } =
    useSelector(getLoginPayload);

  useEffect(() => {
    if (!webSocketUrl || !apiUrl || !accountId) {
      return;
    }

    const url = browserWsUrl(webSocketUrl);
    const authProtocol = `jmapauth.${toBase64Url(authorizationHeader)}`;
    const headers = { Authorization: authorizationHeader };

    let socket: WebSocket | null = null;
    let stopped = false;
    let reconnectDelay = 2000;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let refetchTimer: ReturnType<typeof setTimeout> | undefined;

    // Debounce so a burst of changes triggers a single refetch.
    const refetch = () => {
      clearTimeout(refetchTimer);
      refetchTimer = setTimeout(async () => {
        const [mailboxes, mails] = await Promise.all([
          fetchMailboxes(apiUrl, accountId, headers),
          fetchMails(apiUrl, accountId, headers),
        ]);
        if (mailboxes.success) {
          dispatch(setMailboxes(mailboxes.data));
        }
        if (mails.success) {
          dispatch(setList(mails.data));
        }
      }, 300);
    };

    const connect = () => {
      socket = new WebSocket(url, ['jmap', authProtocol]);

      socket.onopen = () => {
        reconnectDelay = 2000;
        socket?.send(
          JSON.stringify({
            '@type': 'WebSocketPushEnable',
            dataTypes: ['Email', 'Mailbox', 'EmailDelivery'],
          }),
        );
      };

      socket.onmessage = (event) => {
        let message: StateChange;
        try {
          message = JSON.parse(String(event.data));
        } catch {
          return;
        }
        const changed =
          message['@type'] === 'StateChange'
            ? message.changed?.[accountId]
            : undefined;
        if (changed && ('Email' in changed || 'Mailbox' in changed)) {
          refetch();
        }
      };

      socket.onclose = () => {
        if (stopped) {
          return;
        }
        reconnectTimer = setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      clearTimeout(refetchTimer);
      socket?.close();
    };
  }, [authorizationHeader, apiUrl, accountId, webSocketUrl, dispatch]);
};
