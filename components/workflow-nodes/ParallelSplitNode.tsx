'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface ParallelSplitNodeData {
  label?: string;
  description?: string;
}

const ParallelSplitNode: React.FC<NodeProps<ParallelSplitNodeData>> = ({ data, selected }) => {
  return (
    <div
      className={`relative px-5 py-4 bg-purple-50 min-w-[160px] ${
        selected ? 'shadow-lg' : ''
      } transition-all`}
      style={{
        clipPath: 'polygon(15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%, 0% 50%)',
      }}
      title="Parallel Split - Creates multiple parallel approval paths"
    >
      <div
        className={`absolute inset-0 border-2 ${
          selected ? 'border-purple-600' : 'border-purple-400'
        }`}
        style={{
          clipPath: 'polygon(15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%, 0% 50%)',
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-purple-500 border-2 border-white"
        style={{ left: '15%' }}
        title="Connect from previous step"
      />
      <div className="relative flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
          <div className="font-semibold text-purple-900 text-sm">
            {data?.label || 'Parallel Split'}
          </div>
        </div>
        {data?.description && (
          <div className="text-xs text-purple-700 text-center">{data.description}</div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="out-1"
        className="w-3 h-3 bg-purple-500 border-2 border-white"
        style={{ right: '15%', top: '35%' }}
        title="Parallel path 1"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="out-2"
        className="w-3 h-3 bg-purple-500 border-2 border-white"
        style={{ right: '15%', top: '65%' }}
        title="Parallel path 2"
      />
    </div>
  );
};

export default memo(ParallelSplitNode);
