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

`dev/stalwart-setup.mjs` is idempotent and does three things:

1. **Completes Stalwart's bootstrap** via the `x:Bootstrap` JMAP object (internal
   RocksDB store + `Default` full-text search — this is what makes `Email/query`
   work), then restarts the container into normal mode.
2. **Creates** the `example.org` domain's `test@example.org` account.
3. **Seeds** a few sample messages into its inbox.

## Fixed credentials

| Account | Login | Password |
| --- | --- | --- |
| Test user | `test@example.org` | `jmap-webmail-test-passphrase-2026` |
| Admin (recovery) | `admin` | `changeme` (pinned via `STALWART_RECOVERY_ADMIN`) |

`admin@example.org` is also created during setup with a random password (printed
by the bootstrap step). The recovery admin (`admin` / `changeme`) always works.

## Integration tests

[`test/jmap.integration.test.ts`](../../test/jmap.integration.test.ts) exercises
`src/lib/jmap.ts` against the live server as `test@example.org`: `fetchSession`,
`fetchMailboxes`, `fetchMails` (Email/query), `fetchMail`, `setEmailKeyword` /
`setEmailsKeyword` (read/unread), `moveEmails`, `destroyEmails`, `fetchIdentities`.
They are gated on `STALWART_URL` so a plain `npm test` skips them.

CI runs the whole flow in [`.github/workflows/integration.yaml`](../../.github/workflows/integration.yaml).

## Notes

- Stalwart advertises its URLs with the internal container hostname over TLS
  (`https://<id>/jmap/`), which isn't reachable from the host, so the tests and
  setup script rebase the path onto `http://localhost:8080`.
- Using the **webmail UI** against this server from `http://localhost:3000`
  requires Stalwart to send permissive CORS headers (a browser cross-origin
  concern); the Node integration tests are not subject to CORS.
