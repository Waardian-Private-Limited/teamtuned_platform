"use client";

import { MyReviewsPage } from "@/features/recruitment/reviews/components/MyReviewsPage";

// Every employee: reviewers see the candidates HR asked them to review; the API returns only their own.
export default function EmployeeMyReviewsPage() {
  return <MyReviewsPage />;
}
