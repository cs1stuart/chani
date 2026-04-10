import type { UserSettings } from "@/types";

export type NotificationPrefs = NonNullable<UserSettings["notifications"]>;

const DEFAULT_PREFS: NotificationPrefs = {
  messages_enabled: true,
  message_tone: "message_tune",
  message_vibrate: true,
  message_popup: true,
  group_enabled: true,
  group_tone: "message_tune",
  group_vibrate: true,
  call_ringtone: "message_tune",
  call_vibrate: true,
};

/** API / JSON sometimes omits keys or sends strings; keeps vibrate vs tone logic reliable. */
function coerceBool(v: unknown, fallback: boolean): boolean {
  if (v === true || v === "true" || v === 1) return true;
  if (v === false || v === "false" || v === 0) return false;
  return fallback;
}

export function mergeNotificationPrefs(
  patch?: Partial<NotificationPrefs>,
): NotificationPrefs {
  const base: NotificationPrefs = { ...DEFAULT_PREFS, ...patch };
  const d = DEFAULT_PREFS;
  return {
    ...base,
    messages_enabled: coerceBool(base.messages_enabled, d.messages_enabled ?? true),
    message_vibrate: coerceBool(base.message_vibrate, d.message_vibrate ?? true),
    message_popup: coerceBool(base.message_popup, d.message_popup ?? true),
    group_enabled: coerceBool(base.group_enabled, d.group_enabled ?? true),
    group_vibrate: coerceBool(base.group_vibrate, d.group_vibrate ?? true),
    call_vibrate: coerceBool(base.call_vibrate, d.call_vibrate ?? true),
  };
}

/** Legacy API stored `"default"`; treat as WorkChat tune. */
export function normalizeToneId(id: string | undefined): string {
  if (!id || id === "default") return "message_tune";
  return id;
}

const TONE_URLS: Record<string, string> = {
  message_tune: "/message_tune.mp3",
  mixkit_bell: "/sounds/mixkit-bell.mp3",
  mixkit_alert: "/sounds/mixkit-alert.mp3",
  mixkit_message: "/sounds/mixkit-message.mp3",
};

/** Played when Message/Group "Vibrate" is ON (instead of the selected tone). */
const VIBRATE_TONE_CANDIDATES = ["/viberate-tone.mp3", "/vibrate-tone.mp3"];

const NOTIFICATION_PREFS_STORAGE_KEY = "workchat_notification_prefs";

/** Persist merged prefs so incoming messages never use a stale ref overwritten by a slow /api/settings response. */
export function persistNotificationPrefsForPlayback(prefs: NotificationPrefs): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NOTIFICATION_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function clearNotificationPrefsStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(NOTIFICATION_PREFS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Prefer localStorage (last saved) over in-memory ref for playback / popups. */
export function readNotificationPrefsForPlayback(fallback: NotificationPrefs): NotificationPrefs {
  if (typeof window === "undefined") return mergeNotificationPrefs(fallback);
  try {
    const s = localStorage.getItem(NOTIFICATION_PREFS_STORAGE_KEY);
    if (s) return mergeNotificationPrefs(JSON.parse(s) as Partial<NotificationPrefs>);
  } catch {
    /* ignore */
  }
  return mergeNotificationPrefs(fallback);
}

/** Dedicated playback so this never shares the tone cache with Bell / other tones. */
export function playVibrateToneSound(volume = 0.88): void {
  if (typeof window === "undefined") return;
  const tryPlay = (index: number) => {
    if (index >= VIBRATE_TONE_CANDIDATES.length) return;
    try {
      const a = new Audio(VIBRATE_TONE_CANDIDATES[index]);
      a.volume = volume;
      a.addEventListener(
        "error",
        () => {
          tryPlay(index + 1);
        },
        { once: true },
      );
      void a.play().catch(() => tryPlay(index + 1));
    } catch {
      tryPlay(index + 1);
    }
  };
  tryPlay(0);
}

const SYNTH_IDS = new Set([
  "synth_chime",
  "synth_double",
  "synth_minimal",
  "synth_call",
]);

const audioCache = new Map<string, HTMLAudioElement>();

function getOrCreateAudio(src: string): HTMLAudioElement {
  let a = audioCache.get(src);
  if (!a) {
    a = new Audio(src);
    a.preload = "auto";
    audioCache.set(src, a);
  }
  return a;
}

function playUrl(url: string, volume: number): void {
  try {
    const a = getOrCreateAudio(url);
    a.loop = false;
    a.volume = volume;
    a.currentTime = 0;
    void a.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

function playSynthTone(kind: string): void {
  try {
    const AC = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    const g = ctx.createGain();
    g.connect(ctx.destination);
    const peak = 0.14;
    g.gain.setValueAtTime(peak, now);

    if (kind === "synth_chime") {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.setValueAtTime(freq, now + i * 0.07);
        o.connect(g);
        o.start(now + i * 0.07);
        o.stop(now + i * 0.07 + 0.18);
      });
      g.gain.exponentialRampToValueAtTime(0.02, now + 0.55);
    } else if (kind === "synth_double") {
      [440, 554.37].forEach((freq, i) => {
        const o = ctx.createOscillator();
        o.type = "triangle";
        o.frequency.setValueAtTime(freq, now + i * 0.11);
        o.connect(g);
        o.start(now + i * 0.11);
        o.stop(now + i * 0.11 + 0.14);
      });
      g.gain.exponentialRampToValueAtTime(0.02, now + 0.42);
    } else if (kind === "synth_minimal") {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(880, now);
      o.connect(g);
      o.start(now);
      o.stop(now + 0.07);
      g.gain.exponentialRampToValueAtTime(0.02, now + 0.09);
    } else if (kind === "synth_call") {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(440, now);
      o.connect(g);
      o.start(now);
      o.stop(now + 0.22);
      g.gain.exponentialRampToValueAtTime(0.02, now + 0.26);
    } else {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(800, now);
      o.connect(g);
      o.start(now);
      o.stop(now + 0.06);
      g.gain.exponentialRampToValueAtTime(0.02, now + 0.08);
    }

    void ctx.resume?.();
    setTimeout(() => {
      try {
        ctx.close();
      } catch {
        /* ignore */
      }
    }, 900);
  } catch {
    /* ignore */
  }
}

/** Short buzz–pause–buzz (common for chat alerts; needs Vibration API, mostly Android / some mobile browsers). */
const MESSAGE_HAPTIC_PATTERN_MS = [160, 70, 160, 70, 280];

export function triggerMessageNotificationHaptic(): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(MESSAGE_HAPTIC_PATTERN_MS);
  } catch {
    /* ignore */
  }
}

/** Preview or play a single notification by tone id (ignores master toggles). */
export function playToneById(toneId: string, volume = 0.82): void {
  const id = normalizeToneId(toneId);
  if (id === "none") return;
  if (SYNTH_IDS.has(id)) {
    playSynthTone(id);
    return;
  }
  const url = TONE_URLS[id];
  if (url) {
    playUrl(url, volume);
    return;
  }
  playUrl(TONE_URLS.message_tune, volume);
}

export function playIncomingMessageSound(
  prefs: NotificationPrefs,
  opts: { isGroup: boolean },
): void {
  const p = mergeNotificationPrefs(prefs);
  if (opts.isGroup) {
    if (!p.group_enabled) return;
    if (p.group_vibrate) {
      playVibrateToneSound(0.88);
      triggerMessageNotificationHaptic();
    } else {
      const tid = normalizeToneId(p.group_tone);
      if (tid !== "none") playToneById(tid);
    }
  } else {
    if (!p.messages_enabled) return;
    if (p.message_vibrate) {
      playVibrateToneSound(0.88);
      triggerMessageNotificationHaptic();
    } else {
      const tid = normalizeToneId(p.message_tone);
      if (tid !== "none") playToneById(tid);
    }
  }
}

let callRingAudio: HTMLAudioElement | null = null;
let callRingInterval: ReturnType<typeof setInterval> | null = null;

export function stopIncomingCallRingtone(): void {
  if (callRingInterval) {
    clearInterval(callRingInterval);
    callRingInterval = null;
  }
  if (callRingAudio) {
    try {
      callRingAudio.pause();
      callRingAudio.loop = false;
      callRingAudio.currentTime = 0;
    } catch {
      /* ignore */
    }
    callRingAudio = null;
  }
}

export function startIncomingCallRingtone(prefs: NotificationPrefs): void {
  stopIncomingCallRingtone();
  const p = mergeNotificationPrefs(prefs);
  const id = normalizeToneId(p.call_ringtone);

  if (p.call_vibrate) {
    try {
      navigator.vibrate?.([200, 100, 200, 100, 200]);
    } catch {
      /* ignore */
    }
  }

  if (id === "none") {
    if (p.call_vibrate) {
      callRingInterval = setInterval(() => {
        try {
          navigator.vibrate?.([220, 90, 220, 90, 280]);
        } catch {
          /* ignore */
        }
      }, 2800);
    }
    return;
  }

  if (SYNTH_IDS.has(id)) {
    const playBurst = () => {
      if (id === "synth_double") {
        playSynthTone("synth_double");
        setTimeout(() => playSynthTone("synth_double"), 400);
      } else if (id === "synth_call" || id === "synth_minimal") {
        playSynthTone("synth_call");
        setTimeout(() => playSynthTone("synth_call"), 320);
      } else {
        playSynthTone(id);
      }
    };
    playBurst();
    callRingInterval = setInterval(playBurst, 2800);
    return;
  }

  const url = TONE_URLS[id] || TONE_URLS.message_tune;
  try {
    callRingAudio = new Audio(url);
    callRingAudio.loop = true;
    callRingAudio.volume = 0.72;
    void callRingAudio.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

export const MESSAGE_TONE_OPTIONS = [
  { id: "none", label: "None" },
  { id: "message_tune", label: "WorkChat tune" },
  { id: "mixkit_bell", label: "Bell (Mixkit)" },
  { id: "mixkit_alert", label: "Pop alert (Mixkit)" },
  { id: "mixkit_message", label: "Message pop (Mixkit)" },
  { id: "synth_chime", label: "Soft chime" },
  { id: "synth_double", label: "Double tone" },
  { id: "synth_minimal", label: "Minimal beep" },
] as const;

export const CALL_RINGTONE_OPTIONS = [
  { id: "none", label: "None (vibrate only)" },
  { id: "message_tune", label: "WorkChat tune" },
  { id: "mixkit_bell", label: "Bell (Mixkit)" },
  { id: "mixkit_alert", label: "Pop alert (Mixkit)" },
  { id: "mixkit_message", label: "Message pop (Mixkit)" },
  { id: "synth_double", label: "Classic phone (synth)" },
  { id: "synth_chime", label: "Chime repeat (synth)" },
  { id: "synth_minimal", label: "Short beep repeat" },
] as const;
