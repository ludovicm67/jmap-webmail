# JMAP webmail

This is a webmail client for JMAP protocol.

## Run it locally

```sh
npm install
npm run dev
```

And open your web browser at: http://localhost:3000/

## Try it locally against a real JMAP server

A local [Stalwart](https://stalw.art) server can be spun up with Docker Compose so
you can use the webmail (and run the integration tests) against a real backend:

```sh
docker compose up -d           # boot Stalwart
node dev/stalwart-setup.mjs    # complete setup + create test@example.org + seed mail
npm run dev                    # webmail at http://localhost:3000
```

Then sign in:

1. Enter the identifier `test@example.org` and tick **More options**.
2. Set the **Endpoint** to `http://localhost:3000/.well-known/jmap`.
3. Password: `jmap-webmail-test-passphrase-2026`, then **Sign In**.

The Vite dev server proxies the JMAP endpoints to Stalwart (same-origin, so no CORS
issues) and the setup script also enables permissive CORS on the server.

Run the JMAP client integration tests against the same server with:

```sh
npm run test:integration
```

See [dev/stalwart/README.md](dev/stalwart/README.md) for details. The integration
tests also run in CI via [.github/workflows/integration.yaml](.github/workflows/integration.yaml).

## Known issues

Endpoint discovery from an email address only works if the target server serves
`/.well-known/jmap` over HTTPS with the correct CORS headers. For servers without
CORS (including the local Stalwart above), sign in via **More options** and set the
endpoint manually.
