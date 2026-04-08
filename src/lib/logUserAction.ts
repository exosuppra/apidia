import { supabase } from "@/integrations/supabase/client";

type ActionType =
  | "login"
  | "logout"
  | "view_page"
  | "create_task"
  | "update_task"
  | "delete_task"
  | "validate_task"
  | "reject_task"
  | "import_fiches"
  | "export_data"
  | "verify_fiche"
  | "edit_fiche"
  | "sync_apidae"
  | "linking_check"
  | "linking_send_email"
  | "create_planning"
  | "update_planning"
  | "apidia_knowledge_update"
  | "import_excel"
  | "bulk_verification"
  | "other";

export async function logUserAction(
  actionType: ActionType,
  details?: Record<string, unknown>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase.from("user_action_logs").insert as any)({
      user_id: user.id,
      user_email: user.email || "unknown",
      action_type: actionType,
      action_details: details || null,
      user_agent: navigator.userAgent,
    });
  } catch (e) {
    console.error("Failed to log action:", e);
  }
}
