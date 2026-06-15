import { Construction } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { DashboardHeader } from "./dashboard-header";

interface ComingSoonProps {
  title: string;
  subtitle?: string;
  description: string;
}

export function ComingSoon({ title, subtitle, description }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <DashboardHeader title={title} subtitle={subtitle} />
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Construction className="h-6 w-6" />
          </div>
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}