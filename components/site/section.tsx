import { cn } from "@/lib/utils";

export function Wrap({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-[min(1180px,100%-2.5rem)]", className)}>{children}</div>;
}

export function Section({
  tint,
  ink,
  className,
  children,
}: {
  tint?: boolean;
  ink?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("py-10 md:py-14", tint && "bg-paper-2", ink && "bg-ink text-paper", className)}>
      <Wrap>{children}</Wrap>
    </section>
  );
}

export function Eyebrow({ children, onInk }: { children: React.ReactNode; onInk?: boolean }) {
  return (
    <span
      className={cn(
        "text-[0.78rem] font-bold uppercase tracking-[0.14em]",
        onInk ? "text-accent" : "text-accent-2",
      )}
    >
      {children}
    </span>
  );
}

export function SectionHead({
  eyebrow,
  title,
  lead,
  onInk,
  action,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  onInk?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("mb-8 md:mb-11", action && "flex flex-wrap items-end justify-between gap-6")}>
      <div className="max-w-[62ch]">
        {eyebrow && <Eyebrow onInk={onInk}>{eyebrow}</Eyebrow>}
        <h2 className="mt-1 text-[clamp(1.6rem,1.15rem+2vw,2.5rem)]">{title}</h2>
        {lead && (
          <p className={cn("mt-3 text-[clamp(1rem,0.95rem+0.3vw,1.15rem)]", onInk ? "text-paper/70" : "text-muted")}>
            {lead}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
