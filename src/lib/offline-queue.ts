interface QueuedSubmission {
  id: string;
  roundId: string;
  content: string;
  queuedAt: number;
}

const QUEUE_KEY = 'mindshare-offline-queue';

function getQueue(): QueuedSubmission[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedSubmission[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueueSubmission(roundId: string, content: string): string {
  const id = crypto.randomUUID();
  const queue = getQueue();
  queue.push({ id, roundId, content, queuedAt: Date.now() });
  saveQueue(queue);
  return id;
}

export function dequeueSubmission(id: string): void {
  saveQueue(getQueue().filter((s) => s.id !== id));
}

export function clearOfflineQueue(): void {
  try { localStorage.removeItem(QUEUE_KEY); } catch { /* best effort */ }
}

export function getQueuedSubmissions(): QueuedSubmission[] {
  return getQueue();
}

export async function flushOfflineQueue(
  send: (roundId: string, content: string) => Promise<boolean>,
): Promise<number> {
  const queue = getQueue();
  if (queue.length === 0) return 0;

  let sent = 0;
  const remaining: QueuedSubmission[] = [];

  for (const sub of queue) {
    if (await send(sub.roundId, sub.content)) {
      sent++;
    } else {
      remaining.push(sub);
    }
  }

  saveQueue(remaining);
  return sent;
}
