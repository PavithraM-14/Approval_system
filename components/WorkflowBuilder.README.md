# WorkflowBuilder Component

## Overview
The WorkflowBuilder component provides a visual canvas for creating and editing custom approval workflows using React Flow.

## Implementation Details

### Task 10.1 Completion
This component implements Task 10.1 from the customizable approval workflows spec:
- ✅ Initialized React Flow with canvas
- ✅ Configured canvas controls (zoom, pan via Controls component)
- ✅ Set up MiniMap for navigation
- ✅ Added Background with dots pattern
- ✅ Prepared for custom node types (will be added in Task 10.2)

### Requirements Satisfied
- **Requirement 2.1**: The workflow builder provides a canvas where System Admins can drag and drop workflow nodes
- **Requirement 2.5**: The workflow builder supports zooming and panning the canvas (via React Flow Controls)

### Technology Stack
- **React Flow (@xyflow/react)**: Visual workflow canvas library
- **React 18**: Component framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling

### Component Props
```typescript
interface WorkflowBuilderProps {
  companyId: string;      // Company ID for multi-tenant isolation
  workflowId?: string;    // Optional workflow ID for editing existing workflows
  onSave?: (nodes: Node[], edges: Edge[]) => Promise<void>; // Save callback
}
```

### Features Implemented
1. **Canvas Controls**
   - Zoom in/out buttons
   - Fit view button
   - Interactive zoom (mouse wheel)
   - Pan (click and drag)

2. **MiniMap**
   - Overview of entire workflow
   - Quick navigation for large workflows

3. **Background**
   - Dot pattern for visual reference
   - Helps with node alignment

4. **State Management**
   - Uses React Flow hooks (useNodesState, useEdgesState)
   - Manages nodes and edges separately
   - Handles connections between nodes

5. **Save Functionality**
   - Save button in header
   - Loading state during save
   - Callback to parent component

### Usage Example
```tsx
import WorkflowBuilder from '@/components/WorkflowBuilder';

function MyPage() {
  const handleSave = async (nodes, edges) => {
    // Save to API
    await fetch('/api/workflows', {
      method: 'POST',
      body: JSON.stringify({ nodes, edges })
    });
  };

  return (
    <WorkflowBuilder
      companyId="company-123"
      onSave={handleSave}
    />
  );
}
```

### Next Steps (Future Tasks)
- Task 10.2: Create custom node components (StartNode, EndNode, ApprovalNode, etc.)
- Task 10.3: Implement node palette for drag-and-drop
- Task 10.4: Add connection validation
- Task 10.5: Implement node property editor panel
- Task 10.6: Add node/edge deletion
- Task 10.7: Implement undo/redo
- Task 10.8: Add auto-layout feature
- Task 10.9: Add tooltips and visual feedback
- Task 10.10: Implement workflow loading from API

### Testing
To test the component:
1. Navigate to `/dashboard/workflow-builder`
2. Verify the canvas loads with controls
3. Test zoom in/out buttons
4. Test pan by clicking and dragging
5. Test minimap navigation
6. Verify save button is present

### Notes
- The component is client-side only ('use client' directive)
- Requires authentication (session check in page component)
- Follows existing project patterns (Tailwind CSS, TypeScript)
- Ready for custom node types to be added in next task
