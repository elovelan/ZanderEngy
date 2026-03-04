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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function MilestoneForm({
  projectId,
  open,
  onOpenChange,
  onCreated,
}: {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  const createMilestone = trpc.milestone.create.useMutation({
    onSuccess: () => {
      setTitle("");
      setScope("");
      setSortOrder(0);
      onCreated?.();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createMilestone.mutate({
      projectId,
      title: title.trim(),
      scope: scope.trim() || undefined,
      sortOrder,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Milestone</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ms-title">Title</Label>
              <Input
                id="ms-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Milestone title"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ms-scope">Scope</Label>
              <Textarea
                id="ms-scope"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="Optional scope description"
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ms-order">Sort Order</Label>
              <Input
                id="ms-order"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!title.trim() || createMilestone.isPending}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
