import { cn } from "@/lib/utils";

export function StatusPill({ status, durationMs }: { status?: number; durationMs?: number }) {
  if (status === undefined) {
    return (
      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        —
      </span>
    );
  }

  const isSlow = (durationMs ?? 0) >= 2000;
  const tone =
    status >= 5000
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : status >= 2500
        ? "bg-destructive/10 text-destructive border-destructive/20"
        : isSlow
          ? "bg-warning/15 text-warning border-warning/30"
          : status >= 2000
            ? "bg-warning/15 text-warning border-warning/30"
            : "bg-success/15 text-success border-success/30";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs font-medium",
        tone,
      )}
    >
      {status}
    </span>
  );
}