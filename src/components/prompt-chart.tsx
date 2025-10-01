import {useMemo} from "react"
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    XAxis,
    YAxis,
} from "recharts"

import {ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig} from "@/components/ui/chart"

export type ChartPayload = {
    settings: {
        id?: string | null
        type?: string | null
        title?: string | null
        description?: string | null
        requested: {
            category_column?: string | null
            series_columns?: string[] | null
            max_rows?: number | null
        }
        resolved: {
            category_column?: string | null
            series_columns?: string[] | null
            uses_full_rows: boolean
        }
        missing_columns?: string[] | null
        chart_row_limit_applied?: number | null
        truncated: boolean
        config?: Record<string, unknown> | null
        source_query: string
    }
    data: Array<Record<string, unknown>>
    row_count: number
    total_rows_read: number
}

interface PromptChartProps {
    chart: ChartPayload
}

const FALLBACK_CATEGORY_KEY = "category"

const normalizeConfig = (seriesKeys: string[], rawConfig: Record<string, unknown> | null | undefined) => {
    const config: ChartConfig = {}
    for (const [index, key] of seriesKeys.entries()) {
        const entry = (rawConfig?.[key] ?? {}) as Record<string, unknown>
        const label = typeof entry.label === "string" ? (entry.label as string) : key
        const color = typeof entry.color === "string" ? (entry.color as string) : undefined
        config[key] = {label, color}
        if (!config[key].color) {
            config[key].color = `hsl(var(--chart-${(index % 5) + 1}))`
        }
    }
    return config
}

const resolveCategoryKey = (chart: ChartPayload, seriesKeys: string[]) => {
    const resolved = chart.settings.resolved?.category_column ?? undefined
    const requested = chart.settings.requested?.category_column ?? undefined
    const data = chart.data

    const availableKeys = new Set<string>()
    for (const row of data) {
        for (const key of Object.keys(row)) {
            availableKeys.add(key)
        }
    }

    if (resolved && availableKeys.has(resolved)) {
        return resolved
    }
    if (requested && availableKeys.has(requested)) {
        return requested
    }

    for (const row of data) {
        const keys = Object.keys(row)
        const candidate = keys.find((key) => !seriesKeys.includes(key))
        if (candidate) {
            return candidate
        }
    }

    return resolved ?? requested ?? FALLBACK_CATEGORY_KEY
}

const resolveSeriesKeys = (chart: ChartPayload) => {
    const resolved = chart.settings.resolved?.series_columns ?? []
    const requested = chart.settings.requested?.series_columns ?? []
    const initial = resolved.length > 0 ? resolved : requested
    return initial.filter((key): key is string => typeof key === "string" && key.length > 0)
}

export function PromptChart({chart}: PromptChartProps) {
    const dataset = chart.data ?? []

    const seriesKeys = useMemo(() => resolveSeriesKeys(chart), [chart])
    const categoryKey = useMemo(() => resolveCategoryKey(chart, seriesKeys), [chart, seriesKeys])
    const rawConfig = chart.settings.config as Record<string, unknown> | null | undefined
    const config = useMemo(() => normalizeConfig(seriesKeys, rawConfig), [seriesKeys, rawConfig])
    const chartType = chart.settings.type?.toLowerCase() ?? "line"

    if (!dataset.length || seriesKeys.length === 0) {
        return null
    }

    const renderCartesianAxes = (indicator: "line" | "bar" | "dot") => (
        <>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40"/>
            <XAxis dataKey={categoryKey} tickLine={false} axisLine={false} minTickGap={12} fontSize={12}/>
            <YAxis tickLine={false} axisLine={false} fontSize={12} width={72} allowDecimals/>
            <ChartTooltip content={<ChartTooltipContent indicator={indicator}/>}/>
        </>
    )

    const chartElement = (() => {
        if (chartType === "bar") {
            return (
                <BarChart data={dataset}>
                    {renderCartesianAxes("bar")}
                    {seriesKeys.map((key) => (
                        <Bar key={key} dataKey={key} fill={`var(--color-${key})`} radius={4} />
                    ))}
                </BarChart>
            )
        }

        if (chartType === "area") {
            return (
                <AreaChart data={dataset}>
                    {renderCartesianAxes("line")}
                    {seriesKeys.map((key) => (
                        <Area
                            key={key}
                            type="monotone"
                            dataKey={key}
                            stroke={`var(--color-${key})`}
                            fill={`var(--color-${key})`}
                            fillOpacity={0.25}
                        />
                    ))}
                </AreaChart>
            )
        }

        if (chartType === "pie") {
            const [firstSeries] = seriesKeys
            return (
                <PieChart>
                    <ChartTooltip content={<ChartTooltipContent indicator="dot"/>}/>
                    <Pie
                        data={dataset}
                        dataKey={firstSeries}
                        nameKey={categoryKey}
                        innerRadius={40}
                        outerRadius={120}
                        paddingAngle={4}
                    >
                        {dataset.map((entry, index) => {
                            const key = String(entry[categoryKey] ?? index)
                            const color = config[firstSeries]?.color ?? `hsl(var(--chart-${(index % 5) + 1}))`
                            return <Cell key={key} fill={color}/>
                        })}
                    </Pie>
                </PieChart>
            )
        }

        return (
            <LineChart data={dataset}>
                {renderCartesianAxes("line")}
                {seriesKeys.map((key) => (
                    <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={`var(--color-${key})`}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                    />
                ))}
            </LineChart>
        )
    })()

    const warnings: string[] = []
    if (Array.isArray(chart.settings.missing_columns) && chart.settings.missing_columns.length > 0) {
        warnings.push(`Missing columns: ${chart.settings.missing_columns.join(", ")}`)
    }
    if (chart.settings.truncated) {
        warnings.push("Chart data truncated due to configured max rows.")
    }
    if (chart.settings.resolved?.uses_full_rows) {
        warnings.push("Chart could not match requested series automatically. Showing full rows.")
    }

    return (
        <div className="space-y-4">
            <div className="space-y-1 text-right">
                {chart.settings.title ? (
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">{chart.settings.title}</h3>
                ) : null}
                {chart.settings.description ? (
                    <p className="text-sm text-muted-foreground">{chart.settings.description}</p>
                ) : null}
            </div>
            <ChartContainer className="h-[420px]" config={config} data={dataset}>
                {chartElement}
            </ChartContainer>
            {warnings.length > 0 ? (
                <div className="space-y-2 text-left text-xs text-muted-foreground">
                    {warnings.map((warning) => (
                        <p key={warning} className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-left text-xs text-muted-foreground">
                            {warning}
                        </p>
                    ))}
                </div>
            ) : null}
        </div>
    )
}
