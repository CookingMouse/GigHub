import { CompanyPublicPage } from "@/components/company-public-page";

type CompanyPublicRouteProps = {
  params: Promise<{
    companyId: string;
  }>;
};

export default async function CompanyPublicRoute({ params }: CompanyPublicRouteProps) {
  const { companyId } = await params;
  return <CompanyPublicPage companyId={companyId} />;
}
