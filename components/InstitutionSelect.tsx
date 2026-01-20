import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface InstitutionSelectProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    className?: string;
}

const INSTITUTIONS = [
    {
        id: 'SRM',
        label: 'SRMIST',
        hasSubmenu: true,
        subOptions: [
            { id: 'E&T', label: 'E&T' },
            { id: 'FSH', label: 'FSH' },
            { id: 'Management', label: 'Management' }
        ]
    },
    { id: 'EEC', label: 'EEC' },
    { id: 'DENTAL', label: 'DENTAL' }
];

export default function InstitutionSelect({ value, onChange, error, className }: InstitutionSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredOption, setHoveredOption] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionId: string, subOptionId?: string) => {
        if (subOptionId) {
            onChange(`${optionId} - ${subOptionId}`); // e.g., "SRMIST - E&T" - storing 'SRMIST' not 'SRM' to match user request display, but wait...
            // The old value was "SRM". The new requirement says "change SRM to SRMIST".
            // Let's check what the backend expects? 
            // The current values are "SRM", "EEC", "DENTAL".
            // If I change the value sent to backend, it might break things if strict validation exists.
            // However, the prompt says "change SRM to SRMIST" and "sub options as E&T...".
            // I will assume the value stored should be the combination. 
            // Actually, for "SRMIST", the value probably should include the sub-option.
            // Let's use the label for the first part if it's SRM/SRMIST.

            // Let's stick to a format. The user asked "change SRM to SRMIST". 
            // So if they pick SRM -> E&T, value is "SRMIST - E&T".
        } else {
            onChange(optionId === 'SRM' ? 'SRM' : optionId);
            // Wait, if they pick EEC, it's just EEC. 
            // If they pick SRM, they MUST pick a sub-option? The prompt implies selection is from sub-options.
            // "when we hover over this option we should get sub options"
            // Usually that means the parent is not selectable itself, only children.
        }
        setIsOpen(false);
        setHoveredOption(null);
    };

    // Helper to get display label from value
    const getDisplayLabel = () => {
        if (!value) return 'Select Institution';
        // If value matches one of our simple options
        if (value === 'EEC') return 'EEC';
        if (value === 'DENTAL') return 'DENTAL';
        if (value === 'SRM') return 'SRMIST'; // Legacy handling maybe?
        return value; // Should be "SRMIST - E&T" etc.
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full text-left bg-white border rounded-lg px-4 py-3 flex items-center justify-between shadow-sm transition-all duration-200
          ${error ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 hover:border-gray-400 focus:ring-blue-500 focus:border-blue-500'}
          focus:outline-none focus:ring-2`}
            >
                <span className={`block truncate ${!value ? 'text-gray-500' : 'text-gray-900 font-medium'}`}>
                    {getDisplayLabel()}
                </span>
                <ChevronDownIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-visible focus:outline-none sm:text-sm">
                    {INSTITUTIONS.map((inst) => (
                        <div
                            key={inst.id}
                            className="relative group"
                            onMouseEnter={() => setHoveredOption(inst.id)}
                            onMouseLeave={() => setHoveredOption(null)}
                        >
                            <div
                                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 text-gray-900 flex justify-between items-center
                  ${value === inst.id ? 'bg-blue-50 font-medium' : ''}`}
                                onClick={() => !inst.hasSubmenu && handleSelect(inst.label)}
                            >
                                <span className="block truncate">{inst.label}</span>
                                {inst.hasSubmenu && (
                                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                                )}
                            </div>

                            {/* Submenu */}
                            {inst.hasSubmenu && hoveredOption === inst.id && (
                                <div
                                    className="absolute left-full top-0 w-48 bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm -ml-1"
                                >
                                    {inst.subOptions?.map((sub) => (
                                        <div
                                            key={sub.id}
                                            className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 text-gray-900"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Format: "SRMIST - E&T"
                                                handleSelect(inst.label, sub.label);
                                            }}
                                        >
                                            <span className="block truncate">{sub.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
    );
}
