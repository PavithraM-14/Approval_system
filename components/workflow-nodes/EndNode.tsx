'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface EndNodeData {
  label?: string;
  description?: string;
}

const EndNode: React.FC<NodeProps<EndNodeData>> = ({ data, selected }) => {
  return (
    <div
      className={`px-6 py-4 rounded-lg border-2 bg-red-50 relative min-w-[120px] ${
        selected ? 'border-red-600 shadow-lg' : 'border-red-400'
      } transition-all`}
      title="End Node - Workflow completion point"
    >
      {/* Left handle only - end nodes don't need output */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-red-500 !border-2 !border-white"
        style={{ left: '-6px', top: '50%' }}
        title="Connect from final step"
      />
      
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <div className="font-semibold text-red-900">{data?.label || 'End'}</div>
      </div>
      {data?.description && (
        <div className="text-xs text-red-700 mt-1">{data.description}</div>
      )}
    </div>
  );
};

export default memo(EndNode);
