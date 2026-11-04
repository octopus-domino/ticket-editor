import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLocale, useLocale, t } from '@/shared/i18n';
import { suggestedRegion, type SigningCertificate, type SigningRegion } from './providers';
import { CryptoProProvider } from './CryptoProProvider';
import { downloadFile } from '@/shared/files/download';
import { isNativeApp, nativeRequest } from '@/shared/mobile/native';
import { useStore } from '@/shared/store/store';
import { generationStore } from '@/features/generation/state/GenerationStore';
import { generatedSigningDocuments, type GeneratedSigningDocument } from './generatedDocuments';

const cryptoPro = new CryptoProProvider();
export function SigningPage() {
  const locale = useLocale();
  const [region, setRegion] = useState<SigningRegion>(() => suggestedRegion(getLocale()));
  const result = useStore(generationStore, (state) => state.result);
  const [documents, setDocuments] = useState<GeneratedSigningDocument[]>([]);
  const [documentId, setDocumentId] = useState(''),
    [preparing, setPreparing] = useState(false);
  const file = documents.find((document) => document.id === documentId)?.file ?? null;
  const [fingerprint, setFingerprint] = useState('');
  const [certificates, setCertificates] = useState<SigningCertificate[]>([]),
    [certificateId, setCertificateId] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [completed, setCompleted] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [capabilities, setCapabilities] = useState<Record<string, unknown> | null>(null);
  const [biometricConfirmed, setBiometricConfirmed] = useState(false);
  useEffect(() => {
    let active = true;
    setDocuments([]);
    setDocumentId('');
    setError('');
    if (result) {
      setPreparing(true);
      void generatedSigningDocuments(result)
        .then((list) => {
          if (active) {
            setDocuments(list);
            setDocumentId(list[0]?.id ?? '');
          }
        })
        .catch((reason: Error) => {
          if (active) setError(reason.message);
        })
        .finally(() => {
          if (active) setPreparing(false);
        });
    } else setPreparing(false);
    return () => {
      active = false;
    };
  }, [result]);
  useEffect(() => {
    if (isNativeApp())
      void nativeRequest('capabilities')
        .then(setCapabilities)
        .catch((reason: Error) => setError(reason.message));
  }, []);
  useEffect(() => {
    let active = true;
    setCompleted(false);
    setConfirmed(false);
    setFingerprint('');
    if (file)
      void file
        .arrayBuffer()
        .then((bytes) => crypto.subtle.digest('SHA-256', bytes))
        .then((hash) => {
          if (active)
            setFingerprint(
              Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join(
                '',
              ),
            );
        })
        .catch((reason: Error) => {
          if (active) setError(reason.message);
        });
    return () => {
      active = false;
    };
  }, [file]);
  async function connect() {
    setError('');
    setBusy(true);
    try {
      const list = await cryptoPro.certificates();
      setCertificates(list);
      setCertificateId(list[0]?.id ?? '');
      if (!list.length) setError(t('No usable certificates with private keys were found'));
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function sign() {
    if (!file || !confirmed || !certificateId) return;
    setBusy(true);
    setError('');
    try {
      const result = await cryptoPro.sign({ file, filename: file.name, certificateId });
      downloadFile(result.signature, result.filename);
      setCompleted(true);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  void locale;
  return (
    <main className="signing-page">
      <h1>{t('Electronic signature')}</h1>
      <p>
        {t(
          'Sign the finished PDF generated in CoDoc. The original file is passed unchanged to the signing provider.',
        )}
      </p>
      {!result && (
        <section>
          <h2>{t('Generate a document first')}</h2>
          <p>{t('Open Generation, create PDF or PDF/A and choose Sign next to the result.')}</p>
          <Link to="/app/generate">{t('Generate documents')} →</Link>
        </section>
      )}
      {preparing && <p role="status">{t('Preparing generated documents…')}</p>}
      {documents.length > 0 && (
        <section className="signing-source">
          <h2>{t('Generated document')}</h2>
          <label>
            {t('Document to sign')}
            <select
              disabled={busy}
              value={documentId}
              onChange={(event) => {
                setDocumentId(event.target.value);
                setConfirmed(false);
                setCompleted(false);
              }}
            >
              {documents.map((document) => (
                <option value={document.id} key={document.id}>
                  {document.file.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              if (file) downloadFile(file, file.name);
            }}
          >
            {t('Review generated PDF')}
          </button>
          {result && result.failed > 0 && (
            <p role="alert">
              {t('Some documents failed to generate. Review the generation errors before signing.')}
            </p>
          )}
        </section>
      )}
      <p>
        {t(
          'Choose the legal jurisdiction and signing provider. Interface language is only a suggested default.',
        )}
      </p>
      <label>
        {t('Jurisdiction')}
        <select
          disabled={busy}
          value={region}
          onChange={(event) => {
            setRegion(event.target.value as SigningRegion);
            setCertificates([]);
            setCertificateId('');
            setCompleted(false);
          }}
        >
          <option value="RU">{t('Russia')}</option>
          <option value="EU">{t('European Union')}</option>
          <option value="CN">{t('China')}</option>
          <option value="OTHER">{t('Other country')}</option>
        </select>
      </label>
      <p>
        {t(
          'Legal effect depends on the certificate, provider and applicable law. A stamp image or biometric unlock is not an electronic signature.',
        )}
      </p>
      {capabilities && (
        <section>
          <h2>{t('Mobile signing')}</h2>
          <p>
            NFC: {t(capabilities.nfc ? 'Available' : 'Unavailable')} · {t('Biometrics')}:{' '}
            {t(capabilities.biometrics ? 'Available' : 'Unavailable')}
          </p>
          <button
            type="button"
            disabled={!capabilities.biometrics || busy}
            onClick={() => {
              setBusy(true);
              void nativeRequest('biometric', { reason: t('Confirm access to signing') })
                .then((result) => setBiometricConfirmed(result.authenticated === true))
                .catch((reason: Error) => setError(reason.message))
                .finally(() => setBusy(false));
            }}
          >
            {t('Confirm with biometrics')}
          </button>
          {biometricConfirmed && (
            <p role="status">
              {t('Identity confirmation completed. The document has not been signed.')}
            </p>
          )}
          <p>
            {t(
              'NFC signing requires a connected certified token provider. Reading a card identifier does not sign a document.',
            )}
          </p>
        </section>
      )}
      {file && (
        <p>
          {file.name} · {file.size.toLocaleString(locale)} {t('bytes')}
        </p>
      )}
      {fingerprint && (
        <p style={{ overflowWrap: 'anywhere' }}>
          SHA-256: <code>{fingerprint}</code>
        </p>
      )}
      {region === 'RU' ? (
        <section>
          <h2>{t('CryptoPro certificate')}</h2>
          <p>
            {t(
              'Requires CryptoPro CSP, the browser extension and a valid certificate. On a phone, use a supported remote signing provider or NFC token SDK.',
            )}
          </p>
          <button type="button" disabled={busy} onClick={() => void connect()}>
            {t('Connect certificate')}
          </button>
          {certificates.length > 0 && (
            <label>
              {t('Certificate')}
              <select
                disabled={busy}
                value={certificateId}
                onChange={(event) => {
                  setCertificateId(event.target.value);
                  setConfirmed(false);
                }}
              >
                {certificates.map((cert) => (
                  <option key={cert.id} value={cert.id}>
                    {cert.subject} · {cert.expiresAt.slice(0, 10)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            {t('I reviewed this document and authorize signing with the selected certificate.')}
          </label>
          <button
            type="button"
            disabled={busy || !file || !certificateId || !confirmed || !fingerprint}
            onClick={() => void sign()}
          >
            {t(busy ? 'Signing…' : 'Sign document')}
          </button>
        </section>
      ) : (
        <section role="status">
          <h2>{t('Trusted signing provider required')}</h2>
          <p>
            {t(
              'This jurisdiction is not connected yet. The administrator must configure a trusted provider and certificate validation before signing is enabled.',
            )}
          </p>
        </section>
      )}
      {error && <p role="alert">{error}</p>}
      {completed && (
        <p role="status">
          {t(
            'Detached signature downloaded. Keep the original PDF unchanged and share both files. Certificate qualification must be verified by the receiving service.',
          )}
        </p>
      )}
      <Link to="/app/generate">← {t('Generate documents')}</Link>
    </main>
  );
}
