import { IWorkflowConfiguration } from '../models/WorkflowConfiguration';

/**
 * Result of workflow validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Service for validating workflow configurations
 */
export interface IWorkflowValidator {
  validate(workflow: IWorkflowConfiguration): ValidationResult;
  validateStructure(workflow: IWorkflowConfiguration): ValidationResult;
  validateConnections(workflow: IWorkflowConfiguration): ValidationResult;
  validateRoles(workflow: IWorkflowConfiguration, companyId: string): Promise<ValidationResult>;
}

/**
 * WorkflowValidator validates workflow configurations before they are saved or activated
 */
export class WorkflowValidator implements IWorkflowValidator {
  /**
   * Validates the structure of a workflow configuration
   * Checks:
   * - Exactly one start node (Requirements 5.1)
   * - At least one end node (Requirements 5.2)
   * 
   * @param workflow - The workflow configuration to validate
   * @returns ValidationResult with valid flag and any error messages
   */
  validateStructure(workflow: IWorkflowConfiguration): ValidationResult {
    const errors: string[] = [];

    // Count start nodes
    const startNodes = workflow.nodes.filter(node => node.type === 'start');
    if (startNodes.length === 0) {
      errors.push('Workflow must have exactly one start node (found 0)');
    } else if (startNodes.length > 1) {
      errors.push(`Workflow must have exactly one start node (found ${startNodes.length})`);
    }

    // Count end nodes
    const endNodes = workflow.nodes.filter(node => node.type === 'end');
    if (endNodes.length === 0) {
      errors.push('Workflow must have at least one end node (found 0)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates the connections between nodes in a workflow
   * Checks:
   * - All nodes are reachable from start node
   * - Parallel split-join matching
   * - Conditional nodes have exactly two outputs (true/false)
   * 
   * @param workflow - The workflow configuration to validate
   * @returns ValidationResult with valid flag and any error messages
   */
  validateConnections(workflow: IWorkflowConfiguration): ValidationResult {
    const errors: string[] = [];

    // Find start node
    const startNode = workflow.nodes.find(node => node.type === 'start');
    if (!startNode) {
      // Structure validation should catch this, but handle gracefully
      return { valid: false, errors: ['Cannot validate connections: no start node found'] };
    }

    // Build adjacency map for graph traversal
    const adjacencyMap = new Map<string, string[]>();
    workflow.nodes.forEach(node => adjacencyMap.set(node.id, []));
    workflow.edges.forEach(edge => {
      const targets = adjacencyMap.get(edge.source) || [];
      targets.push(edge.target);
      adjacencyMap.set(edge.source, targets);
    });

    // Check 1: Node Reachability (Requirement 5.3)
    const reachable = new Set<string>();
    const queue: string[] = [startNode.id];
    reachable.add(startNode.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adjacencyMap.get(current) || [];
      
      for (const neighbor of neighbors) {
        if (!reachable.has(neighbor)) {
          reachable.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    // Find unreachable nodes
    const unreachableNodes = workflow.nodes.filter(node => !reachable.has(node.id));
    unreachableNodes.forEach(node => {
      errors.push(`Node '${node.label}' (${node.id}) is not reachable from the start node`);
    });

    // Check 2: Conditional Node Outputs (Requirement 12.6)
    const conditionalNodes = workflow.nodes.filter(node => node.type === 'conditional');
    conditionalNodes.forEach(node => {
      const outgoingEdges = workflow.edges.filter(edge => edge.source === node.id);
      
      if (outgoingEdges.length !== 2) {
        errors.push(`Conditional node '${node.label}' (${node.id}) must have exactly 2 outgoing edges (found ${outgoingEdges.length})`);
      } else {
        const labels = outgoingEdges.map(edge => edge.label?.toLowerCase()).sort();
        const expectedLabels = ['false', 'true'];
        
        if (labels[0] !== expectedLabels[0] || labels[1] !== expectedLabels[1]) {
          errors.push(`Conditional node '${node.label}' (${node.id}) must have edges labeled 'true' and 'false' (found: ${outgoingEdges.map(e => e.label || 'unlabeled').join(', ')})`);
        }
      }
    });

    // Check 3: Parallel Split-Join Matching (Requirement 5.4)
    const parallelSplits = workflow.nodes.filter(node => node.type === 'parallel_split');
    const parallelJoins = workflow.nodes.filter(node => node.type === 'parallel_join');

    parallelSplits.forEach(splitNode => {
      const splitPaths = adjacencyMap.get(splitNode.id) || [];
      
      if (splitPaths.length < 2) {
        errors.push(`Parallel split node '${splitNode.label}' (${splitNode.id}) must have at least 2 outgoing paths (found ${splitPaths.length})`);
        return;
      }

      // Find all join nodes reachable from this split
      const reachableJoins = new Set<string>();
      const visited = new Set<string>();
      const exploreQueue: string[] = [...splitPaths];

      while (exploreQueue.length > 0) {
        const current = exploreQueue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);

        const currentNode = workflow.nodes.find(n => n.id === current);
        if (currentNode?.type === 'parallel_join') {
          reachableJoins.add(current);
          continue; // Don't traverse beyond join nodes
        }

        const neighbors = adjacencyMap.get(current) || [];
        exploreQueue.push(...neighbors);
      }

      if (reachableJoins.size === 0) {
        errors.push(`Parallel split node '${splitNode.label}' (${splitNode.id}) has no corresponding parallel join node`);
      }
    });

    // Check that all parallel joins have at least one split leading to them
    parallelJoins.forEach(joinNode => {
      const incomingEdges = workflow.edges.filter(edge => edge.target === joinNode.id);
      
      if (incomingEdges.length < 2) {
        errors.push(`Parallel join node '${joinNode.label}' (${joinNode.id}) must have at least 2 incoming edges (found ${incomingEdges.length})`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates that all referenced roles exist in the company
   * 
   * @param workflow - The workflow configuration to validate
   * @param companyId - The company ID to check roles against
   * @returns ValidationResult with valid flag and any error messages
   */
  async validateRoles(workflow: IWorkflowConfiguration, companyId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    
    // Import CustomRole model dynamically to avoid circular dependencies
    const CustomRole = (await import('../models/CustomRole')).default;
    
    // Extract all roleId references from approval nodes
    const roleIds = workflow.nodes
      .filter(node => node.type === 'approval' && node.data.roleId)
      .map(node => node.data.roleId!);
    
    // If no roles are referenced, validation passes
    if (roleIds.length === 0) {
      return { valid: true, errors: [] };
    }
    
    // Remove duplicates
    const uniqueRoleIds = Array.from(new Set(roleIds.map(id => id.toString())));
    
    // Query database to verify each roleId exists and belongs to the company
    for (const roleId of uniqueRoleIds) {
      const role = await CustomRole.findOne({
        _id: roleId,
        companyId: companyId,
      });
      
      if (!role) {
        // Find which nodes reference this invalid role for better error messages
        const invalidNodes = workflow.nodes.filter(
          node => node.data.roleId?.toString() === roleId
        );
        
        invalidNodes.forEach(node => {
          errors.push(
            `Node '${node.data?.label || 'undefined'}' (${node.id}) references role ID '${roleId}' which does not exist in the company`
          );
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Performs comprehensive validation of a workflow configuration
   * Combines all validation checks (structure and connections)
   * 
   * This method should be called before saving or activating workflows to ensure they are valid.
   * It prevents activation of invalid workflows by returning valid=false when any validation fails.
   * 
   * Validation checks performed:
   * - Structure validation: Exactly one start node, at least one end node
   * - Connection validation: Node reachability, parallel split-join matching, conditional outputs
   * 
   * Note: Role validation (validateRoles) is not included in this method as it requires
   * async database queries. Call validateRoles separately when needed.
   * 
   * @param workflow - The workflow configuration to validate
   * @returns ValidationResult with valid=true only if all checks pass, and comprehensive error list
   * 
   * **Validates: Requirements 5.5, 5.6**
   */
  validate(workflow: IWorkflowConfiguration): ValidationResult {
    // Call validateStructure to check start/end nodes
    const structureResult = this.validateStructure(workflow);
    
    // Call validateConnections to check reachability, parallel matching, and conditional outputs
    const connectionsResult = this.validateConnections(workflow);

    // Combine all errors from both validations
    const allErrors = [...structureResult.errors, ...connectionsResult.errors];

    // Return valid=true only if all checks pass
    return {
      valid: structureResult.valid && connectionsResult.valid,
      errors: allErrors,
    };
  }
}
