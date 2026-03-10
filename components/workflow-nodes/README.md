# Workflow Node Components

Custom React Flow node components for the customizable approval workflow system.

## Overview

This directory contains six custom node components that represent different workflow node types. Each component is designed with distinct visual styling using Tailwind CSS and follows React Flow's custom node API.

## Node Types

### 1. StartNode
- **Purpose**: Entry point of the workflow
- **Visual**: Green rounded pill shape with a dot indicator
- **Handles**: One source handle (right side)
- **Props**:
  - `label` (optional): Display name (default: "Start")
  - `description` (optional): Additional description text

### 2. EndNode
- **Purpose**: Terminal point of the workflow
- **Visual**: Red rounded pill shape with a dot indicator
- **Handles**: One target handle (left side)
- **Props**:
  - `label` (optional): Display name (default: "End")
  - `description` (optional): Additional description text

### 3. ApprovalNode
- **Purpose**: Requires approval from a user with a specific role
- **Visual**: Blue rounded rectangle with checkmark icon
- **Handles**: One target handle (left), one source handle (right)
- **Props**:
  - `label` (optional): Display name (default: "Approval")
  - `roleId` (optional): ID of the required role
  - `roleName` (optional): Name of the required role (displayed in UI)
  - `description` (optional): Additional description text

### 4. ParallelSplitNode
- **Purpose**: Splits workflow into multiple parallel paths
- **Visual**: Purple hexagon shape with split arrows icon
- **Handles**: One target handle (left), two source handles (right, positioned at 35% and 65%)
- **Props**:
  - `label` (optional): Display name (default: "Parallel Split")
  - `description` (optional): Additional description text

### 5. ParallelJoinNode
- **Purpose**: Waits for all parallel paths to complete before continuing
- **Visual**: Indigo hexagon shape with merge arrows icon
- **Handles**: Two target handles (left, positioned at 35% and 65%), one source handle (right)
- **Props**:
  - `label` (optional): Display name (default: "Parallel Join")
  - `description` (optional): Additional description text

### 6. ConditionalNode
- **Purpose**: Routes workflow based on request properties
- **Visual**: Amber diamond shape with question mark icon
- **Handles**: One target handle (left), two source handles (right - "true" at 35%, "false" at 65%)
- **Props**:
  - `label` (optional): Display name (default: "Condition")
  - `condition` (optional): Condition configuration object
    - `field`: Property name to evaluate
    - `operator`: Comparison operator ('eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains')
    - `value`: Value to compare against
  - `description` (optional): Additional description text

## Usage

### Importing Components

```typescript
import {
  StartNode,
  EndNode,
  ApprovalNode,
  ParallelSplitNode,
  ParallelJoinNode,
  ConditionalNode,
  nodeTypes,
} from '@/components/workflow-nodes';
```

### Using with React Flow

```typescript
import ReactFlow from '@xyflow/react';
import { nodeTypes } from '@/components/workflow-nodes';

function WorkflowCanvas() {
  const [nodes, setNodes] = useState([
    {
      id: '1',
      type: 'start',
      position: { x: 0, y: 0 },
      data: { label: 'Start Workflow' },
    },
    {
      id: '2',
      type: 'approval',
      position: { x: 200, y: 0 },
      data: {
        label: 'Manager Approval',
        roleId: 'role-123',
        roleName: 'Manager',
      },
    },
    {
      id: '3',
      type: 'end',
      position: { x: 400, y: 0 },
      data: { label: 'Complete' },
    },
  ]);

  return (
    <ReactFlow
      nodes={nodes}
      nodeTypes={nodeTypes}
      // ... other props
    />
  );
}
```

## Visual Design

Each node type has a unique color scheme and shape:

- **Start**: Green (#10b981) - Rounded pill
- **End**: Red (#ef4444) - Rounded pill
- **Approval**: Blue (#3b82f6) - Rounded rectangle
- **Parallel Split**: Purple (#a855f7) - Hexagon
- **Parallel Join**: Indigo (#6366f1) - Hexagon
- **Conditional**: Amber (#f59e0b) - Diamond

### Selection State

All nodes support a `selected` prop that applies enhanced styling:
- Darker border color
- Shadow effect (shadow-lg)

## Handle Configuration

Handles are connection points for edges between nodes:

- **Target handles**: Accept incoming connections
- **Source handles**: Allow outgoing connections
- **Handle IDs**: Used for conditional and parallel nodes to distinguish between multiple handles
  - Conditional: `"true"` and `"false"`
  - Parallel Split: `"out-1"` and `"out-2"`
  - Parallel Join: `"in-1"` and `"in-2"`

## Testing

All node components have comprehensive unit tests in `__tests__/components/workflow-nodes/CustomNodes.test.tsx`.

Tests cover:
- Rendering with and without labels
- Display of optional properties (description, role name, conditions)
- Handle presence and configuration
- Selection state styling
- Default values

Run tests:
```bash
npm run test:ci -- __tests__/components/workflow-nodes/CustomNodes.test.tsx
```

## Requirements Mapping

These components satisfy the following requirements from the spec:

- **Requirement 3.1**: Start node - Entry point of workflow
- **Requirement 3.2**: End node - Terminal point of workflow
- **Requirement 3.3**: Approval node - Requires approval from user with specific role
- **Requirement 3.4**: Parallel split/join nodes - Enable parallel approval paths
- **Requirement 3.5**: Conditional node - Route based on request properties

## Implementation Notes

- All components use `React.memo` for performance optimization
- Components follow the React Flow `NodeProps` interface
- Tailwind CSS is used for all styling
- SVG icons from Heroicons are embedded inline
- All data properties are optional with sensible defaults
- Components are fully typed with TypeScript
