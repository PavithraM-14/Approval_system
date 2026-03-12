import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import { getCurrentUser } from '../../../../lib/auth';
import SignupFormConfiguration from '../../../../models/SignupFormConfiguration';
import WorkflowConfiguration from '../../../../models/WorkflowConfiguration';
import Group from '../../../../models/Group';
import Role from '../../../../models/Role';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roleId } = await request.json();

    if (!roleId) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    await connectDB();

    // Find the role
    const role = await Role.findById(roleId);
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Check if configuration already exists
    const existingConfig = await SignupFormConfiguration.findOne({
      roleId,
      companyId: user.companyId,
    });

    if (existingConfig) {
      return NextResponse.json({ 
        error: 'Signup form configuration already exists for this role',
        existingConfig 
      }, { status: 409 });
    }

    // Find active workflows for this company
    const workflows = await WorkflowConfiguration.find({
      companyId: user.companyId,
      isActive: true,
    });

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

    // Generate signup form configuration
    const hasGroupRequirements = groupRequirements.size > 0;
    
    const fields = [];
    let fieldOrder = 1;

    // Add standard fields
    fields.push({
      fieldName: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      placeholder: 'Enter your full name',
      order: fieldOrder++,
    });

    fields.push({
      fieldName: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      placeholder: 'Enter your email address',
      order: fieldOrder++,
    });

    fields.push({
      fieldName: 'contactNo',
      label: 'Contact Number',
      type: 'tel',
      required: true,
      placeholder: 'Enter your contact number',
      order: fieldOrder++,
    });

    // Add group-specific fields
    if (hasGroupRequirements) {
      for (const [groupType, groupIds] of groupRequirements.entries()) {
        const groupOptions = Array.from(groupIds)
          .map(id => groupDetails.get(id)?.name)
          .filter(Boolean);

        fields.push({
          fieldName: groupType.toLowerCase().replace('_', ''),
          label: groupType.charAt(0).toUpperCase() + groupType.slice(1).replace('_', ' '),
          type: 'select',
          required: true,
          options: groupOptions,
          helpText: `Select your ${groupType.replace('_', ' ')} to ensure requests are routed correctly`,
          order: fieldOrder++,
        });
      }
    }

    fields.push({
      fieldName: 'password',
      label: 'Password',
      type: 'text', // Will be handled specially by DynamicSignupForm
      required: true,
      placeholder: 'Create a secure password',
      validation: {
        minLength: 8,
        customMessage: 'Password must be at least 8 characters long',
      },
      order: fieldOrder++,
    });

    // Create the configuration
    const configuration = new SignupFormConfiguration({
      companyId: user.companyId,
      roleId,
      roleName: role.name,
      fields,
      requireGroupSelection: hasGroupRequirements,
      allowedGroupTypes: Array.from(groupRequirements.keys()),
      groupSelectionMode: 'single',
      isActive: true,
      createdBy: user.id,
    });

    await configuration.save();

    return NextResponse.json({
      message: 'Signup form configuration generated successfully',
      configuration: {
        _id: configuration._id,
        roleId: configuration.roleId,
        roleName: configuration.roleName,
        fields: configuration.fields,
        requireGroupSelection: configuration.requireGroupSelection,
        allowedGroupTypes: configuration.allowedGroupTypes,
        groupSelectionMode: configuration.groupSelectionMode,
        isActive: configuration.isActive,
      },
      analysis: {
        hasWorkflowGroups: hasGroupRequirements,
        groupRequirements: Array.from(groupRequirements.entries()).map(([groupType, groupIds]) => ({
          groupType,
          groups: Array.from(groupIds).map(id => groupDetails.get(id)),
        })),
      },
    });

  } catch (error) {
    console.error('Error auto-generating signup form:', error);
    return NextResponse.json(
      { error: 'Failed to generate signup form configuration' },
      { status: 500 }
    );
  }
}