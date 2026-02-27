export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface EditorialPlanning {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high" | null;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string;
  planning_id: string | null;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  attachments?: TaskAttachment[];
  validation_status?: "pending" | "validated" | "rejected" | null;
  validation_comment?: string | null;
  validation_requested_at?: string | null;
  validation_responded_at?: string | null;
  validation_target?: "laura" | "marie" | null;
}
