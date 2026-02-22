import { redirect } from "next/navigation";
import { HomeworkClient } from "@/components/dashboard/HomeworkClient";
import { getHomeworkTransactions } from "@/lib/dashboard/homework-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function HomeworkPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { transactions, loadError } = await getHomeworkTransactions(supabase, user.id);

  return <HomeworkClient initialTransactions={transactions} loadError={loadError} />;
}
