import { JMAP_CORE, JMAPResponse, postJmap } from './jmap';

const DEVICE_CLIENT_ID = 'jmap-webmail';

// The VAPID key is advertised as base64url; the Push API wants a Uint8Array
// backed by a plain ArrayBuffer (so it satisfies BufferSource).
const urlBase64ToUint8Array = (
  base64String: string,
): Uint8Array<ArrayBuffer> => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
};

export const pushSupported = (): boolean =>
  typeof navigator !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

type PushSubRow = { id: string; deviceClientId?: string };

/**
 * Register a Web Push subscription and mirror it as a JMAP PushSubscription so
 * the server delivers StateChange notifications even when the tab is closed.
 * Completes the RFC 8620 verification handshake via the service worker.
 */
export const enablePush = async (
  apiUrl: string,
  vapidKey: string,
  header: string,
  types: string[] = ['Email', 'EmailDelivery'],
): Promise<JMAPResponse<true>> => {
  if (!pushSupported()) {
    return {
      success: false,
      message: 'This browser does not support push notifications.',
    };
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { success: false, message: 'Notification permission was denied.' };
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }
  const json = subscription.toJSON();
  const keys = json.keys || {};

  // The server pushes a PushVerification to the endpoint; the service worker
  // relays its code back to us so we can confirm the subscription.
  const verification = new Promise<string | undefined>((resolve) => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'jmap-push-verification') {
        navigator.serviceWorker.removeEventListener('message', handler);
        resolve(event.data.verificationCode);
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    setTimeout(() => {
      navigator.serviceWorker.removeEventListener('message', handler);
      resolve(undefined);
    }, 10000);
  });

  const created = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE],
      methodCalls: [
        [
          'PushSubscription/set',
          {
            create: {
              s: {
                '@type': 'PushSubscription',
                deviceClientId: DEVICE_CLIENT_ID,
                url: subscription.endpoint,
                keys: { p256dh: keys.p256dh, auth: keys.auth },
                types,
              },
            },
          },
          '0',
        ],
      ],
    },
    { Authorization: header },
  );
  const m = (created?.methodResponses as unknown[] | undefined)?.[0] as
    | [
        string,
        {
          created?: Record<string, { id: string }>;
          notCreated?: Record<string, { description?: string }>;
        },
      ]
    | undefined;
  const row = m?.[1]?.created?.s;
  if (!row) {
    return {
      success: false,
      message:
        m?.[1]?.notCreated?.s?.description ||
        'The server rejected the push subscription.',
    };
  }

  const code = await verification;
  if (code) {
    await postJmap(
      apiUrl,
      {
        using: [JMAP_CORE],
        methodCalls: [
          [
            'PushSubscription/set',
            { update: { [row.id]: { verificationCode: code } } },
            '0',
          ],
        ],
      },
      { Authorization: header },
    );
  }
  return { success: true, data: true };
};

/** Remove the browser subscription and any JMAP PushSubscriptions for it. */
export const disablePush = async (
  apiUrl: string,
  header: string,
): Promise<void> => {
  if (pushSupported()) {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    await subscription?.unsubscribe();
  }
  const list = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE],
      methodCalls: [
        [
          'PushSubscription/get',
          { ids: null, properties: ['id', 'deviceClientId'] },
          '0',
        ],
      ],
    },
    { Authorization: header },
  );
  const m = (list?.methodResponses as unknown[] | undefined)?.[0] as
    [string, { list?: PushSubRow[] }] | undefined;
  const ids = (m?.[1]?.list ?? [])
    .filter((s) => s.deviceClientId === DEVICE_CLIENT_ID)
    .map((s) => s.id);
  if (ids.length > 0) {
    await postJmap(
      apiUrl,
      {
        using: [JMAP_CORE],
        methodCalls: [['PushSubscription/set', { destroy: ids }, '0']],
      },
      { Authorization: header },
    );
  }
};

/** Whether a browser push subscription currently exists. */
export const isPushEnabled = async (): Promise<boolean> => {
  if (!pushSupported()) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return !!subscription;
};
