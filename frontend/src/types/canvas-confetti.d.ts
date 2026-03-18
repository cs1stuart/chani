declare module "canvas-confetti" {
  namespace confetti {
    interface Options {
      particleCount?: number;
      angle?: number;
      spread?: number;
      startVelocity?: number;
      decay?: number;
      gravity?: number;
      drift?: number;
      flat?: boolean;
      ticks?: number;
      origin?: { x?: number; y?: number };
      colors?: string[];
      shapes?: ("circle" | "square")[];
      scalar?: number;
      zIndex?: number;
      disableForReducedMotion?: boolean;
    }
  }
  function confetti(options?: confetti.Options): Promise<null>;
  export = confetti;
}
