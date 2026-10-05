"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Mobile-only "Review & sign" bar; hides once the sign section is on screen. */
export function StickySignBar({ label }: { label: string }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const target = document.getElementById("accept");
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setHidden(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <a
      href="#accept"
      aria-hidden={hidden}
      tabIndex={hidden ? -1 : undefined}
      className={cn(
        "fixed inset-x-4 bottom-4 z-20 flex h-12 items-center justify-center rounded-sm bg-brand font-semibold text-brand-contrast shadow-[0_8px_24px_-8px_rgb(28_26_23/0.45)] transition-[transform,opacity] duration-200 ease-out-soft active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:hidden",
        hidden && "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      {label}
    </a>
  );
}
