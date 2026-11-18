import { createServer } from 'node:http';
export async function startModelFixture() {
  const received = [];
  const server = createServer(async (req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"status":"ok"}');
      return;
    }
    if (req.url === '/__requests') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(received));
      return;
    }
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    received.push(body);
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    const send = (value) => res.write('data: ' + JSON.stringify(value) + '\n\n');
    send({
      choices: [{ delta: { reasoning_content: 'Internal test reasoning must not reach the user' } }]
    });
    const delay = body.messages.at(-1).content.includes('slow-response') ? 600 : 5;
    const timer = setTimeout(() => {
      send({ choices: [{ delta: { content: 'Откройте раздел ' } }] });
      const bytes = Buffer.from(
        'data: ' +
          JSON.stringify({
            choices: [
              { delta: { content: '«Мои заявления». Выберите тип справки и отправьте заявление.' } }
            ]
          }) +
          '\n\n'
      );
      const split = bytes.indexOf(Buffer.from('Выберите')) + 1;
      res.write(bytes.subarray(0, split));
      res.write(bytes.subarray(split));
      res.end('data: [DONE]\n\n');
    }, delay);
    res.on('close', () => clearTimeout(timer));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  return {
    baseUrl: `http://127.0.0.1:${port}/v1`,
    origin: `http://127.0.0.1:${port}`,
    close: async () => {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  };
}
