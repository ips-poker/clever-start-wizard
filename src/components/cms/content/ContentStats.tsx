import { Badge } from "@/components/ui/badge";
import { ContentStats as StatsType } from "@/types/cms";

interface ContentStatsProps {
  stats: StatsType;
  label: string;
}

export function ContentStats({ stats, label }: ContentStatsProps) {
  if (stats.total === 0) {
    return (
      <p className="text-sm text-muted-foreground mt-2">
        Нет элементов контента
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <p className="text-sm text-muted-foreground">
        {stats.active} активных из {stats.total} элементов
      </p>
      <Badge variant="outline" className="text-xs">
        {stats.active}/{stats.total}
      </Badge>
    </div>
  );
}