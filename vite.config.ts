import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Where the local Stalwart (compose.yaml) is reachable from the dev machine.
const STALWART = process.env.STALWART_PROXY_TARGET ?? 'http://localhost:8080';

// Stalwart advertises absolute URLs in its JMAP session (apiUrl, downloadUrl…)
// built from its own hostname over https, which the browser can't reach in a
// local setup. Strip the scheme+host so they become same-origin relative paths
// served through this dev proxy.
const stripOrigin = (value: unknown): unknown =>
  typeof value === 'string' ? value.replace(/^https?:\/\/[^/]+/, '') : value;

// Proxy the JMAP endpoints to Stalwart and rewrite the session response so the
// webmail can talk to the local server without CORS / hostname issues.
const jmapProxy: ProxyOptions = {
  target: STALWART,
  changeOrigin: true,
  ws: true,
  selfHandleResponse: true,
  configure: (proxy) => {
    // Ask for an uncompressed body so the session JSON can be rewritten.
    proxy.on('proxyReq', (proxyReq) =>
      proxyReq.removeHeader('accept-encoding'),
    );

    // Browsers can't set an Authorization header on a WebSocket, so the client
    // passes it as a `jmapauth.<base64url>` subprotocol; turn it back into the
    // header Stalwart expects and forward only the real `jmap` subprotocol.
    proxy.on('proxyReqWs', (proxyReq, req) => {
      const protocols = String(req.headers['sec-websocket-protocol'] ?? '')
        .split(',')
        .map((p) => p.trim());
      const authProto = protocols.find((p) => p.startsWith('jmapauth.'));
      if (authProto) {
        const header = Buffer.from(
          authProto.slice('jmapauth.'.length),
          'base64url',
        ).toString('utf8');
        proxyReq.setHeader('Authorization', header);
        proxyReq.setHeader('Sec-WebSocket-Protocol', 'jmap');
      }
    });

    proxy.on(
      'proxyRes',
      (
        proxyRes: IncomingMessage,
        req: IncomingMessage,
        res: ServerResponse,
      ) => {
        const chunks: Buffer[] = [];
        proxyRes.on('data', (chunk: Buffer) => chunks.push(chunk));
        proxyRes.on('end', () => {
          let body = Buffer.concat(chunks);

          if (req.url?.includes('/session')) {
            try {
              const session = JSON.parse(body.toString('utf8'));
              for (const key of [
                'apiUrl',
                'downloadUrl',
                'uploadUrl',
                'eventSourceUrl',
              ]) {
                session[key] = stripOrigin(session[key]);
              }
              body = Buffer.from(JSON.stringify(session), 'utf8');
            } catch {
              // Not JSON we understand — pass it through unchanged.
            }
          }

          res.statusCode = proxyRes.statusCode ?? 200;
          for (const [key, value] of Object.entries(proxyRes.headers)) {
            if (value === undefined) continue;
            if (
              key === 'content-length' ||
              key === 'transfer-encoding' ||
              key === 'content-encoding'
            ) {
              continue;
            }
            res.setHeader(key, value);
          }
          res.setHeader('content-length', body.length);
          res.end(body);
        });
      },
    );
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/.well-known/jmap': { target: STALWART, changeOrigin: true },
      '/jmap': jmapProxy,
    },
  },
});
