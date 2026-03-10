'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface ApprovalNodeData {
  label?: string;
  roleId?: string;
  roleName?: string;
  description?: string;
}

const ApprovalNode: React.FC<NodeProps<ApprovalNodeData>> = ({ data, selected }) => {
  return (
    <div
      className={`px-5 py-4 rounded-lg border-2 bg-blue-50 min-w-[180px] ${
        selected ? 'border-blue-600 shadow-lg' : 'border-blue-400'
      } transition-all`}
      title={`Approval Node${data?.roleName ? ` - Role: ${data.roleName}` : ''}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
        title="Connect from previous step"
      />
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-1">
          <svg
            className="w-5 h-5 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-blue-900 text-sm">
            {data?.label || 'Approval'}
          </div>
          {data?.roleName && (
            <div className="text-xs text-blue-700 mt-1 font-medium">
              Role: {data.roleName}
            </div>
          )}
          {data?.description && (
            <div className="text-xs text-blue-600 mt-1">{data.description}</div>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
        title="Connect to next step"
      />
    </div>
  );
};

export default memo(ApprovalNode);
