import { RequestStatus, ActionType, UserRole } from './types';
import { approvalEngine } from './approval-engine';

export interface RequestVisibility {
  canSee: boolean;
  category: 'pending' | 'approved' | 'in_progress' | 'completed';
  reason: string;
  userAction?: 'approve' | 'clarify' | 'reject' | null;
}

/**
 * Determines if a user can see a request and categorizes it based on their involvement
 */
export function analyzeRequestVisibility(
  request: any,
  userRole: string,
  userId: string,
  userCollege?: string,
  permissions?: { canCreate: boolean; isSystemAdmin?: boolean } // Add isSystemAdmin
): RequestVisibility {

  // System Admins can see everything
  if (permissions?.isSystemAdmin) {
    return {
      canSee: true,
      category: request.status === RequestStatus.APPROVED ? 'approved' : 
                request.status === RequestStatus.REJECTED ? 'completed' : 'in_progress',
      reason: 'System Administrator Access'
    };
  }

  // Requesters can always see their own requests
  if (permissions?.canCreate) {
    if (request.requester._id?.toString() === userId || request.requester.toString() === userId) {
      return {
        canSee: true,
        category: getRequesterCategory(request.status, request.pendingQuery, request.queryLevel),
        reason: 'Own request'
      };
    }
    // If they can create but it's not their request, they generally shouldn't see it 
    // unless they have other permissions (like an admin)
    return { canSee: false, category: 'completed', reason: 'Not own request' };
  }

  // Apply institutional isolation for roles up to Head of Institution
  const institutionalRoles = [
    'institution_manager',
    'sop_verifier',
    'accountant',
    'vp',
    'head_of_institution'
  ];

  if (institutionalRoles.includes(userRole)) {
    const requestCollege = request.college;
    if (userCollege && requestCollege && userCollege !== requestCollege) {
      return {
        canSee: false,
        category: 'completed',
        reason: `Restricted to institution: ${userCollege}`
      };
    }
  }

  // For approvers, check if request has reached their level through proper workflow
  return analyzeApproverVisibility(request, userRole, userId);
}

function getRequesterCategory(
  status: RequestStatus,
  pendingQuery?: boolean,
  queryLevel?: string
): 'pending' | 'approved' | 'in_progress' | 'completed' {
  switch (status) {
    case RequestStatus.APPROVED:
      return 'approved';
    case RequestStatus.REJECTED:
      // If request is rejected but pending response from requester, show as pending
      if (pendingQuery && queryLevel === 'requester') {
        return 'pending';
      }
      return 'completed';
    case RequestStatus.SUBMITTED:
      return 'pending';
    default:
      return 'pending'; 
  }
}

function analyzeApproverVisibility(
  request: any,
  userRole: string,
  userId: string
): RequestVisibility {

  const history = request.history || [];

  // Check if user has been involved in this request
  const userInvolvement = analyzeUserInvolvement(history, userRole, userId);

  // Check if request currently needs user's approval
  const needsCurrentApproval = doesRequestNeedUserApproval(request, userRole, userId, history);

  // Check if request is pending response from this user
  const needsClarification = request.pendingQuery && request.queryLevel === userRole;

  // Check if request has reached or passed through user's workflow level
  const hasReachedUserLevel = hasRequestReachedUserLevel(request, userRole, history);

  // Special handling for Dean - can see requests they sent for department queries
  const deanCanSeeClariRequest = userRole === 'dean' &&
    request.status === RequestStatus.DEPARTMENT_CHECKS &&
    history.some((h: any) =>
      h.action === ActionType.CLARIFY &&
      h.queryTarget &&
      (h.actor?._id?.toString() === userId || h.actor?.toString() === userId)
    );

  const canSee = userInvolvement.hasBeenInvolved || needsCurrentApproval || needsClarification || hasReachedUserLevel || deanCanSeeClariRequest;

  if (!canSee) {
    return { canSee: false, category: 'completed', reason: 'Not involved and not at user level' };
  }

  // User can see the request, now categorize it
  const category = categorizeRequestForUser(request, userRole, userId, userInvolvement);

  return {
    canSee: true,
    category: category.category,
    reason: category.reason,
    userAction: category.userAction
  };
}

interface UserInvolvement {
  hasBeenInvolved: boolean;
  hasApproved: boolean;
  hasRejected: boolean;
  hasClarified: boolean;
  lastAction?: ActionType;
  lastActionTimestamp?: Date;
}

function analyzeUserInvolvement(
  history: any[],
  userRole: string,
  userId: string
): UserInvolvement {

  const userActions = history.filter(h =>
    h.actor?._id?.toString() === userId || h.actor?.toString() === userId
  );

  const involvement: UserInvolvement = {
    hasBeenInvolved: userActions.length > 0,
    hasApproved: false,
    hasRejected: false,
    hasClarified: false
  };

  if (userActions.length > 0) {
    const lastAction = userActions[userActions.length - 1];
    involvement.lastAction = lastAction.action;
    involvement.lastActionTimestamp = lastAction.timestamp;

    // Consider both APPROVE and FORWARD as approval actions
    involvement.hasApproved = userActions.some(a =>
      a.action === ActionType.APPROVE || a.action === ActionType.FORWARD
    );
    involvement.hasRejected = userActions.some(a => a.action === ActionType.REJECT);
    involvement.hasClarified = userActions.some(a => a.action === ActionType.CLARIFY);
  }

  return involvement;
}



/**
 * Check if a request has reached or passed through the user's workflow level
 * IMPORTANT: Users should NOT see requests that were rejected before reaching their level
 */
function hasRequestReachedUserLevel(
  request: any,
  userRole: string,
  history: any[]
): boolean {

  const currentStatus = request.status;

  // If request is rejected, check if it was rejected before reaching this user's level
  if (currentStatus === RequestStatus.REJECTED) {
    return hasRequestReachedUserLevelBeforeRejection(request, userRole, history);
  }

  // Special handling for department checks - only show to targeted department
  const deptRoles = ['mma', 'hr', 'audit', 'it'];
  if (currentStatus === RequestStatus.DEPARTMENT_CHECKS && deptRoles.includes(userRole)) {

    // Find the latest clarification request from Dean
    const latestClarification = history
      .filter((h: any) => h.action === ActionType.CLARIFY && h.queryTarget)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    // Only show to the department that was specifically targeted
    if (latestClarification) {
      const targetedRole = latestClarification.queryTarget; // e.g., 'hr', 'mma'
      return targetedRole === userRole;
    }

    return false; // No clarification found, don't show to any department
  }

  // Get all statuses that this user role can handle
  const userStatuses = getAllStatusesForRole(userRole);

  // Check if current status is one the user can handle
  if (userStatuses.includes(currentStatus)) {
    return true;
  }

  // Check if request has been at any status this user can handle in the past
  const hasBeenAtUserLevel = history.some((h: any) =>
    h.newStatus && userStatuses.includes(h.newStatus)
  );

  if (hasBeenAtUserLevel) {
    return true;
  }

  return false;
}

/**
 * Check if a rejected request actually reached the user's level before being rejected
 */
function hasRequestReachedUserLevelBeforeRejection(
  request: any,
  userRole: string,
  history: any[]
): boolean {

  // Get all statuses that this user role can handle
  const userStatuses = getAllStatusesForRole(userRole);

  // Find when the request was rejected
  const rejectionEntry = history.find((h: any) => h.newStatus === RequestStatus.REJECTED);
  if (!rejectionEntry) {
    return false; // No rejection found, shouldn't happen for rejected requests
  }

  const rejectionTime = new Date(rejectionEntry.timestamp);

  // Check if the request was ever at this user's level BEFORE the rejection
  const wasAtUserLevelBeforeRejection = history.some((h: any) => {
    if (!h.newStatus || !userStatuses.includes(h.newStatus)) {
      return false;
    }

    const entryTime = new Date(h.timestamp);
    return entryTime < rejectionTime;
  });

  return wasAtUserLevelBeforeRejection;
}

/**
 * Check if a request currently needs the user's approval
 */
