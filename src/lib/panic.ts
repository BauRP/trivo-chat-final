// Emergency Wipe ("Panic Trigger") — clears all data and reverts to dummy state
import { nukeAllData } from "./storage";
import { destroyPeer } from "./p2p";
import { stopNetworkNoise } from "./stealth";

let panicActive = false;

/**
 * Execute emergency wipe:
 * 1. Kill P2P connections
 * 2. Stop noise generator
 * 3. Nuke all IndexedDB + localStorage
 * 4. Reload into clean state
 */
export async function executePanic(): Promise<void> {
  if (panicActive) return;
  panicActive = true;

  try {
    // Kill all active connections
    destroyPeer();
    stopNetworkNoise();

    // Wipe all stored data
    await nukeAllData();

    // Hard reload to clean state
    window.location.replace("/");
  } catch {
    // Force reload even if cleanup fails
    window.location.replace("/");
  }
}

/**
 * Long-press detector for panic trigger.
 * Attach to any non-obvious element (e.g., app logo or clock area).
 * Requires holding for 3 seconds.
 */
export function createPanicLongPress(onPanic: () => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const HOLD_DURATION = 3000;

  const start = () => {
    timer = setTimeout(() => {
      onPanic();
    }, HOLD_DURATION);
  };

  const cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchCancel: cancel,
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
  };
}
