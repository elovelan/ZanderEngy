"use client";

import { RiFilterLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { taskStatusOptions } from "@/components/projects/task-status-badge";

export interface TaskFilters {
  status: string[];
  type: string[];
  groupId: number[];
}

export function applyTaskFilters<
  T extends { status: string; type: string; taskGroupId: number | null },
>(tasks: T[], filters: TaskFilters): T[] {
  return tasks.filter((task) => {
    if (filters.status.length > 0 && !filters.status.includes(task.status)) return false;
    if (filters.type.length > 0 && !filters.type.includes(task.type)) return false;
    if (filters.groupId.length > 0 && !filters.groupId.includes(task.taskGroupId ?? -1))
      return false;
    return true;
  });
}

function countActiveFilters(filters: TaskFilters): number {
  return filters.status.length + filters.type.length + filters.groupId.length;
}

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

interface TaskFilterProps {
  value: TaskFilters;
  onChange: (filters: TaskFilters) => void;
  groups: { id: number; name: string }[];
}

export function TaskFilter({ value, onChange, groups }: TaskFilterProps) {
  const activeCount = countActiveFilters(value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          <RiFilterLine data-icon="inline-start" />
          Filter
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
              {activeCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Status</DropdownMenuLabel>
          {taskStatusOptions.map((s) => (
            <DropdownMenuCheckboxItem
              key={s}
              checked={value.status.includes(s)}
              onCheckedChange={() => onChange({ ...value, status: toggle(value.status, s) })}
              onSelect={(e) => e.preventDefault()}
            >
              {s.replace("_", " ")}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>Type</DropdownMenuLabel>
          {(["ai", "human"] as const).map((t) => (
            <DropdownMenuCheckboxItem
              key={t}
              checked={value.type.includes(t)}
              onCheckedChange={() => onChange({ ...value, type: toggle(value.type, t) })}
              onSelect={(e) => e.preventDefault()}
            >
              {t === "ai" ? "AI" : "Human"}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>

        {groups.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Group</DropdownMenuLabel>
              {groups.map((g) => (
                <DropdownMenuCheckboxItem
                  key={g.id}
                  checked={value.groupId.includes(g.id)}
                  onCheckedChange={() =>
                    onChange({ ...value, groupId: toggle(value.groupId, g.id) })
                  }
                  onSelect={(e) => e.preventDefault()}
                >
                  {g.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
