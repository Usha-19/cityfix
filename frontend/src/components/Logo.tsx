import { cn } from "@/utils/cn";

/** CityFix mark: a location pin with a check — "issues, located and fixed". */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path
        d="M16 6c-3.6 0-6.5 2.9-6.5 6.5 0 4.5 6.5 11 6.5 11s6.5-6.5 6.5-11C22.5 8.9 19.6 6 16 6z"
        fill="#14b8a6"
      />
      <path
        d="M13 12.5l2 2 4-4"
        fill="none"
        stroke="#0b1f33"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  className,
  textClassName,
  showText = true,
}: {
  className?: string;
  textClassName?: string;
  showText?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="h-8 w-8 text-navy-800" />
      {showText && (
        <span className={cn("text-lg font-bold tracking-tight text-navy-800", textClassName)}>
          City<span className="text-teal-600">Fix</span>
        </span>
      )}
    </span>
  );
}
