import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../supabase/types";

export interface ProfileData {
  fullName: string;
  email: string;
  role: string;
  coachName: string | null;
  memberSince: string;
  statementsCount: number;
  transactionsCount: number;
  pendingHomework: number;
  loadError: string | null;
}

export async function getProfileData(
  supabase: SupabaseClient<Database>,
  userId: string,
  userEmail: string,
): Promise<ProfileData> {
  const [profileResult, statementsResult, transactionsResult, homeworkResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, role, coach_id, created_at")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("statements")
        .select("id", { count: "exact", head: true })
        .eq("client_id", userId),
      supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("client_id", userId),
      supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("client_id", userId)
        .eq("needs_homework", true),
    ]);

  if (profileResult.error) {
    return {
      fullName: userEmail,
      email: userEmail,
      role: "client",
      coachName: null,
      memberSince: new Date().toISOString(),
      statementsCount: 0,
      transactionsCount: 0,
      pendingHomework: 0,
      loadError: "Unable to load profile data. Please try again later.",
    };
  }

  const profile = profileResult.data;
  const fullName = profile?.full_name?.trim() || userEmail;
  const role = profile?.role || "client";
  const memberSince = profile?.created_at || new Date().toISOString();

  // If the user has a coach, fetch the coach's name
  let coachName: string | null = null;
  if (profile?.coach_id) {
    const { data: coachData } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", profile.coach_id)
      .maybeSingle();
    coachName = coachData?.full_name?.trim() || null;
  }

  return {
    fullName,
    email: userEmail,
    role,
    coachName,
    memberSince,
    statementsCount: statementsResult.count ?? 0,
    transactionsCount: transactionsResult.count ?? 0,
    pendingHomework: homeworkResult.count ?? 0,
    loadError: null,
  };
}
