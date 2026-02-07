import { auth0 } from "@/lib/auth0";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST() {
  const session = await auth0.getSession();
  const u = session?.user;

  if (!u?.sub) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = {
    auth0_sub: u.sub,
    email: u.email || null,
    name: u.name || null,
    avatar_url: u.picture || null,
    last_login_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("users")
    .upsert(payload, { onConflict: "auth0_sub" })
    .select("id, auth0_sub, email, name, avatar_url")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ user: data }, { status: 200 });
}
