# Local Stalwart JMAP server (for testing)

A one-command [Stalwart](https://stalw.art) JMAP backend to develop/test the
webmail against a real server.

## Usage

```sh
docker compose up -d                 # boot Stalwart (starts in bootstrap mode)
node dev/stalwart-setup.mjs          # finish setup + create the test account + seed mail
npm run test:integration             # run the JMAP client integration tests
docker compose down -v               # stop and wipe the data volumes
```

`dev/stalwart-setup.mjs` is idempotent and does four things:

1. **Completes Stalwart's bootstrap** via the `x:Bootstrap` JMAP object (internal
   RocksDB store + `Default` full-text search — this is what makes `Email/query`
   work), then restarts the container into normal mode.
2. **Creates** the `example.org` demo accounts (below).
3. **Seeds** a few sample messages into `test@example.org`'s inbox.
4. **Enables permissive CORS** (see the browser section).

## Fixed credentials

All accounts live on the `example.org` domain, so they can **email each other
locally** (Stalwart delivers internally — no external SMTP needed):

| Account | Login | Password |
| --- | --- | --- |
| Test user | `test@example.org` | `jmap-webmail-test-passphrase-2026` |
| Alice | `alice@example.org` | `jmap-webmail-alice-passphrase-2026` |
| Bob | `bob@example.org` | `jmap-webmail-bob-passphrase-2026` |
| Admin (recovery) | `admin` | `changeme` (pinned via `STALWART_RECOVERY_ADMIN`) |

Each account gets an auto-created sending identity, so composing/replying from the
webmail works between them. `admin@example.org` is also created during setup with a
random password; the recovery admin (`admin` / `changeme`) always works.

To try sending: sign in as `test@example.org`, **Compose** a message to
`alice@example.org`, then sign in as Alice to see it arrive.

The setup also seeds, for `test@example.org`: a **second identity** (so the header
"Send as" switcher has options), a couple of **contacts** and **calendar events**
(for the Contacts and Calendar sections), a **Sieve filter** (Filters tool) and a
**Documents folder with a file** (Files tool), and **shares Bob's inbox** with test
— so the session exposes two mailboxes and the header **account switcher** is
demoable. Stalwart advertises many JMAP capabilities (contacts, calendars, sieve,
filenode, quota, vacationresponse, blob, webpush-vapid, principals), and the webmail
lights up a left-rail tool for each one it finds.

## Integration tests

[`test/jmap.integration.test.ts`](../../test/jmap.integration.test.ts) exercises
`src/lib/jmap.ts` against the live server as `test@example.org`: `fetchSession`,
`fetchMailboxes`, `fetchMails` (Email/query), `fetchMail`, `setEmailKeyword` /
`setEmailsKeyword` (read/unread), `moveEmails`, `destroyEmails`, `fetchIdentities`.
They are gated on `STALWART_URL` so a plain `npm test` skips them.

CI runs the whole flow in [`.github/workflows/integration.yaml`](../../.github/workflows/integration.yaml).

## End-to-end tests (Playwright)

[`e2e/`](../../e2e/) drives the real webmail in a browser against this server:
signing in, and — key for push — that a **newly delivered email appears in the
list automatically**, the **Inbox unread count** increases, and the list updates
even while an email is open. Each test captures the WebSocket frames + console +
network for diagnosis.

```sh
docker compose up -d && node dev/stalwart-setup.mjs   # server must be running
npm run test:e2e
```

They start the dev server automatically and also run in CI.

## Try it in the browser

```sh
docker compose up -d && node dev/stalwart-setup.mjs   # if not already running
npm run dev                                           # webmail at http://localhost:3000
```

Then sign in:

1. Enter the identifier `test@example.org` and tick **More options**.
2. Set **Endpoint** to `http://localhost:3000/.well-known/jmap`.
3. Password: `jmap-webmail-test-passphrase-2026`, then **Sign In**.

The Vite dev server proxies `/.well-known/jmap` and `/jmap` to Stalwart (see
[vite.config.ts](../../vite.config.ts)), so the browser talks to it same-origin.
The proxy also rewrites the absolute URLs Stalwart advertises in its session
(`apiUrl`, `downloadUrl`, …) to relative paths, since Stalwart builds them from
its own hostname over https, which the browser can't reach locally.

**Live updates:** the webmail opens a JMAP WebSocket (RFC 8887) for push, so when
a new mail arrives (e.g. sign in as Alice and email `test@example.org`), the
message list and unread counts update automatically — no refresh needed. Since a
browser can't set an `Authorization` header on a WebSocket, the client passes it
as a `jmapauth.<base64url>` subprotocol that the proxy turns back into the header
Stalwart expects. Against a JMAP server that isn't behind this proxy, push simply
stays off (the app still works).

`dev/stalwart-setup.mjs` also enables **permissive CORS** on Stalwart
(`usePermissiveCors`) for clients that connect to `http://localhost:8080`
directly. The Node integration tests hit port 8080 directly and rebase the
advertised `apiUrl` onto the local origin themselves.
