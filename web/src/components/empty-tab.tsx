import { Card, CardContent } from "@/components/ui/card";

export function EmptyTab({ title }: { title: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-16">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">Coming soon</p>
      </CardContent>
    </Card>
  );
}
