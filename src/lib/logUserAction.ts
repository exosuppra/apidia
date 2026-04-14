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
  | "sync_sheets"
  | "linking_check"
  | "linking_send_email"
  | "linking_import"
  | "linking_add_site"
  | "linking_edit_site"
  | "linking_delete_site"
  | "create_planning"
  | "update_planning"
  | "apidia_knowledge_update"
  | "apidia_knowledge_add"
  | "apidia_knowledge_delete"
  | "import_excel"
  | "bulk_verification"
  | "toggle_publish_fiche"
  | "transfer_fiche"
  | "create_user"
  | "delete_user"
  | "update_permissions"
  | "reset_password"
  | "telegram_poll"
  | "telegram_send"
  | "widget_create"
  | "widget_delete"
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
