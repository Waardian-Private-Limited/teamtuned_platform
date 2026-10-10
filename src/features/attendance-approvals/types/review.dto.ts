/** Wire shapes of the regularization review list. */

export interface ReviewRowDto {
  id: number;
  approval_id: number;
  employee: { id: number; name: string; code: string | null; department: string | null; role: string | null };
  date: string;
  status: string;
  waiting_for_me: boolean;
  kinds: string[];
  in_time: string | null;
  out_time: string | null;
  recorded_in_time: string | null;
  recorded_out_time: string | null;
  reason: string | null;
  has_attachment: boolean;
  submitted_at: string | null;
}

export interface ReviewPageDto {
  items: ReviewRowDto[];
  total: number;
  page: number;
  page_size: number;
}
