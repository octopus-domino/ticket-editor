interface NativeMessage { postMessage(message: string): void; onmessage?: (event: { data: string }) => void; }
interface IOSMessage { postMessage(message: Record<string, unknown>): Promise<Record<string, unknown>>; }
declare global { interface Window { CoDocNative?: NativeMessage; webkit?: { messageHandlers?: { CoDocNative?: IOSMessage } }; } }
export function isNativeApp() { return typeof window !== 'undefined' && Boolean(window.CoDocNative || window.webkit?.messageHandlers?.CoDocNative); }
const pending = new Map<string, { resolve: (result: Record<string, unknown>) => void; reject: (reason: Error) => void }>();
let listening = false;
export async function nativeRequest(type: 'capabilities' | 'biometric', payload: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  if (location.origin !== 'https://codoc.site') throw new Error('Native capabilities require the trusted CoDoc origin');
  const ios = window.webkit?.messageHandlers?.CoDocNative;
  if (ios) return ios.postMessage({ type, ...payload });
  const bridge = window.CoDocNative;
  if (!bridge) throw new Error('Native integration unavailable');
  if (!listening) {
    listening = true;
    bridge.onmessage = (event) => {
      try { const message = JSON.parse(event.data) as { id: string; result: Record<string, unknown> }; const request = pending.get(message.id); if (!request) return; pending.delete(message.id); if (message.result.error) request.reject(new Error(String(message.result.error))); else request.resolve(message.result); } catch { /* Reject unsolicited malformed replies. */ }
    };
  }
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const timeout = window.setTimeout(() => { pending.delete(id); reject(new Error('Native request timed out')); }, 60_000);
    pending.set(id, { resolve: (value) => { clearTimeout(timeout); resolve(value); }, reject: (error) => { clearTimeout(timeout); reject(error); } });
    bridge.postMessage(JSON.stringify({ id, type, ...payload }));
  });
}
