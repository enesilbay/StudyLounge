export function hasLiveVideo(stream: MediaStream | null | undefined) {
  return Boolean(stream?.getVideoTracks().some((track) => track.readyState === 'live' && !track.muted));
}