function doesRequestNeedUserApproval(
  request: any,
  userRole: string,
  userId: string,
  history: any[]
): boolean {

  const currentStatus = request.status;

  // Special handling for department queries
  const deptRoles = ['mma', 'hr', 'audit', 'it'];
  if (currentStatus === RequestStatus.DEPARTMENT_CHECKS && deptRoles.includes(userRole)) {

    // Find the latest queries request from Dean
    const latestClarification = history
      .filter((h: any) => h.action === ActionType.CLARIFY && h.queryTarget)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    // Only show to the department that was specifically targeted
    if (latestClarification) {
      const targetedRole = latestClarification.queryTarget; 
      return targetedRole === userRole;
    }

    return false;
  }

  // Check if current status requires this user's role
  const requiredApprovers = approvalEngine.getRequiredApprover(currentStatus);
  if (!requiredApprovers.includes(userRole as UserRole)) {
    return false;
  }

  // Find when the request was last set to the current status
  const lastStatusChange = history
    ?.filter((h: any) => h.newStatus === currentStatus)
    ?.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  // Check if user has acted AFTER the request was set to current status
  const hasActedAfterStatusChange = lastStatusChange && history?.some((h: any) =>
    (h.actor?._id?.toString() === userId || h.actor?.toString() === userId) &&
    new Date(h.timestamp) > new Date(lastStatusChange.timestamp) &&
    (h.action === ActionType.APPROVE || h.action === ActionType.FORWARD)
  );

  // User needs to act if they haven't acted after the latest status change
  return !hasActedAfterStatusChange;
}

function getAllStatusesForRole(userRole: string): RequestStatus[] {
  const statusMap: Record<string, RequestStatus[]> = {
    'requester': [],
    'institution_manager': [
      RequestStatus.MANAGER_REVIEW,
      RequestStatus.PARALLEL_VERIFICATION,
      RequestStatus.INSTITUTION_VERIFIED
    ],
    'sop_verifier': [
      RequestStatus.SOP_VERIFICATION,
      RequestStatus.PARALLEL_VERIFICATION,
      RequestStatus.SOP_COMPLETED,
      RequestStatus.BUDGET_COMPLETED
    ],
    'accountant': [
      RequestStatus.BUDGET_CHECK,
      RequestStatus.PARALLEL_VERIFICATION,
      RequestStatus.BUDGET_COMPLETED,
      RequestStatus.SOP_COMPLETED
    ],
    'vp': [RequestStatus.VP_APPROVAL],
    'head_of_institution': [RequestStatus.HOI_APPROVAL],
    'dean': [RequestStatus.DEAN_REVIEW, RequestStatus.DEAN_VERIFICATION],
    'mma': [RequestStatus.DEPARTMENT_CHECKS],
    'hr': [RequestStatus.DEPARTMENT_CHECKS],
    'audit': [RequestStatus.DEPARTMENT_CHECKS],
    'it': [RequestStatus.DEPARTMENT_CHECKS],
    'chief_director': [RequestStatus.CHIEF_DIRECTOR_APPROVAL],
    'chairman': [RequestStatus.CHAIRMAN_APPROVAL]
  };

  return statusMap[userRole] || [];
}

