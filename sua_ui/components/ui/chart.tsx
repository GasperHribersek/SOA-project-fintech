import * as React from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

type ChartProps = React.ComponentProps<typeof LineChart>;

export interface SimpleLineChartProps extends Omit<ChartProps, "data"> {
    data: { name: string; value: number }[];
    xKey?: string;
    yKey?: string;
    colorClassName?: string;
}

export function SimpleLineChart({
    data,
    xKey = "name",
    yKey = "value",
    colorClassName = "text-primary",
    ...props
}: SimpleLineChartProps) {
    return (
        <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ left: 0, right: 8, top: 10, bottom: 10 }} {...props}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
                    <XAxis
                        dataKey={xKey}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        className="text-[11px] fill-muted-foreground"
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={4}
                        className="text-[11px] fill-muted-foreground"
                    />
                    <Tooltip
                        cursor={{ strokeOpacity: 0.1 }}
                        contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: 8,
                            fontSize: 12,
                        }}
                        labelClassName="text-xs text-muted-foreground"
                    />
                    <Line
                        type="monotone"
                        dataKey={yKey}
                        stroke="currentColor"
                        strokeWidth={2}
                        dot={{ r: 3, strokeWidth: 1 }}
                        activeDot={{ r: 5, strokeWidth: 1.5 }}
                        className={colorClassName}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}


