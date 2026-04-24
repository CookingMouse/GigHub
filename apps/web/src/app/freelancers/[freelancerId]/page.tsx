import { FreelancerPublicPage } from "@/components/freelancer-public-page";

type FreelancerPublicRouteProps = {
  params: Promise<{
    freelancerId: string;
  }>;
};

export default async function FreelancerPublicRoute({ params }: FreelancerPublicRouteProps) {
  const { freelancerId } = await params;
  return <FreelancerPublicPage freelancerId={freelancerId} />;
}
