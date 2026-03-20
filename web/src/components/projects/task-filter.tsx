"use client";

import { useState } from "react";
import {
  RiFilterLine,
  RiDraftLine,
  RiHammerLine,
  RiArrowDownSLine,
} from "@remixicon/react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { taskStatusOptions } from "@/components/projects/task-status-badge";

export interface TaskFilters {
  status: string[];
  type: string[];
  groupId: number[];
  milestoneRef: string[];
  unassignedOnly: boolean;
  doneLimit: number;
  planStatus: string[];
}

export const DEFAULT_DONE_LIMIT = 5;

export function emptyFilters(): TaskFilters {
  return {
    status: [],
    type: [],
    groupId: [],
    milestoneRef: [],
    unassignedOnly: true,
    doneLimit: DEFAULT_DONE_LIMIT,
    planStatus: [],
  };
}

export function applyTaskFilters<
  T extends {
    status: string;
    type: string;
    taskGroupId: number | null;
    milestoneRef: string | null;
    needsPlan?: boolean;
  },
>(tasks: T[], filters: TaskFilters): T[] {
  return tasks.filter((task) => {
    if (filters.status.length > 0 && !filters.status.includes(task.status)) return false;
    if (filters.type.length > 0 && !filters.type.includes(task.type)) return false;
    if (filters.groupId.length > 0 && !filters.groupId.includes(task.taskGroupId ?? -1))
      return false;
    if (
      filters.milestoneRef.length > 0 &&
      (!task.milestoneRef || !filters.milestoneRef.includes(task.milestoneRef))
    )
      return false;
    if (filters.unassignedOnly && (task.milestoneRef !== null || task.taskGroupId !== null))
      return false;
    if (filters.planStatus.length > 0) {
      const taskPlanStatus = task.needsPlan ? "needs_plan" : "ready";
      if (!filters.planStatus.includes(taskPlanStatus)) return false;
    }
    return true;
  });
}

function countActiveFilters(filters: TaskFilters): number {
  let count =
    filters.status.length +
    filters.type.length +
    filters.groupId.length +
    filters.milestoneRef.length +
    filters.planStatus.length;
  if (filters.unassignedOnly) count++;
  if (filters.doneLimit !== DEFAULT_DONE_LIMIT) count++;
  return count;
}

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

interface MultiSelectComboboxProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

function MultiSelectCombobox({ label, options, selected, onChange }: MultiSelectComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-none border border-input/30 bg-input/30 px-2 py-1.5 text-xs hover:bg-muted"
        >
          <span className="truncate text-muted-foreground">
            {selected.length > 0 ? `${selected.length} selected` : `Select ${label.toLowerCase()}...`}
          </span>
          <RiArrowDownSLine className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No {label.toLowerCase()} found.</CommandEmpty>
            {options.map((opt) => (
              <CommandItem
                key={opt.value}
                value={opt.label}
                data-checked={selected.includes(opt.value)}
                onSelect={() => onChange(toggle(selected, opt.value))}
              >
                {opt.label}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const DONE_LIMIT_OPTIONS = [5, 10, 25, 0] as const;

function doneLimitLabel(limit: number): string {
  return limit === 0 ? "All" : String(limit);
}

interface TaskFilterProps {
  value: TaskFilters;
  onChange: (filters: TaskFilters) => void;
  groups: { id: number; name: string }[];
  milestones: { ref: string; title: string }[];
}

export function TaskFilter({ value, onChange, groups, milestones }: TaskFilterProps) {
  const activeCount = countActiveFilters(value);

  function handleUnassignedToggle(checked: boolean) {
    if (checked) {
      onChange({ ...value, unassignedOnly: true, milestoneRef: [], groupId: [] });
    } else {
      onChange({ ...value, unassignedOnly: false });
    }
  }

  function handleMilestoneChange(selected: string[]) {
    const next: Partial<TaskFilters> = { milestoneRef: selected };
    if (selected.length > 0 && value.unassignedOnly) next.unassignedOnly = false;
    onChange({ ...value, ...next });
  }

  function handleGroupChange(selected: number[]) {
    const next: Partial<TaskFilters> = { groupId: selected };
    if (selected.length > 0 && value.unassignedOnly) next.unassignedOnly = false;
    onChange({ ...value, ...next });
  }

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
      <DropdownMenuContent align="start" className="w-52">
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

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>Plan Status</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={value.planStatus.includes("needs_plan")}
            onCheckedChange={() =>
              onChange({ ...value, planStatus: toggle(value.planStatus, "needs_plan") })
            }
            onSelect={(e) => e.preventDefault()}
          >
            <RiDraftLine className="mr-1 size-3.5" />
            Needs plan
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={value.planStatus.includes("ready")}
            onCheckedChange={() =>
              onChange({ ...value, planStatus: toggle(value.planStatus, "ready") })
            }
            onSelect={(e) => e.preventDefault()}
          >
            <RiHammerLine className="mr-1 size-3.5" />
            Ready to implement
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between">
            Unassigned only
            <Switch
              checked={value.unassignedOnly}
              onCheckedChange={handleUnassignedToggle}
              className="scale-75"
            />
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        {milestones.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Milestone</DropdownMenuLabel>
              <div className="px-2 pb-1" onClick={(e) => e.stopPropagation()}>
                <MultiSelectCombobox
                  label="Milestones"
                  options={milestones.map((m) => ({ value: m.ref, label: m.title }))}
                  selected={value.milestoneRef}
                  onChange={handleMilestoneChange}
                />
              </div>
            </DropdownMenuGroup>
          </>
        )}

        {groups.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Group</DropdownMenuLabel>
              <div className="px-2 pb-1" onClick={(e) => e.stopPropagation()}>
                <MultiSelectCombobox
                  label="Groups"
                  options={groups.map((g) => ({ value: String(g.id), label: g.name }))}
                  selected={value.groupId.map(String)}
                  onChange={(selected) => handleGroupChange(selected.map(Number))}
                />
              </div>
            </DropdownMenuGroup>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>Done limit</DropdownMenuLabel>
          {DONE_LIMIT_OPTIONS.map((limit) => (
            <DropdownMenuCheckboxItem
              key={limit}
              checked={value.doneLimit === limit}
              onCheckedChange={() => onChange({ ...value, doneLimit: limit })}
              onSelect={(e) => e.preventDefault()}
            >
              {doneLimitLabel(limit)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