function categorizeRequestForUser(
  request: any,
  userRole: string,
  userId: string,
  involvement: UserInvolvement
): { category: 'pending' | 'approved' | 'in_progress' | 'completed'; reason: string; userAction?: 'approve' | 'clarify' | 'reject' | null } {

  const currentStatus = request.status;

  // If request is completed (approved/rejected), it's completed for everyone
  if (currentStatus === RequestStatus.APPROVED) {
    return {
      category: 'approved',
      reason: 'Request has been approved',
      userAction: involvement.hasApproved ? 'approve' : null
    };
  }

  if (currentStatus === RequestStatus.REJECTED) {
    return {
      category: 'completed',
      reason: 'Request has been rejected',
      userAction: involvement.hasRejected ? 'reject' : null
    };
  }

  // Special handling for queries workflow states
  if (request.pendingQuery) {
    const latestRejectionWithClarification = request.history
      ?.filter((h: any) => h.action === ActionType.REJECT_WITH_CLARIFICATION)
      ?.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (latestRejectionWithClarification) {
      const rejectorId = latestRejectionWithClarification.actor?._id?.toString() || latestRejectionWithClarification.actor?.toString();

      if (rejectorId === userId) {
        const requesterClarificationProvided = request.history?.some((h: any) =>
          h.action === ActionType.CLARIFY_AND_REAPPROVE &&
          h.actor?.role?.name.toLowerCase().includes('requester') &&
          new Date(h.timestamp) > new Date(latestRejectionWithClarification.timestamp)
        );

        if (requesterClarificationProvided) {
          return {
            category: 'pending',
            reason: 'Requester provided query - review needed',
            userAction: 'clarify'
          };
        } else {
          return {
            category: 'completed',
            reason: 'You rejected this request - awaiting requester query',
            userAction: 'reject'
          };
        }
      }
    }
  }

  if (request.pendingQuery && request.queryLevel === userRole) {
    // Check if user is a requester by name since we don't have permissions object here easily
    // or just assume if queryLevel matches userRole, it's pending for them
    return {
      category: 'pending',
      reason: 'Needs query from you',
      userAction: 'clarify'
    };
  }

  // Check if user needs to act on this request now
  const requiredApprovers = approvalEngine.getRequiredApprover(currentStatus);
  const needsUserAction = requiredApprovers.includes(userRole as UserRole);

  if (needsUserAction) {
    const lastStatusChange = request.history
      ?.filter((h: any) => h.newStatus === currentStatus)
      ?.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    const hasActedAfterStatusChange = lastStatusChange && request.history?.some((h: any) =>
      (h.actor?._id?.toString() === userId || h.actor?.toString() === userId) &&
      new Date(h.timestamp) > new Date(lastStatusChange.timestamp) &&
      (h.action === ActionType.APPROVE || h.action === ActionType.FORWARD)
    );

    if (!hasActedAfterStatusChange) {
      return {
        category: 'pending',
        reason: 'Waiting for your approval',
        userAction: null
      };
    }
  }

  if (involvement.hasBeenInvolved) {
    if (involvement.hasApproved) {
      return {
        category: 'approved',
        reason: 'You approved this request',
        userAction: 'approve'
      };
    }
    if (involvement.hasRejected) {
      const userRejectionWithClarification = request.history?.find((h: any) =>
        (h.actor?._id?.toString() === userId || h.actor?.toString() === userId) &&
        h.action === ActionType.REJECT_WITH_CLARIFICATION
      );

      if (userRejectionWithClarification) {
        const requesterClarificationProvided = request.history?.some((h: any) =>
          h.action === ActionType.CLARIFY_AND_REAPPROVE &&
          h.actor?.role?.name.toLowerCase().includes('requester') &&
          new Date(h.timestamp) > new Date(userRejectionWithClarification.timestamp)
        );

        if (requesterClarificationProvided && request.pendingQuery === false) {
          return {
            category: 'pending',
            reason: 'Requester provided query - review needed',
            userAction: 'clarify'
          };
        }
      }

      return {
        category: 'completed',
        reason: 'You rejected this request',
        userAction: 'reject'
      };
    }
    if (involvement.hasClarified) {
      return {
        category: 'in_progress',
        reason: 'You requested query',
        userAction: 'clarify'
      };
    }
  }

  const userStatuses = getAllStatusesForRole(userRole);
  if (userStatuses.includes(currentStatus)) {
    return {
      category: 'pending',
      reason: 'Available for your review',
      userAction: null
    };
  }

  return {
    category: 'in_progress',
    reason: 'Request in workflow',
    userAction: null
  };
}

export function filterRequestsByVisibility(
  requests: any[],
  userRole: string,
  userId: string,
  userCollege?: string,
  permissions?: { canCreate: boolean; isSystemAdmin?: boolean },
  categoryFilter?: 'pending' | 'approved' | 'in_progress' | 'completed'
): any[] {

  return requests
    .filter(request => request && request._id) 
    .map(request => {
      const safeRequest = {
        _id: request._id,
        title: request.title || 'Untitled Request',
        status: request.status || 'unknown',
        college: request.college || 'Unknown',
        department: request.department || 'Unknown',
        costEstimate: request.costEstimate || 0,
        createdAt: request.createdAt || new Date(),
        requester: request.requester || { name: 'Unknown', email: 'unknown' },
        history: request.history || [],
        ...request, 
        _visibility: analyzeRequestVisibility(request, userRole, userId, userCollege, permissions)
      };
      return safeRequest;
    })
    .filter(request => {
      if (!request._visibility.canSee) return false;
      if (categoryFilter && request._visibility.category !== categoryFilter) return false;
      return true;
    });
}