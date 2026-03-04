"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { WorkspaceOverview } from "@/components/workspace/workspace-overview";

export default function WorkspaceOverviewPage() {
  const params = useParams<{ workspace: string }>();
  const { data: workspace } = trpc.workspace.get.useQuery(
    { slug: params.workspace },
  );

  if (!workspace) return null;

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-lg font-semibold">{workspace.name}</h2>
        <Badge variant="secondary" className="mt-1 font-mono text-xs">
          {workspace.slug}
        </Badge>
      </div>

      <Separator />

      <WorkspaceOverview workspaceId={workspace.id} workspaceSlug={params.workspace} />
    </div>
  );
}
