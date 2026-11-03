/** HTTP session port; infrastructure must not import application stores. */
export interface HttpSession {
  token(): string | null;
  refresh(): Promise<boolean>;
  clear(): void;
}
let session: HttpSession = {
  token: () => null,
  refresh: async () => false,
  clear: () => {},
};
export function configureHttpSession(next: HttpSession): void {
  session = next;
}
export function getHttpSession(): HttpSession {
  return session;
}
