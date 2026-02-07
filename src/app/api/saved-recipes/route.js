import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// need to configure this to save snowflake UID as recipeId when we have that working

export async function POST(req) {
  const { appUser } = await getOrCreateUser();
  const { recipeId } = await req.json();

  if (!recipeId || typeof recipeId !== "string") {
    return NextResponse.json({ error: "recipeId required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("saved_recipes")
    .upsert({ user_id: appUser.id, recipe_id: recipeId });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const { appUser } = await getOrCreateUser();

  const { data, error } = await supabaseAdmin
    .from("saved_recipes")
    .select("recipe_id, created_at")
    .eq("user_id", appUser.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ recipes: data });
}
