import { apiGet, apiPatch } from './api'

interface SelectionApplicant {
  applicationId: string
  applicantName: string
  applicantEmail: string
  institutionName: string | null
  status: string
  completedMilestones: number
  totalMilestones: number
  approvedMilestones: number
  score: number | null
  submittedAt: string | null
}

interface SelectionDetail {
  applicationId: string
  applicantName: string
  applicantEmail: string
  institutionName: string | null
  status: string
  score: number | null
  submittedAt: string | null
  milestones: Array<{
    milestoneId: string
    milestoneName: string
    status: string
    completedAt: string | null
    reviewStatus: string | null
  }>
  history: Array<{
    id: string
    fromStatus: string | null
    toStatus: string
    reason: string | null
    changedBy: string | null
    changedAt: string
  }>
}

export const selectionService = {
  async getApplicantsByCall(callId: string): Promise<SelectionApplicant[]> {
    return apiGet(`/selection/call/${callId}/applicants`)
  },

  async setFinalDecision(
    applicationId: string,
    decision: 'SELECTED' | 'NOT_SELECTED',
    reason?: string,
    notes?: string
  ): Promise<void> {
    const payload: Record<string, unknown> = {
      decision,
      ...(reason && { reason }),
      ...(notes && { notes })
    }
    return apiPatch(`/selection/application/${applicationId}/final-decision`, payload)
  },

  async getApplicationDetails(applicationId: string): Promise<SelectionDetail> {
    return apiGet(`/selection/application/${applicationId}/details`)
  }
}
