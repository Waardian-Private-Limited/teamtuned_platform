"use client";

import { useParams } from "next/navigation";
import { ReviewDetailPage } from "@/features/recruitment/reviews/components/ReviewDetailPage";

export default function EmployeeReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const reviewId = Number(id);
  return <ReviewDetailPage key={reviewId} reviewId={reviewId} />;
}
