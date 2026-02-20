import { redirect } from "next/navigation";
import { SettingsClient } from "@/components/dashboard/SettingsClient";
import { getProfileData } from "@/lib/dashboard/settings-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const profileData = await getProfileData(
    supabase,
    user.id,
    user.email ?? "unknown"
  );

  return <SettingsClient {...profileData} />;
}
