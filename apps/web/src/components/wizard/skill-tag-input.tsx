"use client";

import React, { useState, useRef, useEffect } from "react";

interface SkillTagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
}

export default function SkillTagInput({ value, onChange, suggestions }: SkillTagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) => 
      s.toLowerCase().includes(inputValue.toLowerCase()) && 
      !value.includes(s)
  );

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <span 
            key={tag} 
            className="inline-flex items-center pl-4 pr-2 py-1.5 bg-accent text-accent-ink rounded-full text-sm font-semibold shadow-sm"
          >
            {tag}
            <button 
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-2 p-1 hover:bg-black/10 rounded-full transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </span>
        ))}
      </div>

      <div className="relative">
        <input
          type="text"
          className="w-full px-5 py-4 bg-panel border-2 border-border rounded-2xl text-ink focus:border-accent outline-none transition-all shadow-sm placeholder:text-muted/50"
          placeholder="Search or type a skill..."
          value={inputValue}
          onFocus={() => setIsFocused(true)}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(inputValue);
            }
          }}
        />

        {isFocused && (inputValue || filteredSuggestions.length > 0) && (
          <div className="absolute z-50 top-full left-0 w-full mt-2 max-h-60 overflow-auto bg-panel border-2 border-border rounded-2xl shadow-2xl">
            {filteredSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="w-full px-5 py-3 text-left hover:bg-bg transition-colors text-ink border-b border-border last:border-0 font-medium"
                onClick={() => addTag(s)}
              >
                {s}
              </button>
            ))}
            {inputValue && !suggestions.some(s => s.toLowerCase() === inputValue.toLowerCase()) && (
              <button
                type="button"
                className="w-full px-5 py-3 text-left hover:bg-bg transition-colors text-accent font-bold italic"
                onClick={() => addTag(inputValue)}
              >
                Add custom: "{inputValue}"
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
