'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface ParallelJoinNodeData {
  label?: string;
  description?: string;
}

const ParallelJoinNode: React.FC<NodeProps<ParallelJoinNodeData>> = ({ data, selected }) => {
  return (
    <div
      className={`relative px-5 py-4 bg-indigo-50 min-w-[160px] ${
        selected ? 'shadow-lg' : ''
      } transition-all`}
      style={{
        clipPath: 'polygon(15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%, 0% 50%)',
      }}
      title="Parallel Join - Waits for all parallel paths to complete"
    >
      <div
        className={`absolute inset-0 border-2 ${
          selected ? 'border-indigo-600' : 'border-indigo-400'
        }`}
        style={{
          clipPath: 'polygon(15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%, 0% 50%)',
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="in-1"
        className="w-3 h-3 bg-indigo-500 border-2 border-white"
        style={{ left: '15%', top: '35%' }}
        title="Parallel path 1 input"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="in-2"
        className="w-3 h-3 bg-indigo-500 border-2 border-white"
        style={{ left: '15%', top: '65%' }}
        title="Parallel path 2 input"
      />
      <div className="relative flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-indigo-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 7h16M4 7l4-4M4 7l4 4m12 6H4m16 0l-4 4m4-4l-4-4"
            />
          </svg>
          <div className="font-semibold text-indigo-900 text-sm">
            {data?.label || 'Parallel Join'}
          </div>
        </div>
        {data?.description && (
          <div className="text-xs text-indigo-700 text-center">{data.description}</div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-indigo-500 border-2 border-white"
        style={{ right: '15%' }}
        title="Connect to next step"
      />
    </div>
  );
};

export default memo(ParallelJoinNode);
