/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import {ResponsiveContainer, Tooltip as RechartsTooltip} from "recharts"
import type {TooltipProps as RechartsTooltipProps} from "recharts"
import type {ValueType, NameType} from "recharts/types/component/DefaultTooltipContent"

import {cn} from "@/lib/utils"

export type ChartConfig = Record<string, { label?: string | null; color?: string | null }>

type ChartContextValue = {
    config: ChartConfig
    data?: Array<Record<string, unknown>>
}

const ChartContext = React.createContext<ChartContextValue | undefined>(undefined)

export function useChart() {
    const context = React.useContext(ChartContext)
    if (!context) {
        throw new Error("useChart must be used within a ChartContainer")
    }
    return context
}

export type ChartContainerProps = React.HTMLAttributes<HTMLDivElement> & {
    config?: ChartConfig | null
    data?: Array<Record<string, unknown>>
}

export function ChartContainer({
    config,
    data,
    className,
    style,
    children,
    ...props
}: ChartContainerProps) {
    const mergedConfig = React.useMemo(() => config ?? {}, [config])
    const cssVariables = React.useMemo(() => {
        const base = Object.entries(mergedConfig).reduce((acc, [key, entry], index) => {
            const fallbackColor = `hsl(var(--chart-${(index % 5) + 1}))`
            const color = entry?.color ?? fallbackColor
            acc[`--color-${key}` as keyof React.CSSProperties] = color
            return acc
        }, {} as React.CSSProperties)
        return {...base, ...style}
    }, [mergedConfig, style])

    return (
        <ChartContext.Provider value={{config: mergedConfig, data}}>
            <div className={cn("h-[360px] w-full", className)} style={cssVariables} {...props}>
                <ResponsiveContainer width="100%" height="100%">
                    {children as React.ReactElement}
                </ResponsiveContainer>
            </div>
        </ChartContext.Provider>
    )
}

type ChartTooltipContentProps = RechartsTooltipProps<ValueType, NameType> & {
    indicator?: "dot" | "line" | "bar"
}

const formatTooltipValue = (value: ValueType) => {
    if (typeof value === "number") {
        return value.toLocaleString()
    }
    if (typeof value === "string") {
        return value
    }
    if (value == null) {
        return ""
    }
    return String(value)
}

export function ChartTooltipContent({active, payload, label, indicator = "dot"}: ChartTooltipContentProps) {
    const {config} = useChart()

    if (!active || !payload || payload.length === 0) {
        return null
    }

    return (
        <div className="grid gap-2 rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md">
            {label ? <div className="text-xs font-medium text-muted-foreground">{label}</div> : null}
            {payload.map((item) => {
                if (!item) {
                    return null
                }
                const key = String(item.dataKey ?? item.name ?? "")
                const entry = config[key] ?? {}
                const color = entry.color ?? `var(--color-${key})`
                return (
                    <div key={key} className="flex items-center justify-between gap-6 text-xs">
                        <span className="flex items-center gap-2 font-medium">
                            <span
                                className={cn("inline-block h-2 w-2", indicator === "bar" ? "rounded-sm" : "rounded-full")}
                                style={{backgroundColor: color}}
                            />
                            {entry.label ?? key}
                        </span>
                        <span className="font-semibold tabular-nums">{formatTooltipValue(item.value)}</span>
                    </div>
                )
            })}
        </div>
    )
}

type ChartTooltipProps = Omit<RechartsTooltipProps<ValueType, NameType>, "content"> & {
    content?: React.ReactNode
}

export function ChartTooltip({content, ...props}: ChartTooltipProps) {
    return (
        <RechartsTooltip
            {...props}
            content={(tooltipProps) => {
                if (React.isValidElement(content)) {
                    return React.cloneElement(content, tooltipProps)
                }
                const Component = (content ?? ChartTooltipContent) as React.ComponentType<ChartTooltipContentProps>
                return <Component {...tooltipProps}/>
            }}
            wrapperClassName="!outline-none"
        />
    )
}
