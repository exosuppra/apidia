import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SiteStatsCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon?: React.ReactNode;
  className?: string;
  tooltip?: string;
}

export function SiteStatsCard({ title, value, trend, icon, className, tooltip }: SiteStatsCardProps) {
  const getTrendIcon = () => {
    if (trend === undefined || trend === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getTrendColor = () => {
    if (trend === undefined || trend === 0) return "text-muted-foreground";
    if (trend > 0) return "text-green-500";
    return "text-red-500";
  };

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px]">
                    <p className="text-sm">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-2xl font-bold">{value}</p>
          {trend !== undefined && (
            <div className={cn("flex items-center gap-1 text-sm", getTrendColor())}>
              {getTrendIcon()}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
