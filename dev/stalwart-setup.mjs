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

// Demo accounts (all on example.org, so they can email each other locally).
// `test` is the one the integration tests use.
const USERS = [
  { name: 'test', pass: TEST_PASS, description: 'Primary demo / test user' },
  {
    name: 'alice',
    pass: 'jmap-webmail-alice-passphrase-2026',
    description: 'Alice',
  },
  { name: 'bob', pass: 'jmap-webmail-bob-passphrase-2026', description: 'Bob' },
];
const emailOf = (user) => `${user.name}@${DOMAIN}`;

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

const createUsers = async () => {
  const domains = await jmap(ADMIN, [['x:Domain/get', {}, '0']]);
  const domainId = (domains.methodResponses?.[0]?.[1]?.list ?? []).find(
    (d) => d.name === DOMAIN,
  )?.id;
  if (!domainId) {
    throw new Error(`Could not resolve the ${DOMAIN} domain id`);
  }

  const accounts = await jmap(ADMIN, [['x:Account/get', {}, '0']]);
  const existing = new Set(
    (accounts.methodResponses?.[0]?.[1]?.list ?? []).map((a) => a.emailAddress),
  );

  for (const user of USERS) {
    const email = emailOf(user);
    if (existing.has(email)) {
      console.log(`✓ ${email} already exists`);
      continue;
    }
    const create = await jmap(ADMIN, [
      [
        'x:Account/set',
        {
          create: {
            u: {
              '@type': 'User',
              name: user.name,
              domainId,
              credentials: { 0: { '@type': 'Password', secret: user.pass } },
              roles: { '@type': 'User' },
              description: user.description,
            },
          },
        },
        '0',
      ],
    ]);
    if (!create.methodResponses?.[0]?.[1]?.created?.u) {
      throw new Error(
        `Create ${email} failed: ` +
          JSON.stringify(create.methodResponses?.[0]?.[1]?.notCreated),
      );
    }
    console.log(`✓ Created ${email}`);
  }
};

// Enable permissive CORS (and trust X-Forwarded-* headers) so the webmail can
// reach the server in a local browser setup. Requires a restart to take effect.
const configureHttp = async () => {
  const get = await jmap(ADMIN, [['x:Http/get', { ids: ['singleton'] }, '0']]);
  const current = get.methodResponses?.[0]?.[1]?.list?.[0];
  if (current?.usePermissiveCors === true) {
    console.log('✓ Permissive CORS already enabled');
    return;
  }

  const set = await jmap(ADMIN, [
    [
      'x:Http/set',
      {
        update: {
          singleton: { usePermissiveCors: true, useXForwarded: true },
        },
      },
      '0',
    ],
  ]);
  const updated = set.methodResponses?.[0]?.[1]?.updated ?? {};
  if (!('singleton' in updated)) {
    throw new Error('Failed to enable CORS: ' + JSON.stringify(set));
  }
  console.log('✓ Enabled permissive CORS');

  console.log('  Restarting Stalwart to apply HTTP settings…');
  execSync('docker compose restart stalwart', { stdio: 'inherit' });
  await waitHealthy('post-cors-restart');
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
  await createUsers();
  await seedMail();
  await configureHttp();

  console.log('');
  console.log('Stalwart is ready:');
  console.log(`  JMAP endpoint : ${BASE}/.well-known/jmap`);
  console.log('  Accounts (all can email each other locally):');
  for (const user of USERS) {
    console.log(`    ${emailOf(user).padEnd(18)} / ${user.pass}`);
  }
  console.log('  Admin (recovery): admin / changeme');
  console.log('');
  console.log('Run the integration tests with:  npm run test:integration');
  console.log(
    'Or use the webmail UI (npm run dev) — sign in via "More options" with',
  );
  console.log('  endpoint http://localhost:3000/.well-known/jmap');
};

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
