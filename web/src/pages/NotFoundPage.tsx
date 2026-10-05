import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { Button, LampMark } from '../components/ui';

/** Bilinmeyen adres. `inApp` iken uygulama düzeninin içinde, değilse tam sayfa gösterilir. */
export default function NotFoundPage({ inApp = false }: { inApp?: boolean }) {
  return (
    <ErrorScreen
      fullPage={!inApp}
      title="Bu masa boş"
      description="Aradığın sayfa yok ya da taşınmış olabilir."
      action={
        <Link to={inApp ? '/app/lobbies' : '/'}>
          <Button>{inApp ? 'Odalara dön' : 'Ana sayfaya dön'}</Button>
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
      title={staleChunk ? 'Uygulama güncellendi' : 'Bir şeyler ters gitti'}
      description={staleChunk ? 'Yeni sürümü yüklemek için sayfayı yenile.' : 'Sayfa beklenmedik bir hatayla karşılaştı. Yenilemek çoğu zaman düzeltir.'}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => window.location.reload()}>Sayfayı yenile</Button>
          <Link to="/app/lobbies">
            <Button variant="secondary">Odalara dön</Button>
          </Link>
        </div>
      }
    />
  );
}

function ErrorScreen({ fullPage, title, description, action }: { fullPage: boolean; title: string; description: string; action: React.ReactNode }) {
  return (
    <div className={`grid place-items-center px-5 text-center ${fullPage ? 'min-h-screen bg-background' : 'py-20'}`}>
      <div className="max-w-md">
        <LampMark lit={false} className="mx-auto h-14 w-14 text-textMuted" />
        <h1 className="mt-5 text-3xl text-textDark">{title}</h1>
        <p className="mt-2 text-base text-textMuted">{description}</p>
        <div className="mt-6">{action}</div>
      </div>
    </div>
  );
}
