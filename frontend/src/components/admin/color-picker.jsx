"use client"

import { useState } from "react"

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#64748b", // slate
  "#000000", // black
  "#ffffff", // white
  "#6b7280", // gray
]

export default function ColorPicker({ value, onChange, label }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={"space-y-3"}>
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}

      <div className="space-y-4">
        {/* Color Input */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-12 h-12 rounded-lg border-2 border-border cursor-pointer bg-transparent"
              style={{
                WebkitAppearance: "none",
                MozAppearance: "none",
                appearance: "none",
              }}
            />
            <div className="absolute inset-1 rounded-md pointer-events-none" style={{ backgroundColor: value }} />
          </div>

          <div className="flex-1">
            <input
              type="text"
              value={value}
              onChange={(e) => {
                const color = e.target.value
                if (/^#[0-9A-F]{6}$/i.test(color) || color === "") {
                  onChange(color)
                }
              }}
              placeholder="#000000"
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
        </div>

        {/* Preset Colors */}
        <div className="space-y-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isOpen ? "Ẩn màu có sẵn" : "Hiện màu có sẵn"}
          </button>

          {isOpen && (
            <div className="grid grid-cols-6 gap-2 p-3 bg-muted/50 rounded-lg">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => onChange(color)}
                  className={"w-8 h-8 rounded-md border-2 transition-all hover:scale-110 border-border hover:border-ring/50"}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}