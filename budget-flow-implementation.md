# Budget Availability Flow Implementation

## ✅ IMPLEMENTED LOGIC

### Normal Flow (Budget Available)
**Institution Manager → VP → HOI → Dean → Chief Director → (Chairman if cost > ₹50,000)**

1. Institution Manager selects "budget_available"
2. Goes to VP → HOI → Dean → Chief Director
3. At Chief Director:
   - If cost > ₹50,000 → Continue to Chairman
   - If cost ≤ ₹50,000 → APPROVED (stop here)

### Budget Not Available Flow  
**Institution Manager → Dean → Chairman → APPROVED**

1. Institution Manager selects "budget_not_available"
2. Goes directly to Dean (bypasses VP, HOI)
3. Dean always forwards to Chairman (regardless of cost)
4. Chairman makes final approval decision

## Code Implementation

### Approval Engine (`lib/approval-engine.ts`)

```typescript
case UserRole.DEAN:
  if (currentStatus === RequestStatus.DEAN_REVIEW && action !== ActionType.CLARIFY) {
    const budgetNotAvailable = context?.budgetNotAvailable;
    if (budgetNotAvailable) {
      // Budget not available path → Always go to Chairman
      return RequestStatus.CHAIRMAN_APPROVAL;
    }
    // Normal flow (budget available) → Dean → Chief Director
    return RequestStatus.CHIEF_DIRECTOR_APPROVAL;
  }
  break;

case UserRole.CHIEF_DIRECTOR:
  if (currentStatus === RequestStatus.CHIEF_DIRECTOR_APPROVAL) {
    const budgetNotAvailable = context?.budgetNotAvailable;
    
    if (budgetNotAvailable) {
      // Budget not available path → This should not happen as Dean goes directly to Chairman
      // But if it does happen, approve it
      return RequestStatus.APPROVED;
    } else {
      // Normal budget available path → Cost-based decision
      if (cost > 50000) {
        return RequestStatus.CHAIRMAN_APPROVAL;
      }
      return RequestStatus.APPROVED;
    }
  }
  break;
```

### API Route (`app/api/requests/[id]/approve/route.ts`)

```typescript
case 'budget_not_available':
  if (user.role === UserRole.INSTITUTION_MANAGER && requestRecord.status === RequestStatus.MANAGER_REVIEW) {
    nextStatus = RequestStatus.DEAN_REVIEW;
    actionType = ActionType.FORWARD;
    // Mark this request as coming from budget not available path
    if (!updateData.$set) updateData.$set = {};
    updateData.$set.budgetNotAvailable = true;
  }
  break;
```

## Test Scenarios

### Budget Available - High Cost (₹75,000)
- **Flow**: Manager → VP → HOI → Dean → Chief Director → Chairman → APPROVED
- **Reason**: Cost > ₹50,000, so Chief Director sends to Chairman

### Budget Available - Low Cost (₹35,000)  
- **Flow**: Manager → VP → HOI → Dean → Chief Director → APPROVED
- **Reason**: Cost ≤ ₹50,000, so Chief Director approves (stops here)

### Budget Not Available - Any Cost
- **Flow**: Manager → Dean → Chairman → APPROVED  
- **Reason**: Budget not available, so Dean always sends to Chairman regardless of cost

## Summary

✅ **Budget Available**: Normal flow with cost-based decision at Chief Director
- Cost ≤ ₹50,000 → Stop at Chief Director  
- Cost > ₹50,000 → Continue to Chairman

✅ **Budget Not Available**: Special flow bypasses VP/HOI and Chief Director
- Manager → Dean → Chairman (always, regardless of cost)