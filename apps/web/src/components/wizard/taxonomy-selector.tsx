"use client";

import React, { useState } from "react";

interface Option {
  id: string;
  label: string;
  sublabel?: string;
}

interface TaxonomySelectorProps {
  options: Option[];
  selected: string | null;
  onSelect: (label: string) => void;
  allowCustom?: boolean;
  customPlaceholder?: string;
}

export default function TaxonomySelector({
  options,
  selected,
  onSelect,
  allowCustom = false,
  customPlaceholder = "Enter custom...",
}: TaxonomySelectorProps) {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const handleCustomSubmit = () => {
    const val = customValue.trim();
    if (val) {
      onSelect(val);
      setIsCustomMode(false);
      setCustomValue("");
    } else {
      setIsCustomMode(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => {
            setIsCustomMode(false);
            onSelect(option.label);
          }}
          className={`
            p-6 text-left rounded-xl border-2 transition-all
            ${selected === option.label && !isCustomMode
              ? "border-accent bg-accent-light shadow-sm"
              : "border-border hover:border-accent/30 bg-panel hover:bg-bg"}
          `}
        >
          <div className="font-bold text-lg text-ink">{option.label}</div>
          {option.sublabel && (
            <div className="text-sm text-muted mt-1">{option.sublabel}</div>
          )}
        </button>
      ))}

      {allowCustom && (
        <div className="relative min-h-[100px]">
          {isCustomMode ? (
            <div className="h-full">
              <input
                autoFocus
                className="w-full p-6 h-full border-2 border-accent bg-panel rounded-xl text-ink outline-none shadow-inner"
                placeholder={customPlaceholder}
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onBlur={handleCustomSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCustomSubmit();
                  if (e.key === "Escape") setIsCustomMode(false);
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsCustomMode(true)}
              className={`
                w-full h-full p-6 text-left rounded-xl border-2 border-dashed transition-all
                ${!options.some(o => o.label === selected) && selected
                  ? "border-accent bg-accent-light"
                  : "border-muted hover:border-accent/30 bg-panel/50 hover:bg-bg"}
              `}
            >
              <div className="font-bold text-lg text-ink">
                {(!options.some(o => o.label === selected) && selected) ? selected : "Other"}
              </div>
              <div className="text-sm text-muted mt-1">
                {(!options.some(o => o.label === selected) && selected) ? "Click to change" : "Enter a custom category"}
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
