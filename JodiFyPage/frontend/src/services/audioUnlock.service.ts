/**
 * JodiFy Proactive AudioContext Unlocker
 * Automatically detects user interaction (click, touch, pointerdown, keydown)
 * and proactively resumes any suspended Web Audio AudioContexts to eliminate
 * unexpected audio silences caused by strict browser autoplay policies.
 */

const registeredContexts = new Set<AudioContext>();
let isUnlocked = false;

export function registerAudioContext(ctx: AudioContext): void {
  registeredContexts.add(ctx);
  if (isUnlocked && ctx.state === 'suspended') {
    ctx.resume().catch(() => undefined);
  }
}

export function unregisterAudioContext(ctx: AudioContext): void {
  registeredContexts.delete(ctx);
}

export async function unlockAllAudioContexts(): Promise<boolean> {
  isUnlocked = true;
  let anyResumed = false;

  for (const ctx of registeredContexts) {
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume();
        anyResumed = true;
      } catch {
        /* best-effort */
      }
    }
  }

  // Also unlock any AudioContext attached to window
  const windowCtx = (window as unknown as { __jodifyAudioContext?: AudioContext }).__jodifyAudioContext;
  if (windowCtx && windowCtx.state === 'suspended') {
    try {
      await windowCtx.resume();
      anyResumed = true;
    } catch {}
  }

  return anyResumed;
}

export function initProactiveAudioUnlock(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const interactionEvents = ['pointerdown', 'touchstart', 'click', 'keydown'] as const;

  const handleInteraction = () => {
    void unlockAllAudioContexts();
  };

  interactionEvents.forEach((evt) => {
    window.addEventListener(evt, handleInteraction, { capture: true, passive: true });
  });

  return () => {
    interactionEvents.forEach((evt) => {
      window.removeEventListener(evt, handleInteraction, { capture: true });
    });
  };
}
