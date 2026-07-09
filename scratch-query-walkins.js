import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://hwtmkijkzgjmnpdbrnuy.supabase.co";
const supabaseKey = "sb_publishable_dW8cXuASsDr3V-mXgTLHGA_IVvU296Q";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log("=== WALK_INS ALLOWED COLUMNS ===");
    const { data: walkins, error: wErr } = await supabase
      .from("walk_ins")
      .select("id, queue_number, customer_name, status, created_at, served_at")
      .order("created_at", { ascending: false });
    if (wErr) throw wErr;
    console.log(JSON.stringify(walkins, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}

run();
