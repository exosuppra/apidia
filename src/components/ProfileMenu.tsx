import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/pages/refonte/primitives";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, KeyRound, Settings, LogOut } from "lucide-react";

interface ProfileMenuProps {
  profile: { name: string; email: string; initials: string; role: string };
}

export default function ProfileMenu({ profile }: ProfileMenuProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    try {
      localStorage.removeItem("gsheet_session");
    } catch {}
    navigate("/admin/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginLeft: 4,
            padding: "0 10px 0 4px",
            borderRadius: 20,
            background: "var(--surface-2)",
            border: "none",
            cursor: "pointer",
            height: 38,
          }}
        >
          <Avatar initials={profile.initials} size={30} color="vert" />
          <div style={{ fontSize: 12, textAlign: "left" }}>
            <div style={{ fontWeight: 600 }}>{profile.name}</div>
            <div style={{ color: "var(--text-3)", fontSize: 10 }}>{profile.role}</div>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{profile.name}</p>
            {profile.email && (
              <p className="text-xs leading-none text-muted-foreground truncate">{profile.email}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/admin/profile")}>
          <User className="mr-2 h-4 w-4" />
          <span>Mon profil</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/auth/change-password")}>
          <KeyRound className="mr-2 h-4 w-4" />
          <span>Changer mon mot de passe</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/admin/profile?tab=preferences")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Préférences</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Déconnexion</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
