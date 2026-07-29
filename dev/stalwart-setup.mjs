// One-shot setup for the local Stalwart (compose.yaml). Idempotent, so it is
// safe to re-run. It:
//   1. completes Stalwart's bootstrap via the x:Bootstrap JMAP object
//      (configuring the internal store + full-text search, which makes
//      Email/query work), then restarts the container into normal mode;
//   2. creates the example.org domain's `test@example.org` account;
//   3. seeds a few sample messages into that account's inbox.
//
// Run after `docker compose up -d`:
//   node dev/stalwart-setup.mjs
//
// Credentials are fixed so tests/logins are reproducible:
//   admin (recovery) : admin / changeme
//   test user        : test@example.org / jmap-webmail-test-passphrase-2026

import { execSync } from 'node:child_process';

const BASE = process.env.STALWART_BASE ?? 'http://localhost:8080';
const HOSTNAME = 'mail.example.org';
const DOMAIN = 'example.org';
export const TEST_EMAIL = 'test@example.org';
export const TEST_PASS = 'jmap-webmail-test-passphrase-2026';

const CORE = 'urn:ietf:params:jmap:core';
const MAIL = 'urn:ietf:params:jmap:mail';
const STALWART = 'urn:stalwart:jmap';

const basic = (user, pass) =>
  'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
const ADMIN = basic('admin', 'changeme');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const jmap = async (auth, methodCalls, using = [CORE, STALWART]) => {
  const res = await fetch(`${BASE}/jmap`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ using, methodCalls }),
  });
  return res.json();
};

const waitHealthy = async (label) => {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${BASE}/healthz/live`)).ok) return;
    } catch {
      // not up yet
    }
    await sleep(1000);
  }
  throw new Error(`Stalwart did not become healthy (${label})`);
};

const completeBootstrap = async () => {
  const get = await jmap(ADMIN, [['x:Bootstrap/get', {}, '0']]);
  const pending = (get.methodResponses?.[0]?.[1]?.list ?? []).length > 0;
  if (!pending) {
    console.log('✓ Stalwart already set up');
    return;
  }

  const set = await jmap(ADMIN, [
    [
      'x:Bootstrap/set',
      {
        update: {
          singleton: {
            serverHostname: HOSTNAME,
            defaultDomain: DOMAIN,
            requestTlsCertificate: false,
            generateDkimKeys: true,
            dataStore: { '@type': 'RocksDb', path: '/var/lib/stalwart/' },
            blobStore: { '@type': 'Default' },
            searchStore: { '@type': 'Default' },
            inMemoryStore: { '@type': 'Default' },
            directory: { '@type': 'Internal' },
            dnsServer: { '@type': 'Manual' },
          },
        },
      },
      '0',
    ],
  ]);
  if (!set.methodResponses?.[0]?.[1]?.updated?.singleton) {
    throw new Error('Bootstrap setup failed: ' + JSON.stringify(set));
  }
  console.log(`✓ Completed setup (hostname ${HOSTNAME}, domain ${DOMAIN})`);

  // The running process must restart to load the new config (normal mode).
  console.log('  Restarting Stalwart to leave bootstrap mode…');
  execSync('docker compose restart stalwart', { stdio: 'inherit' });
  await waitHealthy('post-restart');
};

const createTestUser = async () => {
  const accounts = await jmap(ADMIN, [['x:Account/get', {}, '0']]);
  const list = accounts.methodResponses?.[0]?.[1]?.list ?? [];
  if (list.some((a) => a.emailAddress === TEST_EMAIL)) {
    console.log(`✓ ${TEST_EMAIL} already exists`);
    return;
  }
  const domainId = list.find((a) =>
    a.emailAddress?.endsWith(`@${DOMAIN}`),
  )?.domainId;
  if (!domainId) {
    throw new Error(`Could not resolve the ${DOMAIN} domain id`);
  }

  const create = await jmap(ADMIN, [
    [
      'x:Account/set',
      {
        create: {
          u: {
            '@type': 'User',
            name: 'test',
            domainId,
            credentials: { 0: { '@type': 'Password', secret: TEST_PASS } },
            roles: { '@type': 'User' },
            description: 'Integration test user',
          },
        },
      },
      '0',
    ],
  ]);
  if (!create.methodResponses?.[0]?.[1]?.created?.u) {
    throw new Error(
      'Create user failed: ' +
        JSON.stringify(create.methodResponses?.[0]?.[1]?.notCreated),
    );
  }
  console.log(`✓ Created ${TEST_EMAIL}`);
};

const seedMail = async () => {
  const auth = basic(TEST_EMAIL, TEST_PASS);
  const session = await (
    await fetch(`${BASE}/.well-known/jmap`, {
      headers: { Authorization: auth },
    })
  ).json();
  const apiUrl = new URL(BASE).origin + new URL(session.apiUrl).pathname; // localize
  const accountId = session.primaryAccounts[MAIL];

  const post = async (methodCalls) => {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ using: [CORE, MAIL], methodCalls }),
    });
    return res.json();
  };

  const mbx = await post([
    ['Mailbox/get', { accountId, ids: null, properties: ['id', 'role'] }, '0'],
  ]);
  const inbox = mbx.methodResponses[0][1].list.find((m) => m.role === 'inbox');

  const query = await post([['Email/query', { accountId }, '0']]);
  if ((query.methodResponses[0][1].ids ?? []).length > 0) {
    console.log('✓ Inbox already has messages, skipping seed');
    return;
  }

  const samples = [
    [
      'Welcome to Stalwart',
      'Alice',
      'alice@example.com',
      'Thanks for trying the JMAP webmail!',
    ],
    [
      'Your invoice #1042',
      'Billing',
      'billing@shop.example',
      'Total due: 42.00',
    ],
    ['Lunch tomorrow?', 'Bob', 'bob@example.com', 'Are you free around noon?'],
  ];
  let created = 0;
  for (const [subject, name, email, text] of samples) {
    const res = await post([
      [
        'Email/set',
        {
          accountId,
          create: {
            e: {
              mailboxIds: { [inbox.id]: true },
              keywords: {},
              from: [{ name, email }],
              to: [{ email: TEST_EMAIL }],
              subject,
              bodyValues: { b: { value: text } },
              textBody: [{ partId: 'b', type: 'text/plain' }],
            },
          },
        },
        '0',
      ],
    ]);
    if (res.methodResponses?.[0]?.[1]?.created?.e) created++;
  }
  console.log(`✓ Seeded ${created} sample message(s)`);
};

const main = async () => {
  await waitHealthy('startup');
  await completeBootstrap();
  await createTestUser();
  await seedMail();

  console.log('');
  console.log('Stalwart is ready:');
  console.log(`  JMAP endpoint : ${BASE}/.well-known/jmap`);
  console.log(`  Test account  : ${TEST_EMAIL} / ${TEST_PASS}`);
  console.log(`  Admin (recovery): admin / changeme`);
  console.log('');
  console.log('Run the integration tests with:  npm run test:integration');
};

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
