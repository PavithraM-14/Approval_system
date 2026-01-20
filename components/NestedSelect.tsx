import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export interface SubOption {
    label: string;
    value: string;
}

export interface Option {
    label: string;
    value?: string; // If missing, it's a parent node (unless it has no subOptions, then it's a label?)
    subOptions?: SubOption[];
}

interface NestedSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: (Option | string)[]; // Can be simple string or object
    placeholder?: string;
    error?: string;
    className?: string;
    dropUp?: boolean;
    disabled?: boolean;
}

export default function NestedSelect({
    value,
    onChange,
    options,
    placeholder = 'Select Option',
    error,
    className,
    dropUp = false,
    disabled = false
}: NestedSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredOption, setHoveredOption] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [subMenuPos, setSubMenuPos] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        setHoveredOption(null);
    };

    const handleMouseEnter = (event: React.MouseEvent<HTMLDivElement>, uniqueKey: string) => {
        setHoveredOption(uniqueKey);
        const rect = event.currentTarget.getBoundingClientRect();
        if (rect) {
            setSubMenuPos({
                top: rect.top,
                left: rect.right
            });
        }
    };

    // Helper to normalize option to object
    const normalizeOption = (opt: Option | string): Option => {
        if (typeof opt === 'string') {
            return { label: opt, value: opt };
        }
        return opt;
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full text-left border rounded-lg px-4 py-3 flex items-center justify-between shadow-sm transition-all duration-200
          ${error ? 'border-red-500 focus:ring-red-200' : 'border-gray-300'}
          ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:border-gray-400 focus:ring-blue-500 focus:border-blue-500 cursor-pointer'}
          focus:outline-none focus:ring-2`}
            >
                <span className={`block truncate ${!value ? 'text-gray-500' : 'text-gray-900 font-medium'}`}>
                    {value || placeholder}
                </span>
                <ChevronDownIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
            </button>

            {isOpen && !disabled && (
                <div className={`absolute z-50 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-visible focus:outline-none sm:text-sm ${dropUp ? 'bottom-full mb-1' : 'mt-1'}`}>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {options.map((rawOpt) => {
                            const opt = normalizeOption(rawOpt);
                            const hasSub = !!opt.subOptions && opt.subOptions.length > 0;
                            const uniqueKey = opt.label; // Assuming generic labels are unique enough for key

                            return (
                                <div
                                    key={uniqueKey}
                                    className="relative group"
                                    onMouseEnter={(e) => handleMouseEnter(e, uniqueKey)}
                                    onMouseLeave={() => setHoveredOption(null)}
                                >
                                    <div
                                        className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 text-gray-900 flex justify-between items-center
                      ${value === opt.value ? 'bg-blue-50 font-medium' : ''}`}
                                        onClick={() => {
                                            if (!hasSub && opt.value) {
                                                handleSelect(opt.value);
                                            }
                                        }}
                                    >
                                        <span className="block truncate">{opt.label}</span>
                                        {hasSub && (
                                            <ChevronRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                                        )}
                                    </div>

                                    {/* Submenu */}
                                    {hasSub && hoveredOption === uniqueKey && subMenuPos && (
                                        <div
                                            className="fixed w-64 bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-[100] max-h-60 overflow-y-auto"
                                            style={{
                                                top: subMenuPos.top,
                                                left: subMenuPos.left,
                                            }}
                                        >
                                            {opt.subOptions?.map((sub) => (
                                                <div
                                                    key={sub.value}
                                                    className="cursor-pointer select-none relative py-2 pl-3 pr-4 hover:bg-blue-50 text-gray-900 break-words"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSelect(sub.value);
                                                    }}
                                                >
                                                    <span className="block">{sub.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
    );
}
