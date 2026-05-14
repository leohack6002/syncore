import { cn } from "@/lib/utils";

type SyncoraLogoProps = {
  className?: string;
  showWordmark?: boolean;
};

export function SyncoraLogo({ className, showWordmark = true }: SyncoraLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.06] shadow-glow">
        <svg viewBox="0 0 40 40" className="h-7 w-7" aria-hidden="true">
          <path
            d="M28.6 10.2c-3.9-3.4-10-3.1-13.6.5L9.4 16.3"
            fill="none"
            stroke="url(#syncora-mark)"
            strokeLinecap="round"
            strokeWidth="3.4"
          />
          <path
            d="M11.4 29.8c3.9 3.4 10 3.1 13.6-.5l5.6-5.6"
            fill="none"
            stroke="url(#syncora-mark)"
            strokeLinecap="round"
            strokeWidth="3.4"
          />
          <path
            d="M14.2 20h11.6"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="3.2"
            className="text-white"
          />
          <defs>
            <linearGradient id="syncora-mark" x1="8" x2="32" y1="8" y2="32">
              <stop stopColor="#2cdaff" />
              <stop offset="1" stopColor="#9b7cff" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {showWordmark ? (
        <div>
          <p className="text-sm font-semibold tracking-wide text-white">Syncora</p>
          <p className="text-[11px] text-muted-foreground">Unified Communication Workspace</p>
        </div>
      ) : null}
    </div>
  );
}
