"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "@base-ui/react/slider"

import { cn } from "@/lib/utils"

const THUMB_CLASS = "border-primary ring-ring/50 size-4 rounded-full border bg-white shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden block shrink-0 select-none disabled:pointer-events-none disabled:opacity-50"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumbAriaLabel,
  getThumbTooltipLabel,
  ...props
}: SliderPrimitive.Root.Props & {
  thumbAriaLabel?: string;
  getThumbTooltipLabel?: (value: number) => string;
}) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className={cn("data-vertical:min-h-40 relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:w-auto data-vertical:flex-col", getThumbTooltipLabel && "group")}>
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="bg-muted rounded-full data-horizontal:h-1.5 data-horizontal:w-full data-vertical:h-full data-vertical:w-1.5 relative grow overflow-hidden select-none"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => {
          if (!getThumbTooltipLabel) {
            return (
              <SliderPrimitive.Thumb
                data-slot="slider-thumb"
                key={index}
                getAriaLabel={thumbAriaLabel ? () => thumbAriaLabel : undefined}
                className={THUMB_CLASS}
              />
            )
          }
          const pct = ((_values[index] - min) / (max - min)) * 100
          return (
            <React.Fragment key={index}>
              <SliderPrimitive.Thumb
                data-slot="slider-thumb"
                getAriaLabel={thumbAriaLabel ? () => thumbAriaLabel : undefined}
                className={THUMB_CLASS}
              />
              <div
                className="pointer-events-none absolute bottom-full z-10 -translate-x-1/2 -translate-y-2 opacity-0 transition-opacity group-hover:opacity-100"
                style={{ left: `${pct}%` }}
              >
                <div className="rounded bg-foreground px-1.5 py-0.5 text-xs text-background whitespace-nowrap">
                  {getThumbTooltipLabel(_values[index])}
                </div>
              </div>
            </React.Fragment>
          )
        })}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
