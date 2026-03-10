'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface StartNodeData {
  label?: string;
  description?: string;
}

const StartNode: React.FC<NodeProps<StartNodeData>> = ({ data, selected }) => {
  return (
    <div
      className={`px-6 py-4 rounded-full border-2 bg-green-50 ${
        selected ? 'border-green-600 shadow-lg' : 'border-green-400'
      } transition-all`}
      title="Start Node - Workflow entry point"
    >
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <div className="font-semibold text-green-900">{data?.label || 'Start'}</div>
      </div>
      {data?.description && (
        <div className="text-xs text-green-700 mt-1">{data.description}</div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-green-500 border-2 border-white"
        title="Connect to first step"
      />
    </div>
  );
};

export default memo(StartNode);
