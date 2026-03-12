import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import { getCurrentUser } from '../../../../../lib/auth';
import WorkflowConfiguration from '../../../../../models/WorkflowConfiguration';
import Group from '../../../../../models/Group';
import Role from '../../../../../models/Role';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const roleId = params.id;
    
    // Find the role to ensure it exists
    const role = await Role.findById(roleId);
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Find active workflows for this company
    const workflows = await WorkflowConfiguration.find({
      companyId: user.companyId,
      isActive: true,
    }).populate('nodes.data.groupScope.groupIds');

    // Analyze workflows to find group requirements for this role
    const groupRequirements = new Map<string, Set<string>>(); // groupType -> Set of groupIds
    const groupDetails = new Map<string, any>(); // groupId -> group details

    for (const workflow of workflows) {
      for (const node of workflow.nodes) {
        // Check if this node is assigned to the specified role
        if (node.data.roleId?.toString() === roleId && 
            node.data.groupScope?.enabled && 
            node.data.groupScope.groupIds?.length > 0) {
          
          // Get group details for each group in this node
          const groups = await Group.find({
            _id: { $in: node.data.groupScope.groupIds },
            companyId: user.companyId,
            isActive: true,
          });

          for (const group of groups) {
            if (!groupRequirements.has(group.type)) {
              groupRequirements.set(group.type, new Set());
            }
            groupRequirements.get(group.type)!.add(group._id.toString());
            groupDetails.set(group._id.toString(), {
              _id: group._id,
              name: group.name,
              type: group.type,
              description: group.description,
            });
          }
        }
      }
    }

    // Convert to response format
    const result = Array.from(groupRequirements.entries()).map(([groupType, groupIds]) => ({
      groupType,
      groups: Array.from(groupIds).map(id => groupDetails.get(id)),
      fieldSuggestion: {
        fieldName: groupType.toLowerCase().replace('_', ''),
        label: groupType.charAt(0).toUpperCase() + groupType.slice(1).replace('_', ' '),
        type: 'select' as const,
        required: true,
        options: Array.from(groupIds).map(id => groupDetails.get(id)?.name).filter(Boolean),
        helpText: `Select your ${groupType.replace('_', ' ')} to ensure requests are routed correctly`,
      },
    }));

    return NextResponse.json({
      roleId,
      roleName: role.name,
      hasWorkflowGroups: result.length > 0,
      groupRequirements: result,
      suggestedConfiguration: result.length > 0 ? {
        requireGroupSelection: true,
        allowedGroupTypes: Array.from(groupRequirements.keys()),
        groupSelectionMode: 'single' as const,
        fields: result.map(req => req.fieldSuggestion),
      } : null,
    });

  } catch (error) {
    console.error('Error analyzing workflow groups:', error);
    return NextResponse.json(
      { error: 'Failed to analyze workflow groups' },
      { status: 500 }
    );
  }
}