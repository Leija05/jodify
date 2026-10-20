/**
 * JodiFy Jam NTP Clock Synchronization Engine
 * Calculates precision network latency (RTT) and clock offset between
 * the client device and the server/host so all connected friends listen to audio
 * at the exact same millisecond without drift.
 */

import { API_BASE } from '../lib/api';

interface NtpSample {
  rtt: number;
  offset: number;
}

class JamNtpEngine {
  private clockOffset = 0; // Milliseconds to add to client Date.now() to match server
  private lastSyncTime = 0;
  private isSyncing = false;
  private sampleWindow: NtpSample[] = [];

  /**
   * Returns current synchronized time according to calibrated reference clock.
   */
  public now(): number {
    return Date.now() + this.clockOffset;
  }

  public getOffset(): number {
    return this.clockOffset;
  }

  public getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  public getSampleWindow(): NtpSample[] {
    return this.sampleWindow;
  }

  /**
   * Computes the compensated audio position given host's sent position and timestamp.
   * If the host reported position P at timestamp T while playing:
   * Current position = P + (Now_calibrated - T)
   */
  public computeTargetPosition(
    reportedPosition: number,
    sentAtTimestamp?: number,
    isPlaying = true
  ): number {
    if (!isPlaying || !sentAtTimestamp || sentAtTimestamp <= 0) {
      return Math.max(0, reportedPosition);
    }

    const currentServerTime = this.now();
    const elapsedSeconds = Math.max(0, (currentServerTime - sentAtTimestamp) / 1000);

    // Limit maximum runaway extrapolation to 8 seconds
    const clampedElapsed = Math.min(elapsedSeconds, 8);
    return Math.max(0, reportedPosition + clampedElapsed);
  }

  /**
   * Calibrates clock offset via multiple low-latency NTP round-trips.
   */
  public async synchronizeClock(sampleCount = 4): Promise<number> {
    if (this.isSyncing) return this.clockOffset;
    this.isSyncing = true;

    try {
      const samples: NtpSample[] = [];

      for (let i = 0; i < sampleCount; i++) {
        const t0 = Date.now();
        try {
          const res = await fetch(`${API_BASE}/health`, {
            method: 'GET',
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' },
          });

          const t1 = Date.now();
          const rtt = t1 - t0;

          // Check server date header or payload
          const dateHeader = res.headers.get('date');
          const serverTime = dateHeader ? new Date(dateHeader).getTime() : (t0 + t1) / 2;

          const estimatedClientAtServer = t0 + rtt / 2;
          const offset = serverTime - estimatedClientAtServer;

          samples.push({ rtt, offset });
        } catch {
          // If network drop, wait a bit
          await new Promise((r) => setTimeout(r, 60));
        }

        // Small spacing between probes
        await new Promise((r) => setTimeout(r, 80));
      }

      if (samples.length > 0) {
        // Sort by lowest RTT (highest accuracy)
        samples.sort((a, b) => a.rtt - b.rtt);
        // Use best 50% samples
        const bestSamples = samples.slice(0, Math.max(1, Math.ceil(samples.length / 2)));
        const avgOffset = bestSamples.reduce((acc, s) => acc + s.offset, 0) / bestSamples.length;

        this.clockOffset = Math.round(avgOffset);
        this.lastSyncTime = Date.now();
        this.sampleWindow = bestSamples;
      }
    } finally {
      this.isSyncing = false;
    }

    return this.clockOffset;
  }
}

export const jamNtp = new JamNtpEngine();
