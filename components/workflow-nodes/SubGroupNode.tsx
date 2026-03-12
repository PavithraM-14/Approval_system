'use client';

import React, { useState, useCallback } from 'react';
import { NodeProps } from '@xyflow/react';

interface SubGroupNodeData {
  label?: string;
  description?: string;
  subGroupType?: string;
  parentGroupId?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  borderColor?: string;
  level?: number; // Nesting level for visual hierarchy
}

export default function SubGroupNode({ data, selected }: NodeProps) {
  const nodeData = data as SubGroupNodeData;
  const level = nodeData.level || 1;
  const [dimensions, setDimensions] = useState({
    width: nodeData.width || 250,
    height: nodeData.height || 150
  });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string>('');

  const backgroundColor = nodeData.backgroundColor || `rgba(139, 69, 19, ${0.03 + (level * 0.02)})`;
  const borderColor = nodeData.borderColor || '#8b4513';

  // Adjust border style based on nesting level
  const borderStyle = level === 1 ? 'dashed' : level === 2 ? 'dotted' : 'solid';
  const borderWidth = Math.max(1, 3 - level);

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
        newWidth = Math.max(120, startWidth + deltaX);
      }
      if (direction.includes('left')) {
        newWidth = Math.max(120, startWidth - deltaX);
      }
      if (direction.includes('bottom')) {
        newHeight = Math.max(80, startHeight + deltaY);
      }
      if (direction.includes('top')) {
        newHeight = Math.max(80, startHeight - deltaY);
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
        relative rounded-lg border-2 bg-opacity-50
        ${selected ? 'border-orange-500' : ''}
        ${isResizing ? 'select-none' : ''}
      `}
      style={{
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        backgroundColor,
        borderColor: selected ? '#f97316' : borderColor,
        borderWidth: `${borderWidth}px`,
        borderStyle,
        // Higher z-index than parent groups but lower than workflow nodes
        zIndex: level * -0.5,
      }}
    >
      {/* SubGroup header */}
      <div className="absolute top-2 left-3 flex items-center gap-2">
        <div className="flex items-center">
          {/* Nesting level indicator */}
          {Array.from({ length: level }, (_, i) => (
            <div key={i} className="w-1 h-4 bg-orange-400 mr-1 rounded-full opacity-60" />
          ))}
          <svg className="w-4 h-4 text-orange-600 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <span className="text-sm font-medium text-orange-700">
          {nodeData.label || `SubGroup L${level}`}
        </span>
        {nodeData.subGroupType && (
          <span className="text-xs text-orange-500 bg-orange-100 px-2 py-1 rounded-full">
            {nodeData.subGroupType}
          </span>
        )}
      </div>

      {/* Level indicator badge */}
      <div className="absolute top-2 right-3">
        <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full font-medium">
          Level {level}
        </span>
      </div>

      {/* SubGroup description */}
      {nodeData.description && (
        <div className="absolute top-8 left-3 right-3">
          <p className="text-xs text-gray-600 italic">
            {nodeData.description}
          </p>
        </div>
      )}

      {/* Parent group indicator */}
      {nodeData.parentGroupId && (
        <div className="absolute top-12 left-3 right-3">
          <p className="text-xs text-orange-600">
            ↳ Child of: {nodeData.parentGroupId}
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-3 left-3 right-3 text-center">
        <p className="text-xs text-gray-500">
          {level === 1 ? 'Drag nodes or subgroups here' : 'Nested subgroup container'}
        </p>
      </div>

      {/* Visual hierarchy lines for nested subgroups */}
      {level > 1 && (
        <>
          <div 
            className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-300 to-transparent opacity-30"
          />
          <div 
            className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-300 to-transparent opacity-30"
          />
        </>
      )}

      {/* Resize handles */}
      {selected && (
        <>
          {/* Corner handles */}
          <div 
            className="absolute -top-1 -left-1 w-3 h-3 bg-orange-500 border border-white rounded-full cursor-nw-resize hover:bg-orange-600 z-10 nodrag"
            onMouseDown={handleMouseDown('top-left')}
            style={{ pointerEvents: 'all' }}
          />
          <div 
            className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 border border-white rounded-full cursor-ne-resize hover:bg-orange-600 z-10 nodrag"
            onMouseDown={handleMouseDown('top-right')}
            style={{ pointerEvents: 'all' }}
          />
          <div 
            className="absolute -bottom-1 -left-1 w-3 h-3 bg-orange-500 border border-white rounded-full cursor-sw-resize hover:bg-orange-600 z-10 nodrag"
            onMouseDown={handleMouseDown('bottom-left')}
            style={{ pointerEvents: 'all' }}
          />
          <div 
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-orange-500 border border-white rounded-full cursor-se-resize hover:bg-orange-600 z-10 nodrag"
            onMouseDown={handleMouseDown('bottom-right')}
            style={{ pointerEvents: 'all' }}
          />

          {/* Edge handles */}
          <div 
            className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-orange-500 border border-white rounded-full cursor-n-resize hover:bg-orange-600 z-10 nodrag"
            onMouseDown={handleMouseDown('top')}
            style={{ pointerEvents: 'all' }}
          />
          <div 
            className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-orange-500 border border-white rounded-full cursor-s-resize hover:bg-orange-600 z-10 nodrag"
            onMouseDown={handleMouseDown('bottom')}
            style={{ pointerEvents: 'all' }}
          />
          <div 
            className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-orange-500 border border-white rounded-full cursor-w-resize hover:bg-orange-600 z-10 nodrag"
            onMouseDown={handleMouseDown('left')}
            style={{ pointerEvents: 'all' }}
          />
          <div 
            className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-orange-500 border border-white rounded-full cursor-e-resize hover:bg-orange-600 z-10 nodrag"
            onMouseDown={handleMouseDown('right')}
            style={{ pointerEvents: 'all' }}
          />
        </>
      )}

      {/* Size indicator */}
      {selected && (
        <div className="absolute bottom-2 right-3 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
          {dimensions.width} × {dimensions.height}
        </div>
      )}
    </div>
  );
}