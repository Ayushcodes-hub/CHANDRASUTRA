"use client";

/**
 * LUNARMATCH 2.0 — HUD primitive library
 * The shared visual vocabulary of the mission console.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

/* ── Panel ──────────────────────────────────────────────────── */
export function Panel({
  title,
  right,
  children,
  className,
  bodyClass,
  corners = false,
  accent,
}: {
  title?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClass?: string;
  corners?: boolean;
  accent?: "cy" | "gr" | "am" | "rd" | "vi";
}) {
  const accentMap = { cy: "text-cy", gr: "text-gr", am: "text-am", rd: "text-rd", vi: "text-vi" };
  return (
    <section className={cn("hud-panel", corners && "corners", className)}>
      {corners && <span className="corner-b" aria-hidden="true" />}
      {title !== undefined && (
        <header className="hud-head">
          <h2 className={cn("hud-title flex items-center gap-1.5", accent && accentMap[accent])}>
            {title}
          </h2>
          {right && <div className="flex items-center gap-1.5 shrink-0">{right}</div>}
        </header>
      )}
      <div className={cn("p-2.5", bodyClass)}>{children}</div>
    </section>
  );
}

/* ── Micro label ────────────────────────────────────────────── */
export function Lbl({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("label-micro", className)}>{children}</span>;
}

/* ── Status dot ─────────────────────────────────────────────── */
export function Dot({ tone = "gr", pulse = true, className }: { tone?: "gr" | "cy" | "am" | "rd"; pulse?: boolean; className?: string }) {
  const map = { gr: "bg-gr", cy: "bg-cy", am: "bg-am", rd: "bg-rd" };
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-[5px] rounded-full shrink-0", map[tone], pulse && "animate-pulse-dot", className)}
    />
  );
}

/* ── Chip ───────────────────────────────────────────────────── */
export function Chip({
  children,
  tone = "dim",
  dot,
  className,
}: {
  children: React.ReactNode;
  tone?: "dim" | "cy" | "gr" | "am" | "rd";
  dot?: boolean;
  className?: string;
}) {
  const map = { dim: "", cy: "hud-chip-cy", gr: "hud-chip-gr", am: "hud-chip-am", rd: "hud-chip-rd" };
  return (
    <span className={cn("hud-chip", map[tone], className)}>
      {dot && <Dot tone={tone === "dim" ? "cy" : (tone as "gr" | "cy" | "am" | "rd")} pulse={tone !== "dim"} />}
      {children}
    </span>
  );
}

/* ── Key/value inline row ───────────────────────────────────── */
export function KV({
  k,
  v,
  vClass,
  className,
}: {
  k: React.ReactNode;
  v: React.ReactNode;
  vClass?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-2 min-w-0", className)}>
      <Lbl className="truncate">{k}</Lbl>
      <span className={cn("text-[10.5px] font-bold mono-tabular text-ink/90 text-right", vClass)}>{v}</span>
    </div>
  );
}

/* ── Stat block (label / big value / sub) ───────────────────── */
export function Stat({
  label,
  value,
  sub,
  tone = "ink",
  size = "md",
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "ink" | "cy" | "gr" | "am" | "rd" | "vi";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const toneMap = {
    ink: "text-ink",
    cy: "text-cy text-glow-cy",
    gr: "text-gr text-glow-gr",
    am: "text-am text-glow-am",
    rd: "text-rd",
    vi: "text-vi",
  };
  const sizeMap = { sm: "text-[12px]", md: "text-[15px]", lg: "text-[22px]", xl: "text-[30px]" };
  return (
    <div className={cn("min-w-0", className)}>
      <Lbl className="block mb-1 leading-tight">{label}</Lbl>
      <div className={cn("font-extrabold mono-tabular leading-none tracking-tight", toneMap[tone], sizeMap[size])}>
        {value}
      </div>
      {sub && <div className="mt-1 text-[8.5px] uppercase tracking-[0.12em] text-faint leading-tight">{sub}</div>}
    </div>
  );
}

/* ── Console button ─────────────────────────────────────────── */
export function Btn({
  children,
  onClick,
  variant = "default",
  icon,
  className,
  disabled,
  title,
  full,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "accent" | "ghost";
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
  full?: boolean;
}) {
  const map = { default: "", accent: "hud-btn-accent", ghost: "hud-btn-ghost" };
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn("hud-btn", map[variant], full && "w-full", className)}
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
}

