"use client";

import React, { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Heart } from "lucide-react";

interface Props {
  show: boolean;
  onComplete: () => void;
}

const COLORS = ["#00a884", "#25d366", "#ff6b9d", "#ffd93d", "#6bcb77", "#4d96ff", "#ff922b"];

function fireConfetti() {
  const count = 150;
  const defaults = { origin: { y: 0.6 }, zIndex: 9999 };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
      colors: COLORS,
      shapes: ["circle", "square"],
    });
  }

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}

export default function LoginCelebration({ show, onComplete }: Props) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!show) return;
    if (!firedRef.current) {
      firedRef.current = true;
      fireConfetti();
      // Extra bursts after short delay - "hurray" style
      const t1 = setTimeout(() => confetti({ particleCount: 50, spread: 80, origin: { y: 0.5 }, colors: COLORS, zIndex: 9999 }), 200);
      const t2 = setTimeout(() => confetti({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0 }, colors: COLORS, zIndex: 9999 }), 400);
      const t3 = setTimeout(() => confetti({ particleCount: 40, angle: 120, spread: 55, origin: { x: 1 }, colors: COLORS, zIndex: 9999 }), 600);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => {
      onComplete();
      firedRef.current = false;
    }, 2500);
    return () => clearTimeout(t);
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-[#f0f2f5]/95 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
            className="flex flex-col items-center gap-6 px-8"
          >
            <motion.div
              initial={{ rotate: -10 }}
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex gap-3"
            >
              <Sparkles className="w-12 h-12 text-[#00a884]" />
              <Heart className="w-12 h-12 text-[#ff6b9d] fill-[#ff6b9d]" />
              <Sparkles className="w-12 h-12 text-[#ffd93d]" />
            </motion.div>
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-2xl md:text-3xl font-semibold text-gray-800 text-center"
            >
              Thank you for using WorkChat!
            </motion.h2>
            <motion.p
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="text-gray-500 text-center max-w-sm"
            >
              You're all set. Start chatting with your colleagues!
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
