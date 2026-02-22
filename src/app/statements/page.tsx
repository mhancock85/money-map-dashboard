import { redirect } from "next/navigation";
import { StatementsClient } from "@/components/dashboard/StatementsClient";
import { getStatementsData } from "@/lib/dashboard/statements-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function StatementsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const data = await getStatementsData(supabase, user.id);

  return <StatementsClient userId={user.id} {...data} />;
}
