try {
  const response = await fetch(`http://127.0.0.1:${process.env.PORT ?? 3000}/health`, {
    signal: AbortSignal.timeout(3000)
  });
  const body = await response.json();
  process.exit(response.ok && body.service === 'deka' && body.status === 'ok' ? 0 : 1);
} catch {
  process.exit(1);
}
