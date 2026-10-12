import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { ArrowLeft, RotateCw } from 'lucide-react';

/** Bilinmeyen adres. `inApp` iken uygulama düzeninin içinde, değilse tam sayfa gösterilir. */
export default function NotFoundPage({ inApp = false }: { inApp?: boolean }) {
  return (
    <ErrorScreen
      fullPage={!inApp}
      image="bos-sandalye"
      title="Bu masa boş"
      description="Aradığın sayfa yok ya da taşınmış olabilir."
      action={
        <Link to={inApp ? '/app/lobbies' : '/'} className={primaryClass}>
          <ArrowLeft className="h-4 w-4" />
          {inApp ? 'Odalara dön' : 'Ana sayfaya dön'}
        </Link>
      }
    />
  );
}

/** Rota yüklenirken ya da çizilirken oluşan hatalar (react-router `errorElement`). */
export function RouteErrorPage() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  // Yeni sürüm yayınlandıktan sonra eski sayfa parçaları bulunamayabilir; yenilemek çözer.
  const message = error instanceof Error ? error.message : '';
  const staleChunk = /dynamically imported module|Failed to fetch|Importing a module script failed/i.test(message);

  if (import.meta.env.DEV) console.error(error);

  return (
    <ErrorScreen
      fullPage
      image={staleChunk ? 'kum-saati' : 'kahve'}
      title={staleChunk ? 'Uygulama güncellendi' : 'Bir şeyler ters gitti'}
      description={staleChunk ? 'Yeni sürümü yüklemek için sayfayı yenile.' : 'Sayfa beklenmedik bir hatayla karşılaştı. Yenilemek çoğu zaman düzeltir.'}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => window.location.reload()} className={primaryClass}>
            <RotateCw className="h-4 w-4" />
            Sayfayı yenile
          </button>
          <Link to="/app/lobbies" className={secondaryClass}>
            Odalara dön
          </Link>
        </div>
      }
    />
  );
}

const primaryClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] bg-mb-action px-5 text-[15px] font-medium text-mb-on-action shadow-mb-press transition hover:bg-mb-action-2';
const secondaryClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] border border-mb-line bg-mb-card px-5 text-[15px] font-medium text-mb-ink transition hover:bg-mb-surface';

/**
 * Hata ekranı. Rota hatası animasyon sağlayıcısının dışında da çizilebildiği için hareket
 * CSS ile yapılır (sl-yuz); "hareketi azalt" açıkken durur.
 */
function ErrorScreen({ fullPage, image, title, description, action }: { fullPage: boolean; image: string; title: string; description: string; action: React.ReactNode }) {
  return (
    <div className={`sl-yeni grid place-items-center px-5 text-center ${fullPage ? 'min-h-screen bg-mb-surface' : 'py-16'}`}>
      <div className="max-w-md">
        <div className="relative mx-auto w-fit">
          <img src={`/landing/3b/${image}.webp`} alt="" aria-hidden="true" draggable={false} className="relative h-40 w-auto select-none motion-safe:animate-[sl-yuz_6s_ease-in-out_infinite]" />
        </div>
        <h1 className="mt-6 font-mb-display text-[2rem] font-light tracking-[-0.04em] text-mb-ink">{title}</h1>
        <p className="mt-2 text-[15px] text-mb-body">{description}</p>
        <div className="mt-6 flex justify-center">{action}</div>
      </div>
    </div>
  );
}
