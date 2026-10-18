import type { EarlierRoundDto, SharedTestDto } from '../../interviews/types/interviews.dto';

// Offer reviews (backend RECRUITMENT_DESIGN.md §11.1).

export type ReviewDecision = 'offer' | 'reject' | 'hold';

export interface ReviewDto {
  id: number;
  applicationId: number;
  channel: 'system' | 'offline';
  reviewer: { employeeId: number | null; name: string | null; designation: string | null };
  message: string | null;
  status: 'pending' | 'decided' | 'cancelled';
  decision: ReviewDecision | null;
  note: string | null;
  suggestedCtc: number | null;
  suggestedJoiningDate: string | null;
  decidedAt: string | null;
  requestedBy: string | null;
  createdAt: string;
  /** A decision another reviewer made that this reviewer may not see yet. */
  hidden?: boolean;
}

export interface MyReviewDto extends ReviewDto {
  candidateName: string;
  positionTitle: string;
  applicationStage: string;
  applicationStatus: string;
}

export interface DossierDto {
  review: ReviewDto;
  application: { id: number; stage: string; status: string; appliedAt: string | null; source: string };
  position: { id: number; title: string };
  candidate: {
    id: number; name: string; email: string | null; phone: string | null; city: string | null;
    currentTitle: string | null; currentCompany: string | null; totalExperience: number | null; noticePeriodDays: number | null;
    currentCtc: number | null; expectedCtc: number | null; linkedinUrl: string | null; portfolioUrl: string | null;
    hasResume: boolean; resumeName: string | null; resumeType: 'pdf' | 'word' | null;
  };
  tests: Array<SharedTestDto & { risk: 'low' | 'medium' | 'high' | null }>;
  interviews: EarlierRoundDto[];
  notes: Array<{ text: string; by: string | null; at: string | null }>;
  reviews: ReviewDto[];
  canDecide: boolean;
  privileged: boolean;
}

export const DECISION_LABEL: Record<ReviewDecision, string> = { offer: 'Make an offer', reject: 'Do not hire', hold: 'Hold' };
