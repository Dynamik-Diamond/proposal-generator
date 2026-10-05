import Link from "next/link";

export function AppHeader({ current }: { current: "proposals" | "settings" }) {
  const link = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="rounded-sm px-2 py-1.5 text-ink-muted transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-ring aria-[current=page]:text-ink aria-[current=page]:font-semibold"
    >
      {label}
    </Link>
  );
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/dashboard" className="font-display text-lg tracking-tight">
          Proposals
        </Link>
        <nav className="flex items-center gap-2 text-sm sm:gap-4">
          {link("/dashboard", "All proposals", current === "proposals")}
          {link("/settings", "Settings", current === "settings")}
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-sm px-2 py-1.5 text-ink-muted transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-ring"
            >
              Sign out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
