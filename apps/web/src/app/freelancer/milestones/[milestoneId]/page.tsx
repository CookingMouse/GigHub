import { FreelancerMilestoneDetailPage } from "@/components/freelancer-milestone-detail-page";

type MilestoneDetailPageProps = {
  params: Promise<{
    milestoneId: string;
  }>;
};

export default async function MilestoneDetailPage({ params }: MilestoneDetailPageProps) {
  const { milestoneId } = await params;

  return <FreelancerMilestoneDetailPage milestoneId={milestoneId} />;
}
