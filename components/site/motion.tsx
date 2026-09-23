"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type Variants,
} from "motion/react";

/**
 * Motion primitives.
 *
 * Each of these is a thin client wrapper that takes server-rendered `children`,
 * so the copy inside stays in the HTML for crawlers — the client bundle only
 * carries the animation, not the content. See the Next docs on interleaving
 * server and client components.
 *
 * Everything collapses to "just show it" under prefers-reduced-motion.
 */

const EASE = [0.22, 0.61, 0.36, 1] as const;

/** The mounted flag never changes after hydration, so nothing to subscribe to. */
const subscribeNoop = () => () => {};

/** Fade + rise as the element scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "span";
}) {
  const reduce = useReducedMotion();
  const M = motion[as];

  return (
    <M
      data-reveal
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </M>
  );
}

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

/** Wrap a grid; direct <StaggerItem> children come in one after another. */
export function Stagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={listVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div data-reveal className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

/** Counts up to `value` once it scrolls into view. */
export function Counter({
  value,
  suffix = "",
  prefix = "",
  className,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: 1400, bounce: 0 });
  const [shown, setShown] = useState(0);

  // The server renders the real figure, and we only drop to 0 once we know the
  // client is live. Without this the no-JS render would state a flat "0" — a
  // wrong number is worse than an unanimated one. useSyncExternalStore gives us
  // the server/client split without a state write, so hydration stays clean.
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  useEffect(() => {
    if (inView && !reduce) mv.set(value);
  }, [inView, reduce, mv, value]);

  useEffect(() => spring.on("change", (v) => setShown(Math.round(v))), [spring]);

  // Latin digits regardless of locale — these are prices/quantities, and the
  // site writes numbers in Latin everywhere else too.
  const n = !mounted || reduce ? value : inView ? shown : 0;
  const display = n.toLocaleString("en-US");

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

/** Subtle lift on hover — used by cards that are links. */
export function HoverLift({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      whileHover={reduce ? undefined : { y: -6 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
