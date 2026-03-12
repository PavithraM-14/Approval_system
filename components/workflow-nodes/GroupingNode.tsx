'use client';

import React, { useState, useCallback } from 'react';
import { NodeProps } from '@xyflow/react';

interface GroupingNodeData {
  label?: string;
  description?: string;
  groupType?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  borderColor?: string;
}

export default function GroupingNode({ data, selected }: NodeProps) {
  const nodeData = data as GroupingNodeData;
  const [dimensions, setDimensions] = useState({
    width: nodeData?.width || 300,
    height: nodeData?.height || 200
  });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string>('');

  const backgroundColor = nodeData?.backgroundColor || 'rgba(59, 130, 246, 0.05)';
  const borderColor = nodeData?.borderColor || '#3b82f6';

  const handleMouseDown = useCallback((direction: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent the node from being dragged while resizing
    const nodeElement = e.currentTarget.closest('.react-flow__node');
    if (nodeElement) {
      nodeElement.setAttribute('data-dragging', 'false');
    }
    
    setIsResizing(true);
    setResizeDirection(direction);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = dimensions.width;
    const startHeight = dimensions.height;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;

      if (direction.includes('right')) {
        newWidth = Math.max(150, startWidth + deltaX);
      }
      if (direction.includes('left')) {
        newWidth = Math.max(150, startWidth - deltaX);
      }
      if (direction.includes('bottom')) {
        newHeight = Math.max(100, startHeight + deltaY);
      }
      if (direction.includes('top')) {
        newHeight = Math.max(100, startHeight - deltaY);
      }

      setDimensions({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Re-enable node dragging
      if (nodeElement) {
        nodeElement.removeAttribute('data-dragging');
      }
      
      setIsResizing(false);
      setResizeDirection('');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [dimensions]);

  return (
    <div 
      className={`
        relative rounded-xl border-2 border-dashed bg-opacity-50
        ${selected ? 'border-indigo-500' : ''}
        ${isResizing ? 'select-none' : ''}
      `}
      style={{
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        backgroundColor,
        borderColor: selected ? '#6366f1' : borderColor,
        borderWidth: '2px',
        borderStyle: 'dashed',
      }}
    >
      {/* Group label */}
      <div className="absolute top-2 left-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span className="text-sm font-medium text-blue-700">
          {nodeData?.label || 'Group'}
        </span>
        {nodeData?.groupType && (
          <span className="text-xs text-blue-500 bg-blue-100 px-2 py-1 rounded-full">
            {nodeData.groupType}
          </span>
        )}
      </div>

      {/* Group description */}
      {nodeData?.description && (
        <div className="absolute top-8 left-3 right-3">
          <p className="text-xs text-gray-600 italic">
            {nodeData.description}
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-3 left-3 right-3 text-center">
        <p className="text-xs text-gray-500">
          Drag nodes into this group area
        </p>
      </div>

      {/* Resize handles */}
      {selected && (
        <>
          {/* Corner handles */}
          <div 
            className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-nw-resize hover:bg-blue-600 z-10 nodrag"
            onMouseDown={handleMouseDown('top-left')}
            style={{ pointerEvents: 'all' }}
          />
          <div 
            className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-ne-resize hover:bg-blue-600 z-10 nodrag"
            onMouseDown={handleMouseDown('top-right')}
            style={{ pointerEvents: 'all' }}
          />
          <div 
            className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-sw-resize hover:bg-blue-600 z-10 nodrag"
            onMouseDown={handleMouseDown('bottom-left')}
            style={{ pointerEvents: 'all' }}
          />
          <div 
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-se-resize hover:bg-blue-600 z-10 nodrag"
            onMouseDown={handleMouseDown('bottom-right')}
            style={{ pointerEvents: 'all' }}
          />

          {/* Edge handles */}
          <div 
            className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-n-resize hover:bg-blue-600 z-10 nodrag"
            onMouseDown={handleMouseDown('top')}
            style={{ pointerEvents: 'all' }}
          />
          <div 
            className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-s-resize hover:bg-blue-600 z-10 nodrag"
            onMouseDown={handleMouseDown('bottom')}
            style={{ pointerEvents: 'all' }}
          />
          <div 
            className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-w-resize hover:bg-blue-600 z-10 nodrag"
            onMouseDown={handleMouseDown('left')}
            style={{ pointerEvents: 'all' }}
          />
          <div 
            className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-e-resize hover:bg-blue-600 z-10 nodrag"
            onMouseDown={handleMouseDown('right')}
            style={{ pointerEvents: 'all' }}
          />
        </>
      )}

      {/* Size indicator */}
      {selected && (
        <div className="absolute top-2 right-3 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
          {dimensions.width} × {dimensions.height}
        </div>
      )}
    </div>
  );
}