"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Milestone = { id: number; title: string };

export function TaskGroupForm({
  milestones,
  open,
  onOpenChange,
  onCreated,
}: {
  milestones: Milestone[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const [name, setName] = useState("");
  const [milestoneId, setMilestoneId] = useState<string>("");

  const createGroup = trpc.taskGroup.create.useMutation({
    onSuccess: () => {
      setName("");
      setMilestoneId("");
      onCreated?.();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !milestoneId) return;
    createGroup.mutate({
      milestoneId: Number(milestoneId),
      name: name.trim(),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Task Group</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tg-name">Name</Label>
              <Input
                id="tg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Group name"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Milestone</Label>
              <Select value={milestoneId} onValueChange={setMilestoneId}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Select milestone" />
                </SelectTrigger>
                <SelectContent>
                  {milestones.map((ms) => (
                    <SelectItem key={ms.id} value={String(ms.id)}>
                      {ms.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={!name.trim() || !milestoneId || createGroup.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
