import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { delete window.cadesplugin; vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function fixture(valid = true) {
  vi.resetModules();
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
  const certificate = {
    HasPrivateKey: vi.fn(async () => true),
    ValidToDate: Promise.resolve('2099-01-01'),
    Thumbprint: Promise.resolve('ABC'), SubjectName: Promise.resolve('CN=Tester'),
    IsValid: vi.fn(async () => ({ Result: Promise.resolve(valid) })),
  };
  const found = { Count: Promise.resolve(1), Item: vi.fn(async () => certificate) };
  const certificates = { ...found, Find: vi.fn(async () => found) };
  const store = { Open: vi.fn(), Close: vi.fn(), Certificates: Promise.resolve(certificates) };
  const signer = { propset_Certificate: vi.fn(), propset_CheckCertificate: vi.fn() };
  const data = {
    propset_ContentEncoding: vi.fn(), propset_Content: vi.fn(),
    SignCades: vi.fn(async () => btoa('detached-signature')),
  };
  const objects: Record<string, object> = {
    'CAdESCOM.Store': store, 'CAdESCOM.CPSigner': signer, 'CAdESCOM.CadesSignedData': data,
  };
  window.cadesplugin = Object.assign(Promise.resolve(), {
    CreateObjectAsync: vi.fn(async (name: string) => objects[name] as Record<string, unknown>),
  });
  const { CryptoProProvider } = await import('@/features/signing/CryptoProProvider');
  return { provider: new CryptoProProvider(), certificate, certificates, store, signer, data };
}
describe('CryptoPro detached PDF signing', () => {
  it('enumerates usable certificates and signs the exact binary PDF with CAdES-BES', async () => {
    const f = await fixture();
    expect(await f.provider.certificates()).toEqual([{ id: 'ABC', subject: 'CN=Tester', expiresAt: '2099-01-01T00:00:00.000Z' }]);
    const bytes = new Uint8Array([37, 80, 68, 70, 45, 0, 128, 255]);
    const output = await f.provider.sign({ file: new Blob([bytes]), filename: 'generated.pdf', certificateId: 'ABC' });
    expect(f.certificates.Find).toHaveBeenCalledWith(0, 'ABC');
    expect(f.data.propset_ContentEncoding).toHaveBeenCalledWith(1);
    expect(f.data.propset_Content).toHaveBeenCalledWith(btoa(String.fromCharCode(...bytes)));
    expect(f.data.propset_ContentEncoding.mock.invocationCallOrder[0]).toBeLessThan(f.data.propset_Content.mock.invocationCallOrder[0]);
    expect(f.signer.propset_Certificate).toHaveBeenCalledWith(f.certificate);
    expect(f.signer.propset_CheckCertificate).toHaveBeenCalledWith(true);
    expect(f.data.SignCades).toHaveBeenCalledWith(f.signer, 1, true);
    expect(output.filename).toBe('generated.pdf.sig');
    expect(output.signature.type).toBe('application/pkcs7-signature');
    expect(await new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(output.signature); })).toBe('detached-signature');
    expect(f.store.Close).toHaveBeenCalledTimes(2);
  });
  it('never signs with an invalid certificate and closes the store', async () => {
    const f = await fixture(false);
    await expect(f.provider.sign({ file: new Blob(['%PDF']), filename: 'x.pdf', certificateId: 'ABC' })).rejects.toThrow();
    expect(f.data.SignCades).not.toHaveBeenCalled();
    expect(f.store.Close).toHaveBeenCalledOnce();
  });
  it('propagates plugin cancellation without reporting success', async () => {
    const f = await fixture();
    f.data.SignCades.mockRejectedValueOnce(new Error('User cancelled'));
    await expect(f.provider.sign({ file: new Blob(['%PDF']), filename: 'x.pdf', certificateId: 'ABC' })).rejects.toThrow('User cancelled');
    expect(f.store.Close).toHaveBeenCalledOnce();
  });
});
