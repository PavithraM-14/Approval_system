import mongoose from 'mongoose';
import Role from '../models/Role';
import WorkflowConfiguration from '../models/WorkflowConfiguration';
import UserRoleAssignment from '../models/UserRoleAssignment';

/**
 * RoleService manages roles and user assignments for the workflow system.
 * Provides methods for creating, updating, deleting roles and managing user-role assignments.
 */
class RoleService {
  /**
   * Create a new role for a company
   * @param roleData - Role data including name and optional description
   * @param companyId - Company ID to associate the role with
   * @returns Created role with ID
   * @throws Error if role name already exists for the company
   */
  async createRole(
    roleData: { name: string; description?: string },
    companyId: string
  ): Promise<any> {
    try {
      // Validate inputs
      if (!roleData.name || roleData.name.trim().length === 0) {
        throw new Error('Role name is required');
      }

      if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new Error('Valid company ID is required');
      }

      // Create the role
      const role = await Role.create({
        company: new mongoose.Types.ObjectId(companyId),
        name: roleData.name.trim(),
        description: roleData.description?.trim(),
        isSystemAdmin: false,
        permissions: {
          canView: true,
          canCreate: false,
          canEdit: false,
          canShare: false,
          canDownload: false,
          canForward: false,
          canManageBudget: false,
          canESign: false,
          canApprove: false,
          canRaiseQueries: false,
        }
      });

      return role;
    } catch (error: any) {
      // Handle duplicate key error
      if (error.code === 11000) {
        throw new Error(`Role name "${roleData.name}" already exists for this company`);
      }
      throw error;
    }
  }

  /**
   * Update a role's name and/or description
   * Updates all references in existing workflows
   * @param roleId - Role ID to update
   * @param updates - Partial role data to update
   * @returns Updated role
   */
  async updateRole(
    roleId: string,
    updates: Partial<{ name: string; description: string }>
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      throw new Error('Valid role ID is required');
    }

    const role = await Role.findById(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    // Update role fields
    if (updates.name !== undefined) {
      role.name = updates.name.trim();
    }
    if (updates.description !== undefined) {
      role.description = updates.description.trim();
    }

    await role.save();

    // Note: Workflow references use roleId, so no need to update workflows
    // The role name is fetched dynamically when displaying workflows

    return role;
  }

  /**
   * Delete a role if it's not used in any active workflow
   * @param roleId - Role ID to delete
   * @param companyId - Company ID for validation
   * @throws Error if role is in use or is a system admin role
   */
  async deleteRole(roleId: string, companyId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      throw new Error('Valid role ID is required');
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      throw new Error('Valid company ID is required');
    }

    // Check if role exists and belongs to company
    const role = await Role.findOne({
      _id: roleId,
      company: new mongoose.Types.ObjectId(companyId),
    });

    if (!role) {
      throw new Error('Role not found');
    }

    // Prevent deletion of system admin roles
    if (role.isSystemAdmin) {
      throw new Error('Cannot delete system admin roles');
    }

    // Check if role is used in any workflow
    const isInUse = await this.isRoleInUse(roleId, companyId);
    if (isInUse) {
      throw new Error('Cannot delete role that is used in active workflows');
    }

    // Delete all user-role assignments
    await UserRoleAssignment.deleteMany({ roleId: new mongoose.Types.ObjectId(roleId) });

    // Delete the role
    await Role.findByIdAndDelete(roleId);
  }

  /**
   * Get all roles for a company
   * @param companyId - Company ID
   * @returns Array of roles
   */
  async getRoles(companyId: string): Promise<any[]> {
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      throw new Error('Valid company ID is required');
    }

    return await Role.find({
      company: new mongoose.Types.ObjectId(companyId),
    }).sort({ name: 1 });
  }

  /**
   * Assign a user to a role
   * @param userId - User ID
   * @param roleId - Role ID
   */
  async assignUserToRole(userId: string, roleId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Valid user ID is required');
    }

    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      throw new Error('Valid role ID is required');
    }

    // Get role to get company
    const role = await Role.findById(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    // Create assignment (unique index prevents duplicates)
    const assignment = new UserRoleAssignment({
      userId: new mongoose.Types.ObjectId(userId),
      roleId: new mongoose.Types.ObjectId(roleId),
      companyId: role.company,
    });

    try {
      await assignment.save();
    } catch (error: any) {
      if (error.code === 11000) {
        // User already assigned to this role - silently succeed
        return;
      }
      throw error;
    }
  }

  /**
   * Remove a user from a role
   * @param userId - User ID
   * @param roleId - Role ID
   */
  async removeUserFromRole(userId: string, roleId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Valid user ID is required');
    }

    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      throw new Error('Valid role ID is required');
    }

    await UserRoleAssignment.deleteOne({
      userId: new mongoose.Types.ObjectId(userId),
      roleId: new mongoose.Types.ObjectId(roleId),
    });
  }

  /**
   * Get all users assigned to a specific role
   * @param roleId - Role ID
   * @param companyId - Company ID for validation
   * @returns Array of user objects
   */
  async getUsersByRole(roleId: string, companyId: string): Promise<any[]> {
    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      throw new Error('Valid role ID is required');
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      throw new Error('Valid company ID is required');
    }

    const assignments = await UserRoleAssignment.find({
      roleId: new mongoose.Types.ObjectId(roleId),
      companyId: new mongoose.Types.ObjectId(companyId),
    }).populate('userId');

    return assignments.map((assignment) => assignment.userId);
  }

  /**
   * Check if a role is used in any workflow
   * @param roleId - Role ID
   * @param companyId - Company ID
   * @returns True if role is in use
   */
  async isRoleInUse(roleId: string, companyId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      throw new Error('Valid role ID is required');
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      throw new Error('Valid company ID is required');
    }

    const roleObjectId = new mongoose.Types.ObjectId(roleId);

    // Check if role is referenced in any workflow node
    const workflow = await WorkflowConfiguration.findOne({
      companyId: new mongoose.Types.ObjectId(companyId),
      'nodes.data.roleId': roleObjectId,
    });

    return workflow !== null;
  }
}

// Export singleton instance
export const roleService = new RoleService();
export default roleService;
