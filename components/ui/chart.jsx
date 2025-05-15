"use client"

import * as React from "react"
import {
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  TooltipProps
} from "recharts"
import { cn } from "@/lib/utils"

const ChartContext = React.createContext({
  colors: {},
})

export function ChartContainer({
  children,
  config,
  className,
  ...props
}) {
  const colors = React.useMemo(() => {
    return Object.entries(config).reduce((acc, [key, value]) => {
      return {
        ...acc,
        [key]:
          typeof value.color === "function"
            ? value.color
            : () => value.color || "#000",
      }
    }, {})
  }, [config])

  return (
    <ChartContext.Provider value={{ colors }}>
      <ResponsiveContainer width="100%" height="100%" className={className} {...props}>
        {children}
      </ResponsiveContainer>
    </ChartContext.Provider>
  )
}

// Tooltip with styled content
export function ChartTooltip({
  children,
  content,
  ...props
}) {
  if (content) {
    return <RechartsTooltip content={content} {...props} />
  }

  return <RechartsTooltip {...props} />
}

// Custom styled tooltip content
export function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  formatter,
  labelFormatter,
  ...props
}) {
  const { colors } = React.useContext(ChartContext)

  if (!active || !payload?.length) {
    return null
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-background p-2 shadow-md",
        className
      )}
      {...props}
    >
      {label && (
        <div className="grid grid-flow-col grid-rows-1 place-content-center mb-2">
          <span className="text-[0.70rem] uppercase text-muted-foreground">
            {labelFormatter ? labelFormatter(label, payload) : label}
          </span>
        </div>
      )}
      <div className="grid gap-0.5">
        {payload.map((item, index) => {
          const color = colors[item.dataKey]
            ? colors[item.dataKey](item, index)
            : item.color || "#000"

          return (
            <div
              key={`item-${index}`}
              className="grid grid-flow-col grid-rows-1 place-content-between gap-2 text-sm"
            >
              <div className="flex items-center gap-1">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ background: color }}
                />
                <span className="font-medium">{item.name}</span>
              </div>
              <span className="font-medium text-muted-foreground">
                {formatter ? formatter(item.value, item.name, item, index) : item.value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Custom Legend
export function ChartLegend({ content, ...props }) {
  if (content) {
    return <Legend content={content} {...props} />
  }

  return <Legend {...props} />
}

// Custom Legend Content
export function ChartLegendContent(props) {
  const { payload } = props
  const { colors } = React.useContext(ChartContext)

  if (!payload?.length) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
      {payload.map((entry, index) => {
        const color = colors[entry.dataKey]
          ? colors[entry.dataKey](entry, index)
          : entry.color || "#000"

        return (
          <div key={`item-${index}`} className="flex items-center gap-1">
            <div
              className="h-2 w-2 rounded-full"
              style={{ background: color }}
            />
            <span className="text-muted-foreground">{entry.value}</span>
          </div>
        )
      })}
    </div>
  )
}