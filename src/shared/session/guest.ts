/** Guest content belongs to this tab session and never shares account storage. */
let active = false;
try {
  active = sessionStorage.getItem('codoc:guest') === '1';
} catch {
  /* optional storage */
}
const memory = new Map<string, string>();
export function isGuest() {
  return active;
}
export function startGuest() {
  active = true;
  try {
    sessionStorage.setItem('codoc:guest', '1');
  } catch {
    /* memory session */
  }
}
export function endGuest() {
  active = false;
  memory.clear();
  try {
    for (const key of Object.keys(sessionStorage))
      if (key.startsWith('codoc:guest')) sessionStorage.removeItem(key);
  } catch {
    /* optional storage */
  }
}
export function guestRead(key: string): string | null {
  try {
    return sessionStorage.getItem(`codoc:guest:${key}`) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}
export function guestWrite(key: string, value: string) {
  memory.set(key, value);
  try {
    sessionStorage.setItem(`codoc:guest:${key}`, value);
  } catch {
    /* Keep the current session available even if browser storage is full. */
  }
}
export function guestRemove(key: string) {
  memory.delete(key);
  try {
    sessionStorage.removeItem(`codoc:guest:${key}`);
  } catch {
    /* optional storage */
  }
}
