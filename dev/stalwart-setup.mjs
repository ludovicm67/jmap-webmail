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

// Seed a second identity, a couple of contacts, and a few calendar events for
// the test user, so the identity switcher, Contacts and Calendar have data.
const seedExtras = async () => {
  const testAuth = basic(TEST_EMAIL, TEST_PASS);
  const session = await (
    await fetch(`${BASE}/.well-known/jmap`, {
      headers: { Authorization: testAuth },
    })
  ).json();
  const acc = session.primaryAccounts[MAIL];
  const SUB = [CORE, 'urn:ietf:params:jmap:submission'];
  const CON = [CORE, 'urn:ietf:params:jmap:contacts'];
  const CAL = [CORE, 'urn:ietf:params:jmap:calendars'];
  const listOf = (res) => res.methodResponses?.[0]?.[1]?.list ?? [];
  const idsOf = (res) => res.methodResponses?.[0]?.[1]?.ids ?? [];

  // Second identity.
  const identities = listOf(
    await jmap(
      testAuth,
      [['Identity/get', { accountId: acc, ids: null }, '0']],
      SUB,
    ),
  );
  if (identities.length < 2) {
    await jmap(
      testAuth,
      [
        [
          'Identity/set',
          {
            accountId: acc,
            create: { i: { name: 'Test (Support)', email: TEST_EMAIL } },
          },
          '0',
        ],
      ],
      SUB,
    );
    console.log('✓ Created a second identity');
  } else {
    console.log('✓ Identities already seeded');
  }

  // Contacts.
  const books = listOf(
    await jmap(
      testAuth,
      [['AddressBook/get', { accountId: acc, ids: null }, '0']],
      CON,
    ),
  );
  const bookId = (books.find((b) => b.isDefault) ?? books[0])?.id;
  const contactIds = idsOf(
    await jmap(testAuth, [['ContactCard/query', { accountId: acc }, '0']], CON),
  );
  if (bookId && contactIds.length === 0) {
    await jmap(
      testAuth,
      [
        [
          'ContactCard/set',
          {
            accountId: acc,
            create: {
              c1: {
                addressBookIds: { [bookId]: true },
                name: { full: 'Alice Example' },
                emails: { e: { address: 'alice@example.org' } },
                phones: { p: { number: '+1-555-0100' } },
                organizations: { o: { name: 'Example Inc.' } },
              },
              c2: {
                addressBookIds: { [bookId]: true },
                name: { full: 'Bob Example' },
                emails: { e: { address: 'bob@example.org' } },
              },
            },
          },
          '0',
        ],
      ],
      CON,
    );
    console.log('✓ Seeded contacts');
  } else {
    console.log('✓ Contacts already seeded');
  }

  // Calendar events over the next few days.
  const calendars = listOf(
    await jmap(
      testAuth,
      [['Calendar/get', { accountId: acc, ids: null }, '0']],
      CAL,
    ),
  );
  const calId = (calendars.find((c) => c.isDefault) ?? calendars[0])?.id;
  const eventIds = idsOf(
    await jmap(
      testAuth,
      [['CalendarEvent/query', { accountId: acc }, '0']],
      CAL,
    ),
  );
  if (calId && eventIds.length === 0) {
    const pad = (n) => String(n).padStart(2, '0');
    const at = (dayOffset, h, m = 0) => {
      const d = new Date();
      d.setDate(d.getDate() + dayOffset);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(h)}:${pad(m)}:00`;
    };
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    await jmap(
      testAuth,
      [
        [
          'CalendarEvent/set',
          {
            accountId: acc,
            create: {
              e1: {
                '@type': 'Event',
                calendarIds: { [calId]: true },
                title: 'Team sync',
                start: at(1, 10),
                duration: 'PT1H',
                timeZone: tz,
                locations: { l: { name: 'Room A' } },
              },
              e2: {
                '@type': 'Event',
                calendarIds: { [calId]: true },
                title: 'Lunch with Alice',
                start: at(2, 12, 30),
                duration: 'PT1H',
                timeZone: tz,
              },
              e3: {
                '@type': 'Event',
                calendarIds: { [calId]: true },
                title: 'Project deadline',
                start: at(5, 0),
                showWithoutTime: true,
                duration: 'P1D',
              },
            },
          },
          '0',
        ],
      ],
      CAL,
    );
    console.log('✓ Seeded calendar events');
  } else {
    console.log('✓ Calendar events already seeded');
  }

  // Uploads for the Sieve filter and file storage below.
  const uploadUrl =
    new URL(BASE).origin +
    new URL(session.uploadUrl).pathname.replace('%7BaccountId%7D', acc);
  const upload = async (contentType, body) => {
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: { Authorization: testAuth, 'Content-Type': contentType },
      body,
    });
    return res.json();
  };

  // A Sieve filter (Filters tool).
  const SIEVE = [CORE, 'urn:ietf:params:jmap:sieve'];
  if (session.primaryAccounts['urn:ietf:params:jmap:sieve']) {
    const scripts = idsOf(
      await jmap(
        testAuth,
        [['SieveScript/query', { accountId: acc }, '0']],
        SIEVE,
      ),
    );
    if (scripts.length === 0) {
      const blob = await upload(
        'application/sieve',
        'require ["fileinto"];\n\n# File mail from Alice into a folder.\nif address :contains "from" "alice@example.org" {\n  fileinto "Alice";\n}\n',
      );
      await jmap(
        testAuth,
        [
          [
            'SieveScript/set',
            {
              accountId: acc,
              create: { s: { name: 'Sort by sender', blobId: blob.blobId } },
              onSuccessActivateScript: '#s',
            },
            '0',
          ],
        ],
        SIEVE,
      );
      console.log('✓ Seeded a Sieve filter');
    } else {
      console.log('✓ Sieve filter already seeded');
    }
  }

  // File storage: a folder with a readme (Files tool).
  const FN = [CORE, 'urn:ietf:params:jmap:filenode'];
  if (session.primaryAccounts['urn:ietf:params:jmap:filenode']) {
    const nodes = idsOf(
      await jmap(testAuth, [['FileNode/query', { accountId: acc }, '0']], FN),
    );
    if (nodes.length === 0) {
      const mk = await jmap(
        testAuth,
        [
          [
            'FileNode/set',
            {
              accountId: acc,
              create: {
                d: { name: 'Documents', parentId: null, nodeType: 'directory' },
              },
            },
            '0',
          ],
        ],
        FN,
      );
      const folderId = mk.methodResponses?.[0]?.[1]?.created?.d?.id ?? null;
      const blob = await upload(
        'text/plain',
        'Welcome to your JMAP file storage!\n',
      );
      await jmap(
        testAuth,
        [
          [
            'FileNode/set',
            {
              accountId: acc,
              create: {
                f: {
                  name: 'readme.txt',
                  parentId: folderId,
                  nodeType: 'file',
                  blobId: blob.blobId,
                  type: 'text/plain',
                  size: blob.size,
                },
              },
            },
            '0',
          ],
        ],
        FN,
      );
      console.log('✓ Seeded file storage');
    } else {
      console.log('✓ File storage already seeded');
    }
  }
};

// Share Bob's inbox with test, so test's session exposes a second mail account
// and the header account switcher is demoable. Also seeds a message into it.
const shareBobMailbox = async () => {
  const MAILCAP = [CORE, MAIL];
  const bobAuth = basic('bob@example.org', 'jmap-webmail-bob-passphrase-2026');
  const testAuth = basic(TEST_EMAIL, TEST_PASS);
  const sessionOf = async (auth) =>
    (
      await fetch(`${BASE}/.well-known/jmap`, {
        headers: { Authorization: auth },
      })
    ).json();

  const bobSession = await sessionOf(bobAuth);
  const bobAcc = bobSession.primaryAccounts[MAIL];
  const testSession = await sessionOf(testAuth);
  const testPrincipal = testSession.primaryAccounts[MAIL];

  const mbx = await jmap(
    bobAuth,
    [
      [
        'Mailbox/get',
        { accountId: bobAcc, ids: null, properties: ['id', 'role'] },
        '0',
      ],
    ],
    MAILCAP,
  );
  const inbox = (mbx.methodResponses[0][1].list ?? []).find(
    (m) => m.role === 'inbox',
  );
  if (!inbox) return;

  const q = await jmap(
    bobAuth,
    [['Email/query', { accountId: bobAcc }, '0']],
    MAILCAP,
  );
  if ((q.methodResponses[0][1].ids ?? []).length === 0) {
    await jmap(
      bobAuth,
      [
        [
          'Email/set',
          {
            accountId: bobAcc,
            create: {
              e: {
                mailboxIds: { [inbox.id]: true },
                keywords: {},
                from: [{ name: 'Carol', email: 'carol@example.com' }],
                to: [{ email: 'bob@example.org' }],
                subject: 'Bob mailbox sample',
                bodyValues: { b: { value: 'Shared mailbox demo message.' } },
                textBody: [{ partId: 'b', type: 'text/plain' }],
              },
            },
          },
          '0',
        ],
      ],
      MAILCAP,
    );
  }

  if (testSession.accounts[bobAcc]) {
    console.log("✓ Bob's mailbox already shared with test");
    return;
  }
  await jmap(
    bobAuth,
    [
      [
        'Mailbox/set',
        {
          accountId: bobAcc,
          update: {
            [inbox.id]: {
              shareWith: {
                [testPrincipal]: { mayReadItems: true, maySetSeen: true },
              },
            },
          },
        },
        '0',
      ],
    ],
    MAILCAP,
  );
  console.log("✓ Shared Bob's inbox with test (account switcher demo)");
};

const main = async () => {
  await waitHealthy('startup');
  await completeBootstrap();
  await createUsers();
  await seedMail();
  await seedExtras();
  await shareBobMailbox();
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
