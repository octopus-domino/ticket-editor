import { t } from '@/shared/i18n';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Detector {
  detect(video: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
type DetectorClass = new (options: { formats: string[] }) => Detector;

/** Progressive camera scanning: video stays on the device; manual entry remains available. */
export function JourneyScanner({ onCode }: { onCode: (value: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const frame = useRef(0);
  const generation = useRef(0);
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const Detector = (globalThis as unknown as { BarcodeDetector?: DetectorClass }).BarcodeDetector;
  const stop = useCallback(() => {
    generation.current++;
    cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);
  useEffect(() => stop, [stop]);
  async function start() {
    stop();
    const run = generation.current;
    setError('');
    setActive(true);
    try {
      if (!Detector || !navigator.mediaDevices?.getUserMedia)
        throw new Error(
          t(
            'Сканирование в этом браузере недоступно. Откройте QR камерой телефона и вставьте ссылку в поле поиска.',
          ),
        );
      const detector = new Detector({ formats: ['qr_code'] });
      const source = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 10, max: 15 },
        },
        audio: false,
      });
      if (run !== generation.current) {
        source.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = source;
      if (!video.current) throw new Error(t('Не удалось открыть камеру. Введите код вручную.'));
      video.current.srcObject = source;
      await video.current.play();
      async function scan() {
        if (run !== generation.current || !video.current) return;
        try {
          const codes = await detector.detect(video.current);
          if (run !== generation.current) return;
          const code = codes.find((value) => value.rawValue.length <= 2048)?.rawValue;
          if (code) {
            onCode(code);
            stop();
            setActive(false);
            return;
          }
          frame.current = requestAnimationFrame(() => void scan());
        } catch {
          stop();
          setActive(false);
          setError(t('Не удалось прочитать QR. Попробуйте снова или введите код вручную.'));
        }
      }
      void scan();
    } catch (reason) {
      if (run === generation.current) {
        stop();
        setActive(false);
        setError((reason as Error).message);
      }
    }
  }
  return (
    <section>
      <button
        type="button"
        onClick={() => {
          if (active) {
            stop();
            setActive(false);
          } else void start();
        }}
      >
        {active ? t('Закрыть камеру') : t('Сканировать QR камерой')}
      </button>
      <video
        ref={video}
        hidden={!active}
        muted
        playsInline
        style={{ width: '100%', maxWidth: 400 }}
        aria-label={t('Камера для проверки QR')}
      />
      {error && <p role="status">{error}</p>}
    </section>
  );
}
