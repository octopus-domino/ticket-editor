/** Published bundles must not point at the viewer's computer when a local build environment leaks into Vite. */
export function resolveApiBase(value: string | undefined, production: boolean): string {
  const base = (value ?? '').trim().replace(/\/+$/, '');
  const loopback = /^https?:\/\/(?:localhost|127\.\d+\.\d+\.\d+|\[::1\])(?::|\/|$)/i.test(base);
  return production && loopback ? '' : base;
}
