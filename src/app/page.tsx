import { redirect } from "next/navigation";
import { OverviewClient } from "@/components/dashboard/OverviewClient";
import { getOverviewMetrics } from "@/lib/dashboard/overview-metrics";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const metrics = await getOverviewMetrics(supabase, user.id);

  return <OverviewClient {...metrics} />;
}
