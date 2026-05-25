declare function GetParentResourceName(): string;

const events: Record<string, (payload: any) => void> = {};

function isDev(): boolean {
  return !import.meta.env.PROD;
}

export async function post<T = any>(event: string, data: any = {}): Promise<T | undefined> {
  if (isDev()) {
    // No mocks; just return a synthetic ok.
    return { ok: true } as unknown as T;
  }
  const url = `https://${GetParentResourceName()}/${event}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(data),
    });
    return (await res.json()) as T;
  } catch (err) {
    console.error('[Nui.post]', event, err);
    return undefined;
  }
}

export function onEvent(type: string, fn: (payload: any) => void) {
  events[type] = fn;
}

export function startNuiListener() {
  window.addEventListener('message', (e: MessageEvent) => {
    const data = e.data;
    if (!data || !data.type) return;
    const fn = events[data.type];
    if (fn) fn(data.payload);
  });
}

const Nui = { post, onEvent, startNuiListener };
export default Nui;
