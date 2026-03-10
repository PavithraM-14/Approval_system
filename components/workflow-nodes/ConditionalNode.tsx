'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface ConditionalNodeData {
  label?: string;
  condition?: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';
    value: any;
  };
  description?: string;
}

const ConditionalNode: React.FC<NodeProps<ConditionalNodeData>> = ({ data, selected }) => {
  const formatCondition = () => {
    if (!data?.condition) return null;
    const { field, operator, value } = data.condition;
    const operatorMap: Record<string, string> = {
      eq: '=',
      ne: '≠',
      gt: '>',
      gte: '≥',
      lt: '<',
      lte: '≤',
      contains: 'contains',
    };
    return `${field} ${operatorMap[operator]} ${value}`;
  };

  return (
    <div
      className={`relative px-5 py-4 bg-amber-50 min-w-[180px] ${
        selected ? 'shadow-lg' : ''
      } transition-all`}
      style={{
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
      }}
      title={`Conditional Node${data?.condition ? ` - ${formatCondition()}` : ''}`}
    >
      <div
        className={`absolute inset-0 border-2 ${
          selected ? 'border-amber-600' : 'border-amber-400'
        }`}
        style={{
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-amber-500 border-2 border-white"
        title="Connect from previous step"
      />
      <div className="relative flex flex-col items-center gap-1 px-4">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="font-semibold text-amber-900 text-sm">
            {data?.label || 'Condition'}
          </div>
        </div>
        {data?.condition && (
          <div className="text-xs text-amber-700 font-mono text-center mt-1">
            {formatCondition()}
          </div>
        )}
        {data?.description && (
          <div className="text-xs text-amber-600 text-center">{data.description}</div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="w-3 h-3 bg-green-500 border-2 border-white"
        style={{ top: '35%' }}
        title="True path - condition met"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="w-3 h-3 bg-red-500 border-2 border-white"
        style={{ top: '65%' }}
        title="False path - condition not met"
      />
    </div>
  );
};

export default memo(ConditionalNode);
