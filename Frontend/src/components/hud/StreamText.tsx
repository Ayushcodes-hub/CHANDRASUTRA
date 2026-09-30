"use client";

/**
 * LUNARMATCH 2.0 — streaming text (typewriter) for VLM intel feed
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export function StreamText({
  text,
  speed = 14,
  className,
  onDone,
  startDelay = 250,
}: {
  text: string;
  speed?: number;
  className?: string;
  onDone?: () => void;
  startDelay?: number;
}) {
  const [n, setN] = React.useState(0);
  const doneRef = React.useRef(false);

  React.useEffect(() => {
    // Intentional reset when the streamed text/configuration changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setN(0);
    doneRef.current = false;

    let i = 0;
    let timer: ReturnType<typeof setTimeout>;

    const start = setTimeout(() => {
      const step = () => {
        i += Math.random() < 0.22 ? 2 : 1;

        if (i >= text.length) {
          setN(text.length);

          if (!doneRef.current) {
            doneRef.current = true;
            onDone?.();
          }

          return;
        }

        setN(i);
        timer = setTimeout(step, speed + Math.random() * speed);
      };

      step();
    }, startDelay);

    return () => {
      clearTimeout(start);
      clearTimeout(timer);
    };
  }, [text, speed, startDelay, onDone]);

  const done = n >= text.length;

  return (
    <span className={cn(!done && "caret", className)}>
      {text.slice(0, n)}
    </span>
  );
}

/* Multiline streaming intel block with › prefixes */
export function IntelFeed({
  lines,
  className,
  speed = 12,
}: {
  lines: string[];
  className?: string;
  speed?: number;
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {lines.map((l, i) => (
        <p key={i} className="text-[10.5px] leading-relaxed text-dim">
          <span className="text-gr mr-1.5 font-bold">&gt;</span>
          <StreamText
            text={l}
            speed={speed}
            startDelay={400 + i * 1800}
          />
        </p>
      ))}
    </div>
  );
}