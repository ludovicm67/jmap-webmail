# JMAP webmail

This is a webmail client for JMAP protocol.

## Run it locally

```sh
npm install
npm run dev
```

And open your web browser at: http://localhost:3000/

## Testing against a local JMAP server

A local [Stalwart](https://stalw.art) server can be spun up with Docker Compose to
run the JMAP client integration tests against a real backend:

```sh
docker compose up -d           # boot Stalwart
node dev/stalwart-setup.mjs    # complete setup + create test@example.org + seed mail
npm run test:integration       # run the integration tests
```

See [dev/stalwart/README.md](dev/stalwart/README.md) for details. The same flow runs
in CI via [.github/workflows/integration.yaml](.github/workflows/integration.yaml).

## Known issues

The discovery of the endpoint is not working if the server is not configured with correct CORS headers.
