import { auth0 } from "@/lib/auth0";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function getOrCreateUser() {
  const session = await auth0.getSession();
  if (!session?.user?.sub) throw new Error("Unauthorized");

  const u = session.user;

  // Upsert by auth0_sub
  const { data, error } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        auth0_sub: u.sub,
        email: u.email ?? null,
        name: u.name ?? null,
        avatar_url: u.picture ?? null,
        last_login_at: new Date().toISOString(),
      },
      { onConflict: "auth0_sub" }
    )
    .select("id, auth0_sub, email, name")
    .single();

  if (error) throw error;
  return { appUser: data, auth0User: u };
}
