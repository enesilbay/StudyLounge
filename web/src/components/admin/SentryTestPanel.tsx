import { useState } from 'react';
import { Bug, Server } from 'lucide-react';
import { api } from '../../lib/api';
import { sentryEnabled } from '../../lib/sentry';
import { Button, Notice } from '../ui';

type Result = { tone: 'success' | 'danger'; text: string } | null;

/**
 * Hata takibinin (Sentry) uçtan uca çalıştığını doğrulamak için kasıtlı test hataları.
 * Hatalar Sentry'de "Sentry test hatası" başlığıyla görünür.
 */
export default function SentryTestPanel() {
  const [result, setResult] = useState<Result>(null);
  const [sending, setSending] = useState(false);

  const sendServerError = async () => {
    setSending(true);
    setResult(null);
    try {
      await api.post('/admin/diagnostics/sentry-test');
      setResult({ tone: 'danger', text: 'Sunucu hata döndürmedi; test ucu beklenmedik biçimde başarılı oldu.' });
    } catch {
      // Beklenen: uç kasıtlı olarak 500 döndürür ve hatayı Sentry'ye bildirir.
      setResult({ tone: 'success', text: 'Sunucu test hatası gönderildi. Sentry\'de studylounge-backend projesinde görünmeli.' });
    } finally {
      setSending(false);
    }
  };

  const sendBrowserError = () => {
    setResult(null);
    // Yakalanmamış hata olarak fırlatılır; tarayıcının genel hata yakalayıcısı Sentry'ye iletir.
    window.setTimeout(() => {
      throw new Error(`Sentry test hatası (web) ${new Date().toISOString()}`);
    });
    setResult({ tone: 'success', text: 'Tarayıcı test hatası gönderildi. Sentry\'de studylounge-web projesinde görünmeli.' });
  };

  return (
    <details className="group rounded-[14px] border border-mb-line px-5 py-4 text-sm text-mb-body">
      <summary className="cursor-pointer font-semibold text-mb-ink">Hata takibini dene</summary>
      <div className="mt-3 max-w-3xl space-y-3">
        <p className="leading-6">
          Kasıtlı bir test hatası gönderir. Hata birkaç saniye içinde Sentry'de "Sentry test hatası" başlığıyla görünmelidir.
          {sentryEnabled ? null : ' Bu ortamda tarayıcı tarafında hata takibi kapalı (yalnızca canlı ve test sitesinde açık).'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={Server} loading={sending} onClick={() => void sendServerError()}>
            Sunucu hatası gönder
          </Button>
          <Button variant="secondary" size="sm" icon={Bug} disabled={!sentryEnabled} onClick={sendBrowserError}>
            Tarayıcı hatası gönder
          </Button>
        </div>
        {result ? <Notice tone={result.tone}>{result.text}</Notice> : null}
      </div>
    </details>
  );
}
