import { redirect } from "next/navigation";
import { IntelligenceClient } from "@/components/dashboard/IntelligenceClient";
import { getIntelligenceData } from "@/lib/dashboard/intelligence-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function IntelligencePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const data = await getIntelligenceData(supabase, user.id);

  return <IntelligenceClient {...data} />;
}
