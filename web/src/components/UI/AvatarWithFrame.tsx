

export function getProfileFrameColor(frameId: string | null | undefined) {
  switch (frameId) {
    case 'gold':
      return '#FFC107'; // accent
    case 'emerald':
      return '#10B981'; // success
    case 'ruby':
      return '#EF4444'; // danger
    case 'cosmic':
      return '#7C3AED';
    default:
      return '#E2E8F0'; // border
  }
}

interface AvatarWithFrameProps {
  uri?: string | null;
  name?: string | null;
  frameId?: string | null;
  size?: number;
}

export default function AvatarWithFrame({ uri, name, frameId, size = 48 }: AvatarWithFrameProps) {
  const isActive = Boolean(frameId && frameId !== 'none');
  const borderWidth = isActive ? 3 : 1;
  const frameColor = getProfileFrameColor(frameId);
  const initial = name?.trim()?.charAt(0).toUpperCase() || 'U';

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-softIndigo relative`}
      style={{
        width: size,
        height: size,
        border: `${borderWidth}px solid ${frameColor}`,
        boxShadow: isActive ? `0 4px 10px ${frameColor}50` : 'none',
      }}
    >
      {uri ? (
        <img
          src={uri}
          alt={name || 'Avatar'}
          className="rounded-full object-cover w-full h-full"
        />
      ) : (
        <span
          className="font-black text-primary"
          style={{ fontSize: size * 0.42 }}
        >
          {initial}
        </span>
      )}
    </div>
  );
}
