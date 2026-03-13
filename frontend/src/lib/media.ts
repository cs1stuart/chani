export function safeStopTrack(track: MediaStreamTrack): void {
  try {
    if (track.readyState !== "ended") track.stop();
  } catch {
    // ignore AbortError, InvalidStateError, etc.
  }
}

export function isScreenShareTrack(track: MediaStreamTrack): boolean {
  try {
    const settings = track.getSettings();
    const ds = (settings as { displaySurface?: string }).displaySurface;
    return ds === "monitor" || ds === "window" || ds === "browser";
  } catch {
    return false;
  }
}
