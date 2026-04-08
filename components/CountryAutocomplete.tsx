'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { CHECKOUT_COUNTRY_OPTIONS } from '@/lib/checkout-countries';

type Option = (typeof CHECKOUT_COUNTRY_OPTIONS)[number];

function labelForValue(code: string): string {
  const o = CHECKOUT_COUNTRY_OPTIONS.find((x) => x.value === code);
  return o?.label ?? '';
}

export interface CountryAutocompleteProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  required?: boolean;
  id?: string;
  'aria-label'?: string;
}

export function CountryAutocomplete({
  value,
  onChange,
  className = '',
  inputClassName = '',
  placeholder = 'Search country…',
  required,
  id,
  'aria-label': ariaLabel,
}: CountryAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(() => labelForValue(value));
  const [highlighted, setHighlighted] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listId = useRef(`country-ac-${Math.random().toString(36).slice(2, 9)}`).current;

  useEffect(() => {
    if (!open) setInputValue(labelForValue(value));
  }, [value, open]);

  const filtered = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return [...CHECKOUT_COUNTRY_OPTIONS];
    return CHECKOUT_COUNTRY_OPTIONS.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [inputValue]);

  useEffect(() => {
    setHighlighted((h) => Math.min(h, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  const pick = useCallback(
    (opt: Option) => {
      onChange(opt.value);
      setInputValue(opt.label);
      setOpen(false);
    },
    [onChange]
  );

  const handleBlur = useCallback(() => {
    window.setTimeout(() => {
      if (wrapperRef.current?.contains(document.activeElement)) return;
      setOpen(false);
      const t = inputValue.trim().toLowerCase();
      const exact = CHECKOUT_COUNTRY_OPTIONS.find(
        (o) => o.label.toLowerCase() === t || o.value.toLowerCase() === t
      );
      if (exact) {
        onChange(exact.value);
        setInputValue(exact.label);
      } else {
        setInputValue(labelForValue(value));
      }
    }, 150);
  }, [inputValue, onChange, value]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlighted((h) => Math.min(h + 1, Math.max(0, filtered.length - 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setHighlighted((h) => Math.max(h - 1, 0));
      return;
    }
    if (!open) return;
    if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault();
      pick(filtered[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setInputValue(labelForValue(value));
    }
  };

  return (
    <div ref={wrapperRef} className={`relative min-w-0 ${className}`}>
      <input
        type="text"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        autoComplete="off"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        required={required}
        className={inputClassName}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-600 bg-gray-900 py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400">No matches</li>
          ) : (
            filtered.map((opt, i) => (
              <li key={opt.value} role="option" aria-selected={i === highlighted}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-white hover:bg-gray-700 ${
                    i === highlighted ? 'bg-gray-700' : ''
                  }`}
                  onMouseEnter={() => setHighlighted(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(opt);
                  }}
                >
                  <span>{opt.label}</span>
                  <span className="shrink-0 text-xs text-gray-500">{opt.value}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
