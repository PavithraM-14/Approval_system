'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface OptionsNodeData {
  label?: string;
  description?: string;
  options?: Array<{
    id: string;
    label: string;
    roleId?: string;
    roleName?: string;
  }>;
}

const OptionsNode: React.FC<NodeProps<OptionsNodeData>> = ({ data, selected }) => {
  const nodeData = data as OptionsNodeData;
  const options = nodeData?.options || [];
  const hasOptions = options.length > 0;

  return (
    <div
      className={`
        relative px-4 py-3 bg-white min-w-[180px] shadow-lg rounded-lg border-2
        ${selected ? 'border-teal-500 shadow-xl' : 'border-gray-300'}
        transition-all
      `}
      title="Options - Forward to one or multiple users"
    >
      {/* Left handle - single input */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-teal-500 !border-2 !border-white"
        style={{ left: '-6px', top: '50%' }}
        title="Connect from previous step"
      />

      {/* Node content */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-teal-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
          <div className="font-semibold text-teal-900 text-sm">
            {nodeData?.label || 'Options'}
          </div>
        </div>
        
        {nodeData?.description && (
          <div className="text-xs text-gray-600 text-center">{nodeData.description}</div>
        )}

        {/* Options indicator */}
        {hasOptions && (
          <div className="w-full">
            <div className="text-xs text-gray-500 mb-1 text-center">Available options:</div>
            <div className="flex flex-wrap gap-1 justify-center">
              {options.slice(0, 3).map((option: any, index: number) => (
                <div
                  key={option.id || index}
                  className="px-2 py-1 bg-teal-100 rounded text-xs text-teal-700 font-medium"
                >
                  {option.label || `Option ${index + 1}`}
                </div>
              ))}
              {options.length > 3 && (
                <div className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 font-medium">
                  +{options.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}

        {!hasOptions && (
          <div className="text-xs text-gray-400 italic text-center">
            Configure options in properties
          </div>
        )}
      </div>

      {/* Right handles - multiple outputs */}
      <Handle
        type="source"
        position={Position.Right}
        id="option-1"
        className="w-3 h-3 !bg-teal-500 !border-2 !border-white"
        style={{ right: '-6px', top: '25%' }}
        title="Option 1"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="option-2"
        className="w-3 h-3 !bg-teal-500 !border-2 !border-white"
        style={{ right: '-6px', top: '50%' }}
        title="Option 2"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="option-3"
        className="w-3 h-3 !bg-teal-500 !border-2 !border-white"
        style={{ right: '-6px', top: '75%' }}
        title="Option 3"
      />
    </div>
  );
};

export default memo(OptionsNode);
