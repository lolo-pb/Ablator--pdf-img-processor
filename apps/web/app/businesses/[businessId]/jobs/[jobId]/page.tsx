import { redirect } from "next/navigation";

export default async function JobPageRedirect({
  params,
}: {
  params: Promise<{ businessId: string; jobId: string }>;
}) {
  const { businessId, jobId } = await params;
  redirect(`/businesses/${businessId}/jobs/${jobId}/review`);
}
