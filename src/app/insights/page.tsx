import { redirect } from "next/navigation";
import { InsightsClient } from "@/components/dashboard/InsightsClient";
import { getInsightsData } from "@/lib/dashboard/insights-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function InsightsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const data = await getInsightsData(supabase, user.id);

  return <InsightsClient {...data} />;
}
