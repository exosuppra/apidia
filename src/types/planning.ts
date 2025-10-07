export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
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
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}
