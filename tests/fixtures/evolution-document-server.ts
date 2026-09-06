import { createServer, type IncomingHttpHeaders, type Server, type ServerResponse } from 'node:http';

export type CapturedEvolutionRequest = Readonly<{
  method: string | undefined;
  url: string | undefined;
  headers: IncomingHttpHeaders;
  body: string;
}>;

type FixtureResponse = Readonly<{
  status?: number;
  headers?: Record<string, string>;
  body?: string;
  delayMs?: number;
  bodyDelayMs?: number;
}>;

export type EvolutionDocumentServer = Readonly<{
  url: string;
  requests: CapturedEvolutionRequest[];
  respond: (response: FixtureResponse) => void;
  pendingWork: () => Readonly<{ timers: number; responses: number }>;
  close: () => Promise<void>;
}>;

export async function startEvolutionDocumentServer(): Promise<EvolutionDocumentServer> {
  const requests: CapturedEvolutionRequest[] = [];
  const responses: FixtureResponse[] = [];
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const pendingResponses = new Set<ServerResponse>();
  const schedule = (delay: number, work: () => void) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      work();
    }, delay);
    timers.add(timer);
  };
  const server: Server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      requests.push({ method: request.method, url: request.url, headers: request.headers, body: Buffer.concat(chunks).toString('utf8') });
      const next = responses.shift() ?? {};
      pendingResponses.add(response);
      response.once('close', () => pendingResponses.delete(response));
      schedule(next.delayMs ?? 0, () => {
        if (!pendingResponses.has(response)) return;
        response.writeHead(next.status ?? 200, next.headers);
        if (next.bodyDelayMs) {
          response.flushHeaders();
          schedule(next.bodyDelayMs, () => {
            if (pendingResponses.has(response)) response.end(next.body ?? '');
          });
          return;
        }
        response.end(next.body ?? '');
      });
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('fixture did not bind a TCP port');
  let closePromise: Promise<void> | undefined;
  return {
    url: `http://127.0.0.1:${address.port}`,
    requests,
    respond: (response) => responses.push(response),
    pendingWork: () => ({ timers: timers.size, responses: pendingResponses.size }),
    close: () => closePromise ??= new Promise<void>((resolve, reject) => {
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
      for (const response of pendingResponses) response.destroy();
      pendingResponses.clear();
      server.close((error) => error && (error as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING' ? reject(error) : resolve());
    }),
  };
}
