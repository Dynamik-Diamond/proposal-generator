"use client";

import { useEffect, useMemo, useRef } from "react";
import confetti from "canvas-confetti";
import { motion, useReducedMotion } from "motion/react";

const EASE = [0.2, 0.7, 0.2, 1] as const;
const FLECK_COLORS = ["bg-brand", "bg-ink", "bg-gilt", "bg-brand", "bg-rule"];

/** Slow ripple rings radiating from the check mark, like a seal pressed into paper. */
function SealRipples() {
  return (
    <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute top-1/2 left-1/2 block size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand"
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: [1, 7], opacity: [0.35, 0] }}
          transition={{ duration: 6, ease: "easeOut", repeat: Infinity, delay: 1.2 + i * 2 }}
        />
      ))}
    </div>
  );
}

/** Paper flecks that keep drifting down after the confetti burst. */
function DriftingFlecks() {
  const flecks = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: Math.random() * 100,
        size: 6 + Math.random() * 8,
        duration: 11 + Math.random() * 9,
        delay: 1.5 + Math.random() * 10,
        sway: (Math.random() - 0.5) * 120,
        spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
        color: FLECK_COLORS[i % FLECK_COLORS.length],
        opacity: 0.25 + Math.random() * 0.35,
      })),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {flecks.map((f, i) => (
        <motion.span
          key={i}
          className={`absolute -top-6 block rounded-[1px] ${f.color}`}
          style={{ left: `${f.left}%`, width: f.size, height: f.size * 0.6, opacity: f.opacity }}
          initial={{ y: 0, x: 0, rotate: 0 }}
          animate={{ y: "110vh", x: [0, f.sway, 0], rotate: f.spin }}
          transition={{ duration: f.duration, delay: f.delay, ease: "linear", repeat: Infinity, x: { duration: f.duration, delay: f.delay, ease: "easeInOut", repeat: Infinity } }}
        />
      ))}
    </div>
  );
}

export function Celebration({ firstName, pdfHref, onClose }: { firstName: string; pdfHref: string; onClose: () => void }) {
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shootRef = useRef<confetti.CreateTypes | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (reduce || !canvasRef.current) return;
    // Our own canvas, layered behind the headline and buttons (the default canvas sits on top of everything).
    // Create once: a canvas can only be handed to the worker a single time (effects re-run in dev).
    shootRef.current ??= confetti.create(canvasRef.current, { resize: true, useWorker: true });
    const shoot = shootRef.current;
    const styles = getComputedStyle(document.querySelector(".paper") ?? document.documentElement);
    const accent = styles.getPropertyValue("--accent-brand").trim() || "#2f5d46";
    const colors = [accent, "#1c1a17", "#c9a227", "#e8dfcf", accent];
    const fire = (originX: number, angle: number) =>
      shoot({ particleCount: 90, angle, spread: 62, startVelocity: 58, origin: { x: originX, y: 0.75 }, colors, ticks: 260, scalar: 1.05, disableForReducedMotion: true });
    fire(0, 60);
    fire(1, 120);
    const second = setTimeout(() => {
      fire(0.1, 70);
      fire(0.9, 110);
    }, 450);
    const rain = setTimeout(() => {
      shoot({ particleCount: 140, spread: 160, startVelocity: 25, gravity: 0.7, origin: { x: 0.5, y: -0.1 }, colors, ticks: 400, disableForReducedMotion: true });
    }, 900);
    return () => {
      clearTimeout(second);
      clearTimeout(rain);
      shoot.reset();
    };
  }, [reduce]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebrate-title"
      className="fixed inset-0 z-50 isolate grid place-items-center overflow-hidden bg-paper/95 px-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 size-full" />
      {!reduce && <DriftingFlecks />}
      <div className="relative flex max-w-3xl flex-col items-center text-center">
        <div className="relative">
          {!reduce && <SealRipples />}
        <motion.svg
          viewBox="0 0 96 96"
          className="size-24 text-brand"
          aria-hidden
          initial={reduce ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
        >
          <motion.circle
            cx="48"
            cy="48"
            r="44"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
          />
          <motion.path
            d="M28 49 L42 63 L69 34"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.45, ease: EASE, delay: 0.75 }}
          />
        </motion.svg>
        </div>
        <motion.h2
          id="celebrate-title"
          className="mt-8 font-display text-[clamp(2.5rem,7vw,4.5rem)] font-light leading-[1.02] tracking-[-0.02em] text-balance"
          initial={reduce ? false : { y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.9 }}
        >
          You&apos;re all set, {firstName}.
        </motion.h2>
        <motion.div
          initial={reduce ? false : { y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE, delay: 1.1 }}
        >
          <p className="mt-4 text-lg leading-relaxed text-ink-muted">
            Signed, paid and booked in. We&apos;re looking forward to getting started.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href={pdfHref}
              className="inline-flex h-12 items-center justify-center rounded-sm border border-ink px-6 font-semibold transition-colors duration-150 hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Download signed PDF
            </a>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="inline-flex h-12 items-center justify-center rounded-sm bg-brand px-6 font-semibold text-brand-contrast transition-[transform,background-color] duration-150 hover:bg-brand/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Back to the proposal
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
