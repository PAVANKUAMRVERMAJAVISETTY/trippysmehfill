import { ORDER_STAGES, STAGE_LABEL, STAGE_STYLE, stageIndex } from "@/lib/store";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
        STAGE_STYLE[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {STAGE_LABEL[status] ?? status}
    </span>
  );
}

/** Horizontal progress bar across the 10 lifecycle stages. */
export function OrderProgress({ status }: { status: string }) {
  if (status === "cancelled") {
    return <p className="mt-3 rounded-xl bg-destructive/10 p-2 text-center text-sm text-destructive">Order cancelled</p>;
  }
  const current = stageIndex(status);
  const percent = Math.max(0, Math.round((current / (ORDER_STAGES.length - 1)) * 100));

  return (
    <div className="mt-3">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1 text-[10px] uppercase tracking-wide">
        {ORDER_STAGES.map((s, i) => (
          <span
            key={s}
            className={i <= current ? "font-semibold text-primary" : "text-muted-foreground/60"}
          >
            {STAGE_LABEL[s]}
            {i < ORDER_STAGES.length - 1 ? " ›" : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
