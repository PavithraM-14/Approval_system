const fs = require('fs');

const filePath = 'components/ApprovalWorkflow.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the options handling section
const oldCode = `      // Handle options
      if (node.type === 'options') {
        const optionIds = getNextNodes(currentId);
        const options: FlowStep[][] = [];
        
        for (const optionId of optionIds) {
          const optionPath = buildPath(optionId, false);
          if (optionPath.length > 0) options.push(optionPath);
        }
        
        step.optionBranches = options;
        path.push(step);
        break; // Options are terminal
      }`;

const newCode = `      // Handle options
      if (node.type === 'options') {
        const optionIds = getNextNodes(currentId);
        const options: FlowStep[][] = [];
        let commonEndId: string | null = null;
        
        for (const optionId of optionIds) {
          // Build option path but stop before end node
          const optionPath: FlowStep[] = [];
          let optCurrentId = optionId;
          const optVisited = new Set<string>();
          
          while (optCurrentId && !optVisited.has(optCurrentId)) {
            const optNode = nodes.find(n => n.id === optCurrentId);
            if (!optNode) break;
            
            // If we hit end node, save it and stop
            if (optNode.type === 'end') {
              commonEndId = optNode.id;
              break;
            }
            
            optVisited.add(optCurrentId);
            
            const optStep: FlowStep = {
              id: optNode.id,
              name: optNode.label || optNode.data?.label || optNode.type,
              type: optNode.type,
              status: getStatus(optNode.id)
            };
            
            const optGroupNode = getGroupInfo(optNode.id);
            if (optGroupNode) {
              optStep.groupName = optGroupNode.label || optGroupNode.data?.label;
              optStep.groupType = optGroupNode.type;
            }
            
            optionPath.push(optStep);
            
            const nextIds = getNextNodes(optCurrentId);
            optCurrentId = nextIds[0];
          }
          
          if (optionPath.length > 0) options.push(optionPath);
        }
        
        step.optionBranches = options;
        path.push(step);
        
        // Add the common end node after options
        if (commonEndId) {
          const endNode = nodes.find(n => n.id === commonEndId);
          if (endNode) {
            path.push({
              id: endNode.id,
              name: endNode.label || endNode.data?.label || 'Approved',
              type: endNode.type,
              status: getStatus(endNode.id)
            });
          }
        }
        
        break; // Options are terminal
      }`;

content = content.replace(oldCode, newCode);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Patched ApprovalWorkflow.tsx');
