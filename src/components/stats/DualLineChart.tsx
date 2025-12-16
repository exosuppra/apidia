import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts";

interface DualLineChartProps {
  title: string;
  data: Array<{ label: string; value: number; average: number }>;
  valueLabel?: string;
  averageLabel?: string;
  valueColor?: string;
  averageColor?: string;
}

export function DualLineChart({ 
  title, 
  data, 
  valueLabel = "Note",
  averageLabel = "Moyenne cumulative",
  valueColor = "hsl(var(--primary))", 
  averageColor = "hsl(48, 96%, 53%)" 
}: DualLineChartProps) {
  const chartConfig = {
    value: {
      label: valueLabel,
      color: valueColor,
    },
    average: {
      label: averageLabel,
      color: averageColor,
    },
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              tickFormatter={(value) => value.slice(0, 6)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              domain={[0, 5]}
              tickFormatter={(value) => value.toFixed(1)}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              name={valueLabel}
              stroke={valueColor}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="average"
              name={averageLabel}
              stroke={averageColor}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
