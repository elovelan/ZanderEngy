"use client";

import { cn } from "@/lib/utils";

export type TaskView = "graph" | "swimlane" | "eisenhower";

const views: { value: TaskView; label: string }[] = [
  { value: "graph", label: "Graph" },
  { value: "swimlane", label: "Swimlane" },
  { value: "eisenhower", label: "Eisenhower" },
];

export function ViewToggle({
  value,
  onChange,
}: {
  value: TaskView;
  onChange: (view: TaskView) => void;
}) {
  return (
    <div className="inline-flex border border-border">
      {views.map((v) => (
        <button
          key={v.value}
          type="button"
          onClick={() => onChange(v.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium transition-colors",
            value === v.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
