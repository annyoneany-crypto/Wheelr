/**
 * The sounds used when the user has not uploaded their own: a tick for every
 * slice that passes the pointer while the wheel spins, and a short fanfare for
 * the winner.
 *
 * Both are synthesised with the Web Audio API instead of shipped as files, so
 * there is nothing to download (the Android app stays fully offline) and the
 * ticks can follow the wheel exactly: every crossing is computed up front from
 * the same easing curve the CSS transition uses, then scheduled on the audio
 * clock, which keeps them in time even when the main thread is busy.
 */

/** Must match the spin transition in the wheel templates. */
export const SPIN_EASING: [number, number, number, number] = [0.15, 0, 0.15, 1];
/** Ticks closer than this are dropped: on big wheels they would merge into a buzz. */
const MIN_TICK_GAP_MS = 38;
/** The pointer sits at 270° in the angle convention the winner maths uses. */
const POINTER_ANGLE = 270;

type AudioContextConstructor = typeof AudioContext;

export class DefaultSoundPlayer {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private spinNodes: AudioScheduledSourceNode[] = [];

  /**
   * By default the player owns an AudioContext wired to the speakers. The
   * winner clip passes its own context and a recording node instead, so the
   * same ticks and fanfare end up in the video's audio track.
   */
  constructor(private readonly output?: { context: AudioContext; destination: AudioNode }) {}

  /**
   * Schedules one tick per slice boundary crossing between two rotations.
   * `fromDeg`/`toDeg` are the CSS rotations at the start and end of the spin.
   */
  playSpin(fromDeg: number, toDeg: number, durationMs: number, sliceCount: number): void {
    const audio = this.ensureContext();
    if (!audio || durationMs <= 0) {
      return;
    }

    this.stopSpin();

    // A wheel with one or two names would barely tick; treat it as having pegs.
    const sliceDeg = 360 / Math.max(sliceCount, 8);
    const start = audio.context.currentTime + 0.02;
    const stepMs = 4;
    let lastSlice = Math.floor((fromDeg - POINTER_ANGLE) / sliceDeg);
    let lastTickMs = -Infinity;

    for (let elapsed = stepMs; elapsed <= durationMs; elapsed += stepMs) {
      const progress = easeCubicBezier(elapsed / durationMs, SPIN_EASING);
      const rotation = fromDeg + (toDeg - fromDeg) * progress;
      const slice = Math.floor((rotation - POINTER_ANGLE) / sliceDeg);

      if (slice !== lastSlice) {
        lastSlice = slice;
        if (elapsed - lastTickMs >= MIN_TICK_GAP_MS) {
          lastTickMs = elapsed;
          this.spinNodes.push(...this.tick(audio.context, audio.master, start + elapsed / 1000));
        }
      }
    }
  }

  /** Silences any ticks still scheduled (the spin was interrupted). */
  stopSpin(): void {
    for (const node of this.spinNodes) {
      try {
        node.stop();
      } catch {
        // Already finished.
      }
    }
    this.spinNodes = [];
  }

  /** A rising arpeggio into a bright major chord, with a few sparkles on top. */
  playWinner(): void {
    const audio = this.ensureContext();
    if (!audio) {
      return;
    }

    const { context, master } = audio;
    const t0 = context.currentTime + 0.03;
    const G4 = 392;
    const C5 = 523.25;
    const E5 = 659.25;
    const G5 = 783.99;
    const C6 = 1046.5;

    [G4, C5, E5].forEach((freq, i) => this.note(context, master, freq, t0 + i * 0.11, 0.14, 0.22));
    this.note(context, master, G5, t0 + 0.33, 0.3, 0.24);
    for (const freq of [C5, E5, G5, C6]) {
      this.note(context, master, freq, t0 + 0.62, 1.3, 0.13);
    }
    [2093, 2637, 3136, 4186].forEach((freq, i) =>
      this.note(context, master, freq, t0 + 0.7 + i * 0.09, 0.25, 0.05, 'sine'),
    );
  }

  /** Two short turns of a 12-slice wheel, for the preview button in the sound panel. */
  previewSpin(): void {
    this.playSpin(0, 720 + 45, 2600, 12);
  }

  private ensureContext(): { context: AudioContext; master: GainNode } | null {
    if (!this.context && this.output) {
      this.context = this.output.context;
      this.master = this.context.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(this.output.destination);
    }

    if (!this.context) {
      const Ctor =
        (globalThis as { AudioContext?: AudioContextConstructor }).AudioContext ??
        (globalThis as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
      if (!Ctor) {
        return null;
      }

      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(this.context.destination);
    }

    if (this.context.state === 'suspended') {
      // Created outside a gesture (e.g. after the countdown): resuming is allowed
      // once the page has had any user interaction, which a spin always implies.
      void this.context.resume().catch(() => {});
    }

    return { context: this.context, master: this.master! };
  }

  /** A short woody click: a triangle blip whose pitch drops as it decays. */
  private tick(context: AudioContext, destination: AudioNode, at: number): AudioScheduledSourceNode[] {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1900, at);
    osc.frequency.exponentialRampToValueAtTime(650, at + 0.03);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(0.28, at + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.045);
    osc.connect(gain).connect(destination);
    osc.start(at);
    osc.stop(at + 0.05);
    return [osc];
  }

  /** One bell-like note: the base tone plus a quiet octave for brightness. */
  private note(
    context: AudioContext,
    destination: AudioNode,
    freq: number,
    at: number,
    length: number,
    volume: number,
    type: OscillatorType = 'triangle',
  ): void {
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(volume, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(volume * 0.5, at + length * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    gain.connect(destination);

    for (const [multiple, level] of [[1, 1], [2, 0.25]] as const) {
      const osc = context.createOscillator();
      const oscGain = context.createGain();
      osc.type = type;
      osc.frequency.value = freq * multiple;
      oscGain.gain.value = level;
      osc.connect(oscGain).connect(gain);
      osc.start(at);
      osc.stop(at + length + 0.05);
    }
  }
}

/**
 * Value of a CSS `cubic-bezier(x1, y1, x2, y2)` timing function at time `t`
 * (0-1): solves the curve's x for `t` by bisection, then evaluates its y.
 */
export function easeCubicBezier(t: number, [x1, y1, x2, y2]: [number, number, number, number]): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  const coord = (u: number, p1: number, p2: number) =>
    3 * p1 * u * (1 - u) ** 2 + 3 * p2 * u ** 2 * (1 - u) + u ** 3;

  let low = 0;
  let high = 1;
  let u = t;
  for (let i = 0; i < 30; i += 1) {
    u = (low + high) / 2;
    if (coord(u, x1, x2) < t) {
      low = u;
    } else {
      high = u;
    }
  }
  return coord(u, y1, y2);
}
