import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const USER_TABLES = [
  "habit_logs",
  "app_settings",
  "budget_items",
  "day_plans",
  "diary_entries",
  "goals",
  "gratitude_entries",
  "habits",
  "inbox_items",
  "journal_entries",
  "meal_library",
  "meals",
  "moods",
  "notes",
  "pantry_items",
  "recipes",
  "reminders",
  "saved_quotes",
  "shopping_list",
  "water_intake",
];

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Not signed in." }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Not signed in." }, 401);
    const userId = userData.user.id;

    for (const table of USER_TABLES) {
      const { error } = await admin.from(table).delete().eq("user_id", userId);
      if (error) throw new Error(`Could not delete ${table}: ${error.message}`);
    }

    const { error: profileError } = await admin.from("profiles").delete().eq("id", userId);
    if (profileError) throw new Error(`Could not delete profile: ${profileError.message}`);

    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError) throw new Error(`Could not delete sign-in account: ${authError.message}`);

    return json({ ok: true }, 200);
  } catch (error) {
    console.error("delete-account failed", error);
    return json({ error: "Account deletion failed. Please try again." }, 500);
  }
});
