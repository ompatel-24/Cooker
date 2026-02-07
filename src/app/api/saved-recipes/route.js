import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// need to configure this to save snowflake UID as recipeId when we have that working

export async function POST(req) {
  const { appUser } = await getOrCreateUser();
  const { title, ingredients, directions } = await req.json();

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const normalizedIngredients =
    Array.isArray(ingredients) && ingredients.length
      ? ingredients.map((i) => String(i).trim()).filter(Boolean)
      : [];

  const normalizedDirections =
    Array.isArray(directions) && directions.length
      ? directions.map((d) => String(d).trim()).filter(Boolean)
      : [];

  const { error } = await supabaseAdmin
    .from("saved_recipes")
    .upsert({
      user_id: appUser.id,
      title,
      ingredients: normalizedIngredients,
      directions: normalizedDirections,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    recipe: { title, ingredients: normalizedIngredients, directions: normalizedDirections },
  });
}

export async function GET() {
  const { appUser } = await getOrCreateUser();

  const { data, error } = await supabaseAdmin
    .from("saved_recipes")
    .select("title, ingredients, directions, created_at")
    .eq("user_id", appUser.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ recipes: data });
}

export async function DELETE(req) {
  const { appUser } = await getOrCreateUser();
  const { title } = await req.json();

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("saved_recipes")
    .delete()
    .eq("user_id", appUser.id)
    .eq("title", title);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
