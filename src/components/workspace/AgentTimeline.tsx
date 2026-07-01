import { Brain, Zap, Eye, CheckCircle2, XCircle, Loader2, CircleDashed, Pencil, ArrowRightToLine } from "lucide-react";
import type { AgentRun, AgentStep } from "@/lib/agent/types";
import { cn } from "@/lib/utils";
import { StatusPill } from "./StatusPill";
import { useWorkspace } from "@/lib/agent/workspaceStore";

const KIND_ICON: Record<AgentStep["kind"], React.ComponentType<{ className?: string }>> = {
  thought: Brain,
  action: Zap,
  observation: Eye,
  assertion: CheckCircle2,
  edit: Pencil,
};

const KIND_LABEL: Record<AgentStep["kind"], string> = {
  thought: "Thought",
  action: "Action",
  observation: "Observation",
  assertion: "Assertion",
  edit: "Edit Workspace",
};

export function AgentTimeline({ run }: { run: AgentRun }) {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-background/40 px-3 py-2 text-xs">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Goal</div>
        <div className="mt-0.5 text-foreground/90">{run.prompt}</div>
      </div>
      <ol className="relative space-y-3 border-l border-border pl-5">
        {run.steps.map((step) => (
          <StepRow key={step.id} step={step} />
        ))}
      </ol>
      {run.status !== "running" && (
        <div
          className={cn(
            "rounded-md border px-3 py-2 text-xs",
            run.status === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          Run {run.status} · {run.steps.length} steps
        </div>
      )}
    </div>
  );
}

function StepRow({ step }: { step: AgentStep }) {
  const { applyStepToWorkspace, focusedStepId } = useWorkspace();
  const Icon = KIND_ICON[step.kind];
  const StatusIcon =
    step.status === "success"
      ? CheckCircle2
      : step.status === "failed"
        ? XCircle
        : step.status === "running"
          ? Loader2
          : CircleDashed;
  const interactive = !!step.request;
  const focused = focusedStepId === step.id;

  return (
    <li className="relative">
      <span
        className={cn(
          "absolute -left-[27px] grid h-4 w-4 place-items-center rounded-full border bg-background",
          step.status === "success" && "border-success text-success",
          step.status === "failed" && "border-destructive text-destructive",
          step.status === "running" && "border-primary text-primary",
          step.status === "pending" && "border-border text-muted-foreground",
        )}
      >
        <StatusIcon className={cn("h-2.5 w-2.5", step.status === "running" && "animate-spin")} />
      </span>
      <div
        onClick={interactive ? () => applyStepToWorkspace(step) : undefined}
        className={cn(
          "rounded-md border bg-card/60 p-2.5 text-xs transition-all",
          step.status === "running" && "border-primary/40 shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_15%,transparent)]",
          step.status !== "running" && "border-border",
          focused && "border-primary/60 ring-2 ring-primary/30",
          interactive && "cursor-pointer hover:border-primary/40",
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {KIND_LABEL[step.kind]}
          </span>
          {step.response && <StatusPill status={step.response.status} durationMs={step.response.durationMs} />}
          {step.finishedAt && step.startedAt && (
            <span className="ml-auto text-[10px] text-muted-foreground">
              {step.finishedAt - step.startedAt}ms
            </span>
          )}
        </div>
        <div className="mt-1 text-foreground/90">{step.title}</div>
        {step.detail && (
          <div className="mt-1 whitespace-pre-line text-[11px] text-muted-foreground">{step.detail}</div>
        )}
        {step.request && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 truncate rounded bg-muted/40 px-2 py-1 font-mono text-[10px] text-foreground/80">
              <span className="font-semibold text-primary">{step.request.method}</span>{" "}
              {step.request.url}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                applyStepToWorkspace(step);
              }}
              title="Apply this request to the manual workspace"
              className="flex shrink-0 items-center gap-1 rounded border border-border bg-background px-1.5 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <ArrowRightToLine className="h-3 w-3" />
              Apply
            </button>
          </div>
        )}
        {step.edits && step.edits.length > 0 && (
          <ul className="mt-2 space-y-1 rounded bg-muted/30 p-2 text-[10px] font-mono text-foreground/80">
            {step.edits.map((e, i) => (
              <li key={i}>
                <span className="text-muted-foreground">{e.field}:</span>{" "}
                {e.before && <span className="line-through text-destructive/70">{e.before}</span>}{" "}
                <span className="text-success">{e.after}</span>
              </li>
            ))}
          </ul>
        )}
        {step.status === "failed" && step.detail && (
          <div className="mt-2 rounded border border-destructive/30 bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
            {step.detail}
          </div>
        )}
        {step.assertions && step.assertions.length > 0 && (
          <ul className="mt-2 space-y-1">
            {step.assertions.map((a) => (
              <li
                key={a.id}
                className={cn(
                  "flex items-center gap-2 rounded border px-2 py-1 text-[11px]",
                  a.status === "pass" && "border-success/30 bg-success/10 text-success",
                  a.status === "fail" && "border-destructive/30 bg-destructive/10 text-destructive",
                  a.status === "pending" && "border-border text-muted-foreground",
                )}
              >
                {a.status === "pass" ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : a.status === "fail" ? (
                  <XCircle className="h-3 w-3" />
                ) : (
                  <CircleDashed className="h-3 w-3" />
                )}
                <span className="flex-1">{a.label}</span>
                {a.detail && <span className="font-mono text-[10px] opacity-70">{a.detail}</span>}
              </li>
            ))}
          </ul>
        )}
        {step.response && step.kind === "action" && (
          <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted/40 p-2 font-mono text-[10px] leading-relaxed text-foreground/80">
            {JSON.stringify(step.response.body, null, 2)}
          </pre>
        )}
      </div>
    </li>
  );
}