export const PROSPECT_STAGE_ID = 16;

// Worked/unconverted stages that move to Prospect (16) when reassigned/transferred for conversion
const WORKED_UNCONVERTED_STAGES = new Set([2, 3, 4, 5, 7, 10, 11, 14]);
// Stages whose progress/terminal state must never be overwritten by a transfer
const PROTECTED_STAGES = new Set([6, 8, 9, 12, 13]);

export interface TransferResolution {
  nextStatus: number;
  movedToProspect: boolean;
  reactivated: boolean;
}

/**
 * Determines whether a lead assignment/transfer should move the lead to Prospect (16).
 * - First-time Fresh Lead (0/1) assignments (Admin -> Manager or Manager -> Consultant) stay Fresh Lead (1).
 * - Protected stages (6, 8, 9, 12, 13) are never overwritten.
 * - Worked/unconverted stages (2, 3, 4, 5, 7, 10, 11, 14) or Consultant-to-Consultant transfers move to Prospect (16).
 * - Inactive / Not Interested (4) leads moved to Prospect are automatically reactivated (isActive: true).
 */
export function resolveTransferStage(params: {
  currentStatus: number;
  oldConsultantId: number | null;
  newConsultantId: number | null;
  hasAnyNewAssignee: boolean;
}): TransferResolution {
  const { currentStatus, oldConsultantId, newConsultantId, hasAnyNewAssignee } = params;

  if (PROTECTED_STAGES.has(currentStatus)) {
    return { nextStatus: currentStatus, movedToProspect: false, reactivated: false };
  }

  const isConsultantTransfer =
    oldConsultantId !== null &&
    newConsultantId !== null &&
    newConsultantId !== oldConsultantId;

  const isWorkedStageAssignment =
    WORKED_UNCONVERTED_STAGES.has(currentStatus) &&
    (newConsultantId !== null || hasAnyNewAssignee);

  if (isConsultantTransfer || isWorkedStageAssignment) {
    return {
      nextStatus: PROSPECT_STAGE_ID,
      movedToProspect: currentStatus !== PROSPECT_STAGE_ID,
      reactivated: currentStatus === 4,
    };
  }

  // Standard auto-promotion from Uninitiated (0) to Fresh Lead (1)
  if (currentStatus === 0 && hasAnyNewAssignee) {
    return { nextStatus: 1, movedToProspect: false, reactivated: false };
  }

  return { nextStatus: currentStatus, movedToProspect: false, reactivated: false };
}
