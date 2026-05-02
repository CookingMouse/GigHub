import { Suspense } from "react";
import { CompanyJobsPage } from "@/components/company-jobs-page";

export default function CompanyActiveJobsRoute() {
  return (
    <Suspense fallback={null}>
      <CompanyJobsPage />
    </Suspense>
  );
}