/* ── Segment group (toolbar toggles) ────────────────────────── */
export function Seg<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { id: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          data-active={value === o.id}
          onClick={() => onChange(o.id)}
          className="hud-seg flex items-center gap-1.5"
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Checkbox toggle (VECTORS / CONTOURS style) ─────────────── */
export function Tick({
  label,
  checked,
  onChange,
  tone = "cy",
}: {
  label: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  tone?: "cy" | "gr" | "am";
}) {
  const border = { cy: "border-cy", gr: "border-gr", am: "border-am" };
  const bg = { cy: "bg-cy", gr: "bg-gr", am: "bg-am" };
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-1.5 group"
    >
      <span
        className={cn(
          "size-[11px] rounded-[2px] border flex items-center justify-center transition-colors",
          checked ? border[tone] : "border-line2 bg-raise"
        )}
      >
        {checked && (
          <svg viewBox="0 0 8 8" className={cn("size-[7px]", bg[tone])} aria-hidden="true">
            <path d="M0 3h8v5H0z" />
          </svg>
        )}
      </span>
      <span className={cn("text-[9px] font-bold uppercase tracking-[0.1em] transition-colors", checked ? "text-ink/85" : "text-faint group-hover:text-dim")}>
        {label}
      </span>
    </button>
  );
}

/* ── Horizontal meter ───────────────────────────────────────── */
export function Bar({
  pct,
  tone = "cy",
  className,
  glow = true,
  segments,
}: {
  pct: number;
  tone?: "cy" | "gr" | "am" | "rd" | "cy-gr";
  className?: string;
  glow?: boolean;
  segments?: number;
}) {
  const grad: Record<string, string> = {
    cy: "linear-gradient(90deg,#0e7490,#2dd9ec)",
    gr: "linear-gradient(90deg,#15803d,#46e08f)",
    am: "linear-gradient(90deg,#92600e,#ffb454)",
    rd: "linear-gradient(90deg,#7f1d1d,#ff5d5d)",
    "cy-gr": "linear-gradient(90deg,#0e7490,#2dd9ec 55%,#46e08f)",
  };
  const glowColor: Record<string, string> = { cy: "#2dd9ec", gr: "#46e08f", am: "#ffb454", rd: "#ff5d5d", "cy-gr": "#2dd9ec" };
  return (
    <div className={cn("relative h-[5px] w-full overflow-hidden rounded-[2px] bg-[#131b26]", className)} role="progressbar" aria-valuenow={Math.round(pct)}>
      <div
        className="absolute inset-y-0 left-0 transition-[width] duration-700 ease-out"
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          background: grad[tone],
          boxShadow: glow ? `0 0 8px ${glowColor[tone]}66` : undefined,
        }}
      />
      {segments ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "repeating-linear-gradient(90deg, transparent 0 6px, #04060a 6px 8px)",
          }}
        />
      ) : null}
    </div>
  );
}

/* ── Equation / solver code block ───────────────────────────── */
export function Code({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("hud-inset px-2.5 py-2 font-mono text-[10.5px] leading-relaxed text-cy/90 overflow-x-auto", className)}>
      {children}
    </div>
  );
}

/* ── Section divider label ──────────────────────────────────── */
export function SubHead({ children, right, className }: { children: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-2 mb-2", className)}>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-cy/70">›</span>
        <h3 className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-dim truncate">{children}</h3>
      </div>
      {right}
    </div>
  );
}

/* ── Live jitter numeric ────────────────────────────────────── */
export function Live({
  value,
  digits = 2,
  className,
  prefix = "",
  suffix = "",
}: {
  value: number;
  digits?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <span className={cn("mono-tabular", className)}>
      {prefix}
      {value.toFixed(digits)}
      {suffix}
    </span>
  );
}
