"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog";

export default function HomePage() {
  const { data: workspaces, isLoading, error } = trpc.workspace.list.useQuery();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold">Workspaces</h1>

      {isLoading && (
        <p className="text-sm text-muted-foreground" aria-live="polite">Loading...</p>
      )}

      {error && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12">
            <p className="text-sm font-medium">Failed to load workspaces</p>
            <p className="text-xs text-muted-foreground">{error.message}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && workspaces?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <p className="text-sm text-muted-foreground">
              No workspaces yet. Create one to get started.
            </p>
            <CreateWorkspaceDialog />
          </CardContent>
        </Card>
      )}

      {workspaces && workspaces.length > 0 && (
        <div className="flex flex-col gap-3">
          {workspaces.map((ws) => (
            <Link key={ws.id} href={`/w/${ws.slug}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{ws.name}</CardTitle>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {ws.slug}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(ws.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
          <div className="mt-2">
            <CreateWorkspaceDialog />
          </div>
        </div>
      )}
    </div>
  );
}
