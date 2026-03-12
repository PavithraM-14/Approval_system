'use client';

import React, { useCallback, useState, useRef, DragEvent } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  ReactFlowInstance,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './WorkflowBuilder.css';
import dagre from 'dagre';
import { nodeTypes } from './workflow-nodes';
import NodePropertyEditor from './NodePropertyEditor';

interface WorkflowBuilderProps {
  companyId: string;
  workflowId?: string;
  workflowName?: string;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  initialDescription?: string;
  onSave?: (workflow: { name: string; description?: string; nodes: Node[]; edges: Edge[] }) => Promise<void>;
  onDelete?: (nodeId: string) => void;
}

interface NodePaletteItem {
  type: string;
  label: string;
  icon: JSX.Element;
  description: string;
}

// Node palette items with icons and descriptions
const nodePaletteItems: NodePaletteItem[] = [
  {
    type: 'start',
    label: 'Start',
    description: 'Workflow entry point',
    icon: (
      <div className="w-3 h-3 rounded-full bg-green-500"></div>
    ),
  },
  {
    type: 'end',
    label: 'End',
    description: 'Workflow completion',
    icon: (
      <div className="w-3 h-3 rounded-full bg-red-500"></div>
    ),
  },
  {
    type: 'approval',
    label: 'User Node',
    description: 'Assign to a role',
    icon: (
      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    type: 'parallel_split',
    label: 'Parallel Split',
    description: 'Split into parallel paths',
    icon: (
      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    type: 'parallel_join',
    label: 'Parallel Join',
    description: 'Wait for all paths',
    icon: (
      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 7l4-4M4 7l4 4m12 6H4m16 0l-4 4m4-4l-4-4" />
      </svg>
    ),
  },

  {
    type: 'grouping',
    label: 'Group',
    description: 'Visual grouping container',
    icon: (
      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    type: 'subgroup',
    label: 'SubGroup',
    description: 'Nested grouping container',
    icon: (
      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    type: 'options',
    label: 'Options',
    description: 'Forward to multiple users',
    icon: (
      <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
];

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  companyId,
  workflowId,
  workflowName: initialWorkflowName,
  initialNodes = [],
  initialEdges = [],
  initialDescription = '',
  onSave,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const [isSaving, setIsSaving] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [workflowName, setWorkflowName] = useState(initialWorkflowName || '');
  const [workflowDescription, setWorkflowDescription] = useState(initialDescription);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const nodeIdCounter = useRef(0);
  
  // Undo/Redo state management
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isApplyingHistory = useRef(false);

  // Update state when props change (for loading workflows)
  React.useEffect(() => {
    if (initialNodes.length > 0) {
      // Add sourcePosition and targetPosition to existing nodes if they don't have them
      const updatedNodes = initialNodes.map(node => ({
        ...node,
        sourcePosition: node.sourcePosition || Position.Right,
        targetPosition: node.targetPosition || Position.Left,
      }));
      setNodes(updatedNodes);
    }
  }, [initialNodes, setNodes]);

  React.useEffect(() => {
    if (initialEdges.length > 0) {
      setEdges(initialEdges);
    }
  }, [initialEdges, setEdges]);

  React.useEffect(() => {
    if (initialWorkflowName) {
      setWorkflowName(initialWorkflowName);
    }
  }, [initialWorkflowName]);

  React.useEffect(() => {
    if (initialDescription) {
      setWorkflowDescription(initialDescription);
    }
  }, [initialDescription]);

  // Initialize node ID counter based on existing nodes
  React.useEffect(() => {
    if (initialNodes.length > 0) {
      const maxId = initialNodes.reduce((max, node) => {
        const match = node.id.match(/node_(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          return num > max ? num : max;
        }
        return max;
      }, 0);
      nodeIdCounter.current = maxId;
    }
  }, [initialNodes]);

  // Save current state to history when nodes or edges change
  React.useEffect(() => {
    // Skip if we're applying history (to avoid creating new history entries during undo/redo)
    if (isApplyingHistory.current) {
      return;
    }

    // Skip if this is the initial load (both nodes and edges are from props)
    if (nodes === initialNodes && edges === initialEdges) {
      return;
    }

    // Skip if nodes and edges are empty (initial state)
    if (nodes.length === 0 && edges.length === 0 && history.length === 0) {
      return;
    }

    // Create a new history entry
    const newState: HistoryState = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };

    // Check if state actually changed
    const currentState = history[historyIndex];
    if (currentState) {
      const nodesChanged = JSON.stringify(currentState.nodes) !== JSON.stringify(nodes);
      const edgesChanged = JSON.stringify(currentState.edges) !== JSON.stringify(edges);
      
      if (!nodesChanged && !edgesChanged) {
        return;
      }
    }

    // Remove any history after current index (when making changes after undo)
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);

    // Limit history to 50 entries
    if (newHistory.length > 50) {
      newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    } else {
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [nodes, edges]);

  // Undo function
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      isApplyingHistory.current = true;
      setNodes(previousState.nodes);
      setEdges(previousState.edges);
      setHistoryIndex(historyIndex - 1);
      // Reset flag after state updates
      setTimeout(() => {
        isApplyingHistory.current = false;
      }, 0);
    }
  }, [historyIndex, history, setNodes, setEdges]);

  // Redo function
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      isApplyingHistory.current = true;
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(historyIndex + 1);
      // Reset flag after state updates
      setTimeout(() => {
        isApplyingHistory.current = false;
      }, 0);
    }
  }, [historyIndex, history, setNodes, setEdges]);

  // Auto-layout function using dagre
  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) return;

    // Create a new dagre graph
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // Configure the graph layout
    dagreGraph.setGraph({
      rankdir: 'LR', // Left to right layout
      align: 'UL', // Align to upper left
      nodesep: 80, // Vertical spacing between nodes in same rank
      ranksep: 150, // Horizontal spacing between ranks (columns)
      marginx: 50,
      marginy: 50,
    });

    // Define node dimensions based on node type
    const getNodeDimensions = (nodeType: string) => {
      switch (nodeType) {
        case 'start':
        case 'end':
          return { width: 120, height: 60 };
        case 'approval':
          return { width: 180, height: 80 };
        case 'parallel_split':
        case 'parallel_join':
          return { width: 160, height: 70 };
        case 'options':
          return { width: 180, height: 90 };
        default:
          return { width: 150, height: 70 };
      }
    };

    // Add nodes to the dagre graph
    nodes.forEach((node) => {
      const dimensions = getNodeDimensions(node.type || 'default');
      dagreGraph.setNode(node.id, dimensions);
    });

    // Add edges to the dagre graph
    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    // Calculate the layout
    dagre.layout(dagreGraph);

    // Update node positions based on dagre layout
    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      const dimensions = getNodeDimensions(node.type || 'default');
      
      // Dagre returns center position, we need top-left corner
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - dimensions.width / 2,
          y: nodeWithPosition.y - dimensions.height / 2,
        },
      };
    });

    // Update nodes with new positions
    setNodes(layoutedNodes);
  }, [nodes, edges, setNodes]);

  // Keyboard shortcuts for undo/redo
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Ctrl (or Cmd on Mac) is pressed
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      
      if (isCtrlOrCmd && event.key === 'z' && !event.shiftKey) {
        // Ctrl+Z: Undo
        event.preventDefault();
        handleUndo();
      } else if (isCtrlOrCmd && event.shiftKey && event.key === 'z') {
        // Ctrl+Shift+Z: Redo
        event.preventDefault();
        handleRedo();
      } else if (isCtrlOrCmd && event.key === 'y') {
        // Ctrl+Y: Redo (alternative)
        event.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo]);

  // Validate connection compatibility based on node types
  const isValidConnection = useCallback(
    (connection: Connection | Edge): boolean => {
      const { source, target } = connection;
      
      if (!source || !target) return false;
      
      // Prevent self-connections
      if (source === target) return false;
      
      // Find source and target nodes
      const sourceNode = nodes.find((n) => n.id === source);
      const targetNode = nodes.find((n) => n.id === target);
      
      if (!sourceNode || !targetNode) return false;
      
      // Prevent duplicate connections between same nodes
      const duplicateExists = edges.some(
        (edge) => edge.source === source && edge.target === target
      );
      if (duplicateExists) return false;
      
      const sourceType = sourceNode.type;
      const targetType = targetNode.type;
      
      // Connection rules based on node types
      
      // Start nodes: only outgoing connections (can be source, not target)
      if (targetType === 'start') return false;
      
      // End nodes: only incoming connections (can be target, not source)
      if (sourceType === 'end') return false;
      
      // Approval nodes: one incoming, one outgoing
      if (sourceType === 'approval') {
        const outgoingCount = edges.filter((e) => e.source === source).length;
        if (outgoingCount >= 1) return false;
      }
      if (targetType === 'approval') {
        const incomingCount = edges.filter((e) => e.target === target).length;
        if (incomingCount >= 1) return false;
      }
      
      // Parallel split: one incoming, multiple outgoing
      if (targetType === 'parallel_split') {
        const incomingCount = edges.filter((e) => e.target === target).length;
        if (incomingCount >= 1) return false;
      }
      
      // Parallel join: multiple incoming, one outgoing
      if (sourceType === 'parallel_join') {
        const outgoingCount = edges.filter((e) => e.source === source).length;
        if (outgoingCount >= 1) return false;
      }
      
      // Options: one incoming, multiple outgoing (up to 5 for UI)
      if (targetType === 'options') {
        const incomingCount = edges.filter((e) => e.target === target).length;
        if (incomingCount >= 1) return false;
      }
      if (sourceType === 'options') {
        const outgoingCount = edges.filter((e) => e.source === source).length;
        if (outgoingCount >= 5) return false; // Limit to 5 options for UI
      }
      
      return true;
    },
    [nodes, edges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (isValidConnection(params)) {
        setEdges((eds) => addEdge(params, eds));
      }
    },
    [setEdges, isValidConnection]
  );

  const handleSave = async () => {
    if (!onSave) return;
    
    // Clear previous messages
    setValidationErrors([]);
    setSaveSuccess(false);
    setSaveError(null);

    // Validate workflow name
    if (!workflowName.trim()) {
      setValidationErrors(['Workflow name is required']);
      return;
    }

    // Validate that workflow has nodes
    if (nodes.length === 0) {
      setValidationErrors(['Workflow must have at least one node']);
      return;
    }
    
    setIsSaving(true);
    try {
      // Call the validation API first
      const validationResponse = await fetch(`/api/workflows/${workflowId || 'new'}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: workflowName,
          description: workflowDescription,
          nodes,
          edges,
        }),
      });

      const validationResult = await validationResponse.json();

      if (!validationResult.valid) {
        setValidationErrors(validationResult.errors || ['Workflow validation failed']);
        return;
      }

      // If validation passes, save the workflow
      await onSave({
        name: workflowName,
        description: workflowDescription,
        nodes,
        edges,
      });

      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error('Failed to save workflow:', error);
      
      // Check if error has validation errors attached
      if (error.validationErrors && Array.isArray(error.validationErrors)) {
        setValidationErrors(error.validationErrors);
      } else {
        setSaveError(error.message || 'Failed to save workflow. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivateWorkflow = async () => {
    if (!workflowId) {
      alert('Please save the workflow first before activating it.');
      return;
    }

    setIsActivating(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch(`/api/workflows/${workflowId}/activate`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to activate workflow');
      }

      const result = await response.json();
      alert(`✓ ${result.message || 'Workflow activated successfully!'}\n\nThis workflow will now be used for all new requests.`);
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error('Failed to activate workflow:', error);
      setSaveError(error.message || 'Failed to activate workflow. Please try again.');
      alert(`Failed to activate workflow: ${error.message}`);
    } finally {
      setIsActivating(false);
    }
  };

  // Generate unique node ID
  const getNodeId = () => {
    nodeIdCounter.current += 1;
    return `node_${nodeIdCounter.current}`;
  };

  // Handle drag start from palette
  const onDragStart = (event: DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
    
    // Add visual feedback during drag
    const target = event.currentTarget;
    target.style.opacity = '0.5';
  };

  // Handle drag end to restore opacity
  const onDragEnd = (event: DragEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    target.style.opacity = '1';
  };

  // Helper function to detect and update parent-child relationships for subgroups
  const updateSubGroupRelationships = useCallback(() => {
    setNodes((currentNodes) => {
      return currentNodes.map((node) => {
        if (node.type === 'subgroup') {
          // Find potential parent groups/subgroups
          let parentGroupId = '';
          let detectedLevel = 1;
          
          for (const otherNode of currentNodes) {
            if ((otherNode.type === 'grouping' || otherNode.type === 'subgroup') && 
                otherNode.id !== node.id && otherNode.data) {
              
              const otherX = otherNode.position.x;
              const otherY = otherNode.position.y;
              const otherWidth = otherNode.data.width || (otherNode.type === 'grouping' ? 300 : 250);
              const otherHeight = otherNode.data.height || (otherNode.type === 'grouping' ? 200 : 150);
              
              // Check if this subgroup is inside the other group/subgroup
              if (node.position.x >= otherX && 
                  node.position.x + (node.data?.width || 250) <= otherX + otherWidth &&
                  node.position.y >= otherY && 
                  node.position.y + (node.data?.height || 150) <= otherY + otherHeight) {
                
                const otherLevel = otherNode.data.level || (otherNode.type === 'grouping' ? 0 : 1);
                const newLevel = otherLevel + 1;
                
                if (newLevel > detectedLevel) {
                  detectedLevel = newLevel;
                  parentGroupId = otherNode.id;
                }
              }
            }
          }
          
          // Update the node if relationships changed
          if (node.data?.parentGroupId !== parentGroupId || node.data?.level !== detectedLevel) {
            return {
              ...node,
              data: {
                ...node.data,
                parentGroupId,
                level: detectedLevel,
                // Update visual properties based on new level
                width: Math.max(200, 300 - (detectedLevel * 25)),
                height: Math.max(120, 200 - (detectedLevel * 25)),
                backgroundColor: `rgba(139, 69, 19, ${0.03 + (detectedLevel * 0.02)})`,
              },
              zIndex: -detectedLevel * 0.5,
            };
          }
        }
        return node;
      });
    });
  }, [setNodes]);

  // Update relationships when nodes change position
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateSubGroupRelationships();
    }, 500); // Debounce to avoid excessive updates

    return () => clearTimeout(timeoutId);
  }, [nodes.map(n => `${n.id}-${n.position.x}-${n.position.y}`).join(','), updateSubGroupRelationships]);
  const detectNestingLevel = useCallback((position: { x: number; y: number }, nodes: Node[]) => {
    let maxLevel = 0;
    
    // Check if the position is inside any existing groups or subgroups
    for (const node of nodes) {
      if ((node.type === 'grouping' || node.type === 'subgroup') && node.data) {
        const nodeX = node.position.x;
        const nodeY = node.position.y;
        const nodeWidth = node.data.width || (node.type === 'grouping' ? 300 : 250);
        const nodeHeight = node.data.height || (node.type === 'grouping' ? 200 : 150);
        
        // Check if position is inside this group/subgroup
        if (position.x >= nodeX && position.x <= nodeX + nodeWidth &&
            position.y >= nodeY && position.y <= nodeY + nodeHeight) {
          const nodeLevel = node.data.level || (node.type === 'grouping' ? 0 : 1);
          maxLevel = Math.max(maxLevel, nodeLevel + 1);
        }
      }
    }
    
    return Math.max(1, maxLevel);
  }, []);

  // Create new node with proper data structure
  const createNewNode = useCallback((type: string, position: { x: number; y: number }) => {
    const defaultLabels: Record<string, string> = {
      start: 'Start',
      end: 'End',
      approval: 'User Node',
      parallel_split: 'Parallel Split',
      parallel_join: 'Parallel Join',
      grouping: 'Group',
      subgroup: 'SubGroup',
      options: 'Options',
    };

    let nodeData: any = { 
      label: defaultLabels[type] || type 
    };

    // Add type-specific default data
    if (type === 'grouping') {
      nodeData = {
        ...nodeData,
        description: 'Drag nodes into this group',
        groupType: 'region',
        width: 300,
        height: 200,
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        borderColor: '#3b82f6',
        level: 0, // Groups are level 0
      };
    } else if (type === 'subgroup') {
      const nestingLevel = detectNestingLevel(position, nodes);
      nodeData = {
        ...nodeData,
        description: `Level ${nestingLevel} subgroup`,
        subGroupType: 'department',
        width: Math.max(200, 300 - (nestingLevel * 25)), // Smaller as nesting increases
        height: Math.max(120, 200 - (nestingLevel * 25)),
        backgroundColor: `rgba(139, 69, 19, ${0.03 + (nestingLevel * 0.02)})`,
        borderColor: '#8b4513',
        level: nestingLevel,
      };
    }

    const newNode: Node = {
      id: getNodeId(),
      type,
      position,
      data: nodeData,
      // Set z-index based on type and level
      zIndex: type === 'grouping' ? -1 : 
              type === 'subgroup' ? -(nodeData.level || 1) * 0.5 : 
              1,
      // Set handle positions to left/right for all nodes
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };

    return newNode;
  }, [detectNestingLevel, nodes]);

  // Handle drop on canvas
  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      
      if (!type || !reactFlowInstance) {
        return;
      }

      // Use screenToFlowPosition with the client coordinates directly
      // This method handles all viewport transformations (pan, zoom)
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = createNewNode(type, position);
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, createNewNode]
  );

  // Allow drop on canvas
  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle node selection
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Handle double-click to edit node properties
  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Handle canvas click (deselect node)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Handle edge click (for selection and deletion)
  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    // Deselect node when edge is clicked
    setSelectedNode(null);
  }, []);

  // Handle node data update from property editor
  const handleUpdateNode = useCallback((nodeId: string, data: Record<string, any> | null) => {
    if (data === null) {
      // Close the property editor
      setSelectedNode(null);
      return;
    }
    
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Handle node deletion from property editor
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 max-w-2xl">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Workflow Builder</h1>
            <div className="space-y-3">
              <div>
                <label htmlFor="workflow-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Workflow Name
                </label>
                <input
                  id="workflow-name"
                  type="text"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="Enter workflow name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-4">
            {/* Undo/Redo buttons */}
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title="Undo (Ctrl+Z)"
                className="inline-flex items-center p-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
                className="inline-flex items-center p-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                </svg>
              </button>
            </div>
            {/* Auto-layout button */}
            <button
              onClick={handleAutoLayout}
              disabled={nodes.length === 0}
              title="Auto-arrange nodes for better clarity"
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
            >
              <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
              </svg>
              Auto Layout
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Workflow'
              )}
            </button>

            {/* Activate Workflow Button */}
            {workflowId && (
              <button
                onClick={handleActivateWorkflow}
                disabled={isSaving || isActivating}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isActivating ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Activating...
                  </>
                ) : (
                  <>
                    <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Activate Workflow
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Validation Error{validationErrors.length > 1 ? 's' : ''}
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {saveSuccess && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Workflow saved successfully!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {saveError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">
                  {saveError}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content: Palette + Canvas */}
      <div className="flex-1 flex bg-gray-50">
        {/* Node Palette Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Node Palette</h2>
          <p className="text-xs text-gray-500 mb-4">
            Drag nodes onto the canvas to build your workflow
          </p>
          <div className="space-y-2">
            {nodePaletteItems.map((item) => (
              <div
                key={item.type}
                draggable
                onDragStart={(event) => onDragStart(event, item.type)}
                onDragEnd={onDragEnd}
                title={`${item.label}: ${item.description}`}
                className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-move hover:bg-gray-100 hover:border-gray-300 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {item.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {item.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onPaneClick={onPaneClick}
            onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes as any}
            isValidConnection={isValidConnection}
            connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2 }}
            defaultEdgeOptions={{
              style: { stroke: '#3b82f6', strokeWidth: 2 },
              animated: false,
            }}
            deleteKeyCode={['Delete', 'Backspace']}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </div>

        {/* Property Editor Panel */}
        {selectedNode && (
          <NodePropertyEditor
            selectedNode={selectedNode}
            companyId={companyId}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
          />
        )}
      </div>
    </div>
  );
};

export default WorkflowBuilder;
