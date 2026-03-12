import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import { getCurrentUser } from '../../../../../lib/auth';
import { workflowExecutionEngine } from '../../../../../lib/workflow-execution-engine';

export const dynamic = 'force-dynamic';

// POST validate workflow configuration including group scope
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = (user as any).company;
    if (!companyId) {
      return NextResponse.json({ error: 'User not associated with a company' }, { status: 400 });
    }

    const { nodes, edges } = await request.json();

    // Validate workflow structure
    const structuralErrors = validateWorkflowStructure(nodes, edges);
    
    // Validate group scope configuration
    const groupScopeErrors = await workflowExecutionEngine.validateWorkflowGroupScope(
      params.id,
      companyId
    );

    const allErrors = [...structuralErrors, ...groupScopeErrors];

    if (allErrors.length > 0) {
      return NextResponse.json({
        valid: false,
        errors: allErrors,
      }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      message: 'Workflow configuration is valid',
    });
  } catch (error: any) {
    console.error('Error validating workflow:', error);
    return NextResponse.json({ error: error.message || 'Failed to validate workflow' }, { status: 500 });
  }
}

function validateWorkflowStructure(nodes: any[], edges: any[]): string[] {
  const errors: string[] = [];

  // Check for start node
  const startNodes = nodes.filter(node => node.type === 'start');
  if (startNodes.length === 0) {
    errors.push('Workflow must have exactly one start node');
  } else if (startNodes.length > 1) {
    errors.push('Workflow can only have one start node');
  }

  // Check for end node
  const endNodes = nodes.filter(node => node.type === 'end');
  if (endNodes.length === 0) {
    errors.push('Workflow must have at least one end node');
  }

  // Check approval nodes have roles assigned
  const approvalNodes = nodes.filter(node => node.type === 'approval');
  for (const node of approvalNodes) {
    if (!node.data?.roleId) {
      errors.push(`Approval node "${node.data?.label || node.id}" must have a role assigned`);
    }
    
    // Check group scope configuration
    if (node.data?.groupScope?.enabled) {
      if (!node.data.groupScope.groupIds || node.data.groupScope.groupIds.length === 0) {
        errors.push(`Approval node "${node.data?.label || node.id}" has group scope enabled but no groups selected`);
      }
    }
  }

  // Validate subgroup hierarchy
  const subgroupNodes = nodes.filter(node => node.type === 'subgroup');
  for (const subgroup of subgroupNodes) {
    if (subgroup.data?.level && subgroup.data.level > 5) {
      errors.push(`SubGroup "${subgroup.data?.label || subgroup.id}" has too many nesting levels (max 5)`);
    }
    
    // Check for circular references in parent-child relationships
    if (subgroup.data?.parentGroupId) {
      const visited = new Set<string>();
      let currentId = subgroup.data.parentGroupId;
      
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const parentNode = nodes.find(n => n.id === currentId);
        
        if (!parentNode) {
          errors.push(`SubGroup "${subgroup.data?.label || subgroup.id}" references non-existent parent "${currentId}"`);
          break;
        }
        
        if (parentNode.id === subgroup.id) {
          errors.push(`SubGroup "${subgroup.data?.label || subgroup.id}" has circular parent reference`);
          break;
        }
        
        currentId = parentNode.data?.parentGroupId;
      }
      
      if (currentId && visited.has(currentId)) {
        errors.push(`SubGroup hierarchy contains circular reference involving "${subgroup.data?.label || subgroup.id}"`);
      }
    }
  }

  // Check connectivity (exclude grouping and subgroup nodes from connectivity validation)
  const workflowNodes = nodes.filter(node => !['grouping', 'subgroup'].includes(node.type));
  const nodeIds = new Set(workflowNodes.map(node => node.id));
  
  for (const edge of edges) {
    if (!nodeIds.has(edge.source) && !nodes.find(n => n.id === edge.source && ['grouping', 'subgroup'].includes(n.type))) {
      errors.push(`Edge references non-existent source node: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target) && !nodes.find(n => n.id === edge.target && ['grouping', 'subgroup'].includes(n.type))) {
      errors.push(`Edge references non-existent target node: ${edge.target}`);
    }
  }

  // Check that all workflow nodes (except end nodes) have outgoing connections
  for (const node of workflowNodes) {
    if (node.type !== 'end') {
      const hasOutgoing = edges.some(edge => edge.source === node.id);
      if (!hasOutgoing) {
        errors.push(`Node "${node.data?.label || node.id}" has no outgoing connections`);
      }
    }
  }

  // Check that all workflow nodes (except start nodes) have incoming connections
  for (const node of workflowNodes) {
    if (node.type !== 'start') {
      const hasIncoming = edges.some(edge => edge.target === node.id);
      if (!hasIncoming) {
        errors.push(`Node "${node.data?.label || node.id}" has no incoming connections`);
      }
    }
  }

  return errors;
}
