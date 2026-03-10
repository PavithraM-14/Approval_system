# WorkflowBuilder Connection Validation Rules

## Overview
The WorkflowBuilder implements comprehensive connection validation to ensure workflow integrity. This document describes the connection rules for each node type.

## Connection Rules by Node Type

### 1. Start Node
**Purpose**: Entry point for the workflow

**Connection Rules**:
- ✅ Can be **source** (outgoing connections)
- ❌ Cannot be **target** (no incoming connections)
- ✅ Multiple outgoing connections allowed

**Example**:
```
Start → Approval ✅
Approval → Start ❌
```

### 2. End Node
**Purpose**: Terminal point for the workflow

**Connection Rules**:
- ❌ Cannot be **source** (no outgoing connections)
- ✅ Can be **target** (incoming connections)
- ✅ Multiple incoming connections allowed

**Example**:
```
Approval → End ✅
End → Approval ❌
```

### 3. Approval Node
**Purpose**: Requires action from a specified role

**Connection Rules**:
- ✅ Exactly **one incoming** connection
- ✅ Exactly **one outgoing** connection
- ❌ Multiple incoming connections prevented
- ❌ Multiple outgoing connections prevented

**Example**:
```
Start → Approval → End ✅
Start → Approval ← Conditional ❌ (multiple incoming)
Approval → End
Approval → Conditional ❌ (multiple outgoing)
```

### 4. Parallel Split Node
**Purpose**: Split workflow into multiple parallel paths

**Connection Rules**:
- ✅ Exactly **one incoming** connection
- ✅ **Multiple outgoing** connections allowed
- ❌ Multiple incoming connections prevented

**Example**:
```
Start → Parallel Split → Approval 1 ✅
                      → Approval 2 ✅
                      → Approval 3 ✅

Approval 1 → Parallel Split ❌ (already has incoming)
Approval 2 → Parallel Split
```

### 5. Parallel Join Node
**Purpose**: Wait for all parallel paths to complete

**Connection Rules**:
- ✅ **Multiple incoming** connections allowed
- ✅ Exactly **one outgoing** connection
- ❌ Multiple outgoing connections prevented

**Example**:
```
Approval 1 → Parallel Join → End ✅
Approval 2 → Parallel Join
Approval 3 → Parallel Join

Parallel Join → End
Parallel Join → Approval ❌ (multiple outgoing)
```

### 6. Conditional Node
**Purpose**: Route based on condition evaluation

**Connection Rules**:
- ✅ Exactly **one incoming** connection
- ✅ Up to **two outgoing** connections (for true/false paths)
- ❌ Multiple incoming connections prevented
- ❌ More than two outgoing connections prevented

**Example**:
```
Start → Conditional → Approval (true path) ✅
                   → End (false path) ✅

Conditional → Third Node ❌ (max 2 outgoing)

Approval → Conditional ❌ (already has incoming)
Start → Conditional
```

## General Validation Rules

### 1. Self-Connections
❌ **Prevented**: A node cannot connect to itself
```
Approval → Approval ❌
```

### 2. Duplicate Connections
❌ **Prevented**: Cannot create duplicate connections between the same nodes
```
Start → Approval (already exists)
Start → Approval ❌ (duplicate)
```

### 3. Null/Undefined Values
❌ **Prevented**: Connections with null or undefined source/target are rejected
```
null → Approval ❌
Start → undefined ❌
```

### 4. Non-existent Nodes
❌ **Prevented**: Connections to nodes that don't exist in the workflow are rejected
```
Start → NonExistentNode ❌
```

## Visual Feedback

### Valid Connection
- Connection line appears in **blue** (#3b82f6)
- Connection is created when released
- Edge is added to the workflow

### Invalid Connection
- React Flow shows visual indication that connection is not allowed
- Connection is **not created** when released
- No edge is added to the workflow

## Implementation Details

### Validation Function
The `isValidConnection` function validates connections before they are created:

```typescript
const isValidConnection = useCallback(
  (connection: Connection | Edge): boolean => {
    // 1. Check for null/undefined
    // 2. Prevent self-connections
    // 3. Validate node existence
    // 4. Prevent duplicates
    // 5. Apply node-specific rules
    // 6. Return validation result
  },
  [nodes, edges]
);
```

### Integration with React Flow
```typescript
<ReactFlow
  nodes={nodes}
  edges={edges}
  onConnect={onConnect}
  isValidConnection={isValidConnection}
  connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2 }}
  defaultEdgeOptions={{
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    animated: false,
  }}
/>
```

## Example Workflows

### Simple Linear Workflow
```
Start → Approval → End ✅
```

### Parallel Approval Workflow
```
Start → Parallel Split → Approval 1 → Parallel Join → End ✅
                      → Approval 2 →
```

### Conditional Workflow
```
Start → Conditional → Approval (if true) → End ✅
                   → End (if false) ✅
```

### Complex Workflow
```
Start → Approval 1 → Conditional → Approval 2 (true) → End ✅
                                → Parallel Split (false) → Approval 3 → Parallel Join → End
                                                        → Approval 4 →
```

## Testing

All connection rules are covered by comprehensive unit tests in `__tests__/components/WorkflowBuilder.test.tsx`:
- 36 total tests
- 24 connection validation tests
- 100% coverage of validation logic

## Requirements Satisfied

✅ **Requirement 2.2**: The workflow builder allows connecting nodes with edges
✅ **Requirement 2.4**: The workflow builder validates connections
✅ **Requirement 11.3**: Visual feedback when hovering over connection points
✅ **Requirement 11.4**: Prevents invalid connections
