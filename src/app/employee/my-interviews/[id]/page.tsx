"use client";

import { useParams } from "next/navigation";
import { InterviewDetailPage } from "@/features/recruitment/interviews/components/interview-detail/InterviewDetailPage";

// Every employee: the API returns the interview only to its panelists and recruitment readers.
export default function EmployeeInterviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const interviewId = Number(id);
  return <InterviewDetailPage key={interviewId} interviewId={interviewId} backHref="/employee/my-interviews" />;
}
