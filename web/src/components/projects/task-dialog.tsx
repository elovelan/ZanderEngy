"use client";

import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DynamicDocumentEditor } from "@/components/editor/dynamic-document-editor";
import { cn } from "@/lib/utils";
import { taskStatusOptions, taskStatusColors } from "./task-status-badge";
import { RiDeleteBinLine } from "@remixicon/react";

// ── Create mode ──────────────────────────────────────────────────────

interface CreateProps {
  mode: "create";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: number;
  specId?: string;
  onCreated?: () => void;
}

// ── Edit mode ────────────────────────────────────────────────────────

interface EditProps {
  mode: "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: number;
}

export type TaskDialogProps = CreateProps | EditProps;

export function TaskDialog(props: TaskDialogProps) {
  if (props.mode === "edit") {
    return <EditTask {...props} />;
  }
  return <CreateTask {...props} />;
}

// ── Create ───────────────────────────────────────────────────────────

function CreateTask({ open, onOpenChange, projectId, specId, onCreated }: CreateProps) {
  const [title, setTitle] = useState("");
  const descriptionRef = useRef("");
  const [type, setType] = useState<"ai" | "human">("human");
  const [importance, setImportance] = useState<"important" | "not_important">("not_important");
  const [urgency, setUrgency] = useState<"urgent" | "not_urgent">("not_urgent");

  const createTask = trpc.task.create.useMutation({
    onSuccess: () => {
      setTitle("");
      descriptionRef.current = "";
      setType("human");
      setImportance("not_important");
      setUrgency("not_urgent");
      onCreated?.();
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return;
    createTask.mutate({
      projectId,
      specId,
      title: title.trim(),
      description: descriptionRef.current.trim() || undefined,
      type,
      importance,
      urgency,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Description</Label>
              <div className="min-h-[200px] border border-border">
                {open && (
                  <DynamicDocumentEditor
                    initialMarkdown=""
                    onSave={(md: string) => { descriptionRef.current = md; }}
                  />
                )}
              </div>
            </div>

            <FieldRow type={type} importance={importance} urgency={urgency}
              onTypeChange={setType} onImportanceChange={setImportance} onUrgencyChange={setUrgency}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!title.trim() || createTask.isPending}>
              {createTask.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit ─────────────────────────────────────────────────────────────

function EditTask({ open, onOpenChange, taskId }: EditProps) {
  const { data: task } = trpc.task.get.useQuery(
    { id: taskId },
    { enabled: open },
  );

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<string>("");
  const [type, setType] = useState<"ai" | "human">("human");
  const [importance, setImportance] = useState<"important" | "not_important">("not_important");
  const [urgency, setUrgency] = useState<"urgent" | "not_urgent">("not_urgent");
  const descriptionRef = useRef("");
  const [dirty, setDirty] = useState(false);
  const initializedRef = useRef<number | null>(null);

  if (task && initializedRef.current !== task.id) {
    initializedRef.current = task.id;
    setTitle(task.title);
    setStatus(task.status);
    setType(task.type as "ai" | "human");
    setImportance((task.importance ?? "not_important") as "important" | "not_important");
    setUrgency((task.urgency ?? "not_urgent") as "urgent" | "not_urgent");
    descriptionRef.current = task.description || "";
    setDirty(false);
  }

  const utils = trpc.useUtils();
  const updateTask = trpc.task.update.useMutation({
    onSuccess: () => {
      setDirty(false);
      utils.task.get.invalidate();
      utils.task.list.invalidate();
      utils.task.listBySpecId.invalidate();
    },
  });

  const deleteTask = trpc.task.delete.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate();
      utils.task.listBySpecId.invalidate();
      onOpenChange(false);
    },
  });

  function handleSave() {
    if (!task) return;
    updateTask.mutate({
      id: task.id,
      title,
      status: status as (typeof taskStatusOptions)[number],
      type,
      importance,
      urgency,
      description: descriptionRef.current,
    });
  }

  if (!task) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const deps = (task.dependencies as number[]) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="sr-only">Edit Task</DialogTitle>
          <Input
            value={title}
            onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
            className="mt-6 text-lg font-semibold"
          />
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Status</label>
              <Select
                value={status}
                onValueChange={(v) => { setStatus(v); setDirty(true); }}
              >
                <SelectTrigger className="h-7 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskStatusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <FieldRow
              type={type}
              importance={importance}
              urgency={urgency}
              onTypeChange={(v) => { setType(v); setDirty(true); }}
              onImportanceChange={(v) => { setImportance(v); setDirty(true); }}
              onUrgencyChange={(v) => { setUrgency(v); setDirty(true); }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Description</label>
            <div className="min-h-[200px] border border-border">
              <DynamicDocumentEditor
                initialMarkdown={task.description || ""}
                onSave={(md: string) => { descriptionRef.current = md; setDirty(true); }}
              />
            </div>
          </div>

          {deps.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium">Dependencies</span>
              <div className="flex flex-wrap gap-1">
                {deps.map((depId) => (
                  <DependencyBadge key={depId} taskId={depId} />
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => deleteTask.mutate({ id: task.id })}
          >
            <RiDeleteBinLine className="mr-1 size-3" />
            Delete
          </Button>
          <Button size="sm" disabled={!dirty || updateTask.isPending} onClick={handleSave}>
            {updateTask.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Shared ───────────────────────────────────────────────────────────

function FieldRow({
  type, importance, urgency,
  onTypeChange, onImportanceChange, onUrgencyChange,
}: {
  type: "ai" | "human";
  importance: "important" | "not_important";
  urgency: "urgent" | "not_urgent";
  onTypeChange: (v: "ai" | "human") => void;
  onImportanceChange: (v: "important" | "not_important") => void;
  onUrgencyChange: (v: "urgent" | "not_urgent") => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => onTypeChange(v as "ai" | "human")}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="human">Human</SelectItem>
            <SelectItem value="ai">AI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Importance</Label>
        <Select value={importance} onValueChange={(v) => onImportanceChange(v as "important" | "not_important")}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="important">Important</SelectItem>
            <SelectItem value="not_important">Not Important</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Urgency</Label>
        <Select value={urgency} onValueChange={(v) => onUrgencyChange(v as "urgent" | "not_urgent")}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="not_urgent">Not Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

function DependencyBadge({ taskId }: { taskId: number }) {
  const { data: task } = trpc.task.get.useQuery({ id: taskId });

  if (!task) {
    return (
      <Badge variant="outline" className="text-[10px]">
        #{taskId}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn("text-[10px]", taskStatusColors[task.status])}
    >
      #{task.id} {task.title}
    </Badge>
  );
}
