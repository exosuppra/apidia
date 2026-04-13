import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Plus, Shield, Eye, FileText, Calendar, KeyRound, ArrowLeft, Clock, History, Globe, BarChart3, Star, Briefcase, Loader2, TreePine, Link, Bot, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import Seo from "@/components/Seo";
import { logUserAction } from "@/lib/logUserAction";

interface AdminUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  permissions: string[];
}

const AVAILABLE_PAGES = [
  { key: "users", label: "Gestion des utilisateurs", icon: Shield },
  { key: "fiches", label: "Toutes les fiches", icon: Eye },
  { key: "requests", label: "Demandes utilisateurs", icon: FileText },
  { key: "logs", label: "Historique des actions", icon: History },
  { key: "planning", label: "Planning éditorial", icon: Calendar },
  { key: "rh", label: "Suivi RH - Projets IA", icon: Clock },
  { key: "missions", label: "Ordres de Mission", icon: Briefcase },
  { key: "intense-verdon", label: "Intense Verdon Edito", icon: Globe },
  { key: "stats-web", label: "Statistiques Web", icon: BarChart3 },
  { key: "stats-ereputation", label: "E-réputation Google", icon: Star },
  { key: "planning-santons", label: "Planning Foire aux Santons", icon: TreePine },
  { key: "linking", label: "Linking", icon: Link },
  { key: "apidia", label: "Apidia - Agent d'accueil", icon: Bot },
  { key: "telegram-oto", label: "OTO - Chatbot Telegram", icon: MessageCircle },
];

export default function UsersManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserFirstName, setNewUserFirstName] = useState("");
  const [newUserLastName, setNewUserLastName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchAdminUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-admin-users');

      if (error) throw error;

      setUsers(data.users || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger les utilisateurs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast({
        title: "Erreur",
        description: "Email et mot de passe requis",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-admin', {
        body: { 
          email: newUserEmail, 
          password: newUserPassword,
          firstName: newUserFirstName,
          lastName: newUserLastName,
          permissions: selectedPermissions
        }
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Utilisateur créé avec succès",
      });
      logUserAction("create_user", { email: newUserEmail });

      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserFirstName("");
      setNewUserLastName("");
      setSelectedPermissions([]);
      setIsCreateDialogOpen(false);
      fetchAdminUsers();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'utilisateur",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${email} ?`)) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('delete-admin', {
        body: { userId }
      });
      
      if (error) throw error;

      toast({
        title: "Succès",
        description: "Utilisateur supprimé",
      });
      logUserAction("delete_user", { email });

      fetchAdminUsers();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'utilisateur",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async (userId: string, email: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir réinitialiser le mot de passe de ${email} ?`)) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('reset-admin-password', {
        body: { userId }
      });
      
      if (error) throw error;

      toast({
        title: "Mot de passe réinitialisé",
        description: `Nouveau mot de passe temporaire : ${data.temporaryPassword}`,
        duration: 10000,
      });
      logUserAction("reset_password", { email });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de réinitialiser le mot de passe",
        variant: "destructive",
      });
    }
  };

  const handleTogglePermission = async (userId: string, pageKey: string, hasPermission: boolean) => {
    try {
      if (hasPermission) {
        // Remove permission
        const { error } = await supabase
          .from('admin_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('page_key', pageKey);

        if (error) throw error;
      } else {
        // Add permission
        const { error } = await supabase
          .from('admin_permissions')
          .insert({ user_id: userId, page_key: pageKey });

        if (error) throw error;
      }

      fetchAdminUsers();
      
      toast({
        title: "Succès",
        description: "Permission mise à jour",
      });
      logUserAction("update_permissions", { user_id: userId, page_key: pageKey, added: !hasPermission });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier la permission",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-sm text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  return (
    <>
      <Seo title="Gestion des utilisateurs" description="Gérer les utilisateurs administrateurs" />
      
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/dashboard')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Gestion des utilisateurs</h1>
                <p className="text-muted-foreground">Gérer les comptes administrateurs et leurs permissions</p>
              </div>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvel utilisateur
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un utilisateur administrateur</DialogTitle>
                  <DialogDescription>
                    Créez un nouveau compte avec ses permissions
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={newUserFirstName}
                      onChange={(e) => setNewUserFirstName(e.target.value)}
                      placeholder="Jean"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={newUserLastName}
                      onChange={(e) => setNewUserLastName(e.target.value)}
                      placeholder="Dupont"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="admin@example.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Permissions</Label>
                    <div className="space-y-2">
                      {AVAILABLE_PAGES.map((page) => (
                        <div key={page.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`perm-${page.key}`}
                            checked={selectedPermissions.includes(page.key)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedPermissions([...selectedPermissions, page.key]);
                              } else {
                                setSelectedPermissions(selectedPermissions.filter(p => p !== page.key));
                              }
                            }}
                          />
                          <Label htmlFor={`perm-${page.key}`} className="cursor-pointer">
                            {page.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Button onClick={handleCreateUser} className="w-full" disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Création en cours...
                      </>
                    ) : (
                      "Créer l'utilisateur"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {users.map((user) => (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        {user.first_name || user.last_name 
                          ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                          : user.email}
                      </CardTitle>
                      <CardDescription>
                        {user.first_name || user.last_name ? user.email : ''} • Créé le {new Date(user.created_at).toLocaleDateString('fr-FR')}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetPassword(user.id, user.email)}
                      >
                        <KeyRound className="w-4 h-4 mr-2" />
                        Réinitialiser mot de passe
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id, user.email)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Permissions d'accès :</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {AVAILABLE_PAGES.map((page) => {
                        const hasPermission = user.permissions.includes(page.key);
                        const Icon = page.icon;
                        
                        return (
                          <div
                            key={page.key}
                            className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-accent"
                            onClick={() => handleTogglePermission(user.id, page.key, hasPermission)}
                          >
                            <Checkbox checked={hasPermission} />
                            <Icon className="w-4 h-4" />
                            <span className="text-sm">{page.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
