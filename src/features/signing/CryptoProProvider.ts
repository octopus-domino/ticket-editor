import type { SigningCertificate, SigningInput, SigningOutput, SigningProvider } from './providers';
import { t } from '@/shared/i18n';

// The official async SDK deliberately returns automation objects with asynchronous properties.
interface Automation {
  [key: string]: unknown;
}
interface CryptoProPlugin extends PromiseLike<unknown> {
  CreateObjectAsync(name: string): Promise<Automation>;
  ReleasePluginObjects?(): Promise<void>;
}
declare global {
  interface Window {
    cadesplugin?: CryptoProPlugin;
  }
}
async function call(object: Automation, method: string, ...args: unknown[]): Promise<Automation> {
  const member = object[method];
  if (typeof member !== 'function') throw new Error(t('Unsupported signing plugin version'));
  return (await member.apply(object, args)) as Automation;
}
async function value<T>(object: Automation, key: string): Promise<T> {
  return (await object[key]) as T;
}
async function base64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
let loading: Promise<{ api: CryptoProPlugin }> | null = null;
export function loadCryptoPro(): Promise<{ api: CryptoProPlugin }> {
  if (loading) return loading;
  loading = (async () => {
    if (!window.isSecureContext) throw new Error(t('Electronic signing requires HTTPS'));
    if (!window.cadesplugin)
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/vendor/cadesplugin_api.js';
        script.onload = () => resolve();
        script.onerror = () => {
          script.remove();
          reject(
            new Error(
              t(
                'Install CryptoPro CSP and the browser plugin. The official SDK must be configured by the administrator.',
              ),
            ),
          );
        };
        document.head.appendChild(script);
      });
    const plugin = window.cadesplugin;
    if (!plugin) throw new Error(t('CryptoPro plugin is unavailable'));
    await Promise.race([
      Promise.resolve(plugin),
      new Promise((_, reject) =>
        window.setTimeout(
          () => reject(new Error(t('Signing plugin connection timed out'))),
          20_000,
        ),
      ),
    ]);
    return { api: plugin };
  })().catch((error) => {
    loading = null;
    throw error;
  });
  return loading;
}
export class CryptoProProvider implements SigningProvider {
  async certificates(): Promise<SigningCertificate[]> {
    const { api: plugin } = await loadCryptoPro(),
      store = await plugin.CreateObjectAsync('CAdESCOM.Store');
    try {
      await call(store, 'Open', 2, 'My', 2);
      const certificates = await value<Automation>(store, 'Certificates'),
        count = await value<number>(certificates, 'Count');
      const result: SigningCertificate[] = [];
      for (let index = 1; index <= count; index++) {
        const cert = await call(certificates, 'Item', index);
        if (!(await call(cert, 'HasPrivateKey'))) continue;
        const expiresAt = new Date(await value<string>(cert, 'ValidToDate')).toISOString();
        if (Date.parse(expiresAt) <= Date.now()) continue;
        result.push({
          id: await value<string>(cert, 'Thumbprint'),
          subject: await value<string>(cert, 'SubjectName'),
          expiresAt,
        });
      }
      return result;
    } finally {
      await call(store, 'Close');
    }
  }
  async sign(input: SigningInput): Promise<SigningOutput> {
    if (!input.file.size || input.file.size > 20 * 1024 * 1024)
      throw new Error(t('Select a file up to 20 MB'));
    const { api: plugin } = await loadCryptoPro(),
      store = await plugin.CreateObjectAsync('CAdESCOM.Store');
    try {
      await call(store, 'Open', 2, 'My', 2);
      const all = await value<Automation>(store, 'Certificates');
      const found = await call(all, 'Find', 0, input.certificateId);
      if (!(await value<number>(found, 'Count'))) throw new Error(t('Certificate not found'));
      const certificate = await call(found, 'Item', 1);
      const validation = await call(certificate, 'IsValid');
      if (!(await value<boolean>(validation, 'Result')))
        throw new Error(t('Certificate validation failed'));
      const signer = await plugin.CreateObjectAsync('CAdESCOM.CPSigner');
      await call(signer, 'propset_Certificate', certificate);
      await call(signer, 'propset_CheckCertificate', true);
      const data = await plugin.CreateObjectAsync('CAdESCOM.CadesSignedData');
      await call(data, 'propset_ContentEncoding', 1);
      await call(data, 'propset_Content', await base64(input.file));
      const encoded = (await call(data, 'SignCades', signer, 1, true)) as unknown as string;
      const bytes = Uint8Array.from(atob(encoded.replace(/\s/g, '')), (char) => char.charCodeAt(0));
      return {
        signature: new Blob([bytes], { type: 'application/pkcs7-signature' }),
        filename: `${input.filename}.sig`,
        format: 'CAdES-BES',
      };
    } finally {
      await call(store, 'Close');
    }
  }
}
