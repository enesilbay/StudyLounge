/**
 * Test ortamında (VITE_APP_ENV=staging) her sayfada görünen küçük etiket.
 * Canlı sitede ve yerel geliştirmede hiç gösterilmez.
 */
export function EnvBadge() {
  if (import.meta.env.VITE_APP_ENV !== 'staging') return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed left-1/2 top-2 z-[60] -translate-x-1/2 rounded-full bg-danger px-3 py-1 text-xs font-semibold text-background shadow-md"
    >
      Test ortamı: buradaki veriler gerçek değil
    </div>
  );
}
