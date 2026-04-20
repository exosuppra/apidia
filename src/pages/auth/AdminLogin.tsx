import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logUserAction } from "@/lib/logUserAction";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";
import { useAdminInterface, AdminInterface } from "@/hooks/useAdminInterface";
import { ApidiaLogo, Button as RefonteButton, Icon } from "@/pages/refonte/primitives";
import "@/pages/refonte/refonte-tokens.css";

/* ===============================================================
   AdminLogin — page d'entrée branded Pays de Manosque.
   - Card centrée avec radial gradient + faisceau animé
   - Logo PdM + typographie Archivo Black + accroche Caveat
   - Formulaire Supabase Auth intact
   - Sélecteur "Nouvelle / Classique" pour l'interface post-login
   - Responsive (mobile-first friendly)
   =============================================================== */

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [interfaceChoice, setInterfaceChoice] = useAdminInterface();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAdminSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .single();

        if (roles) {
          navigate("/admin/dashboard");
        }
      }
    };
    checkAdminSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .single();

      if (rolesError || !roles) {
        await supabase.auth.signOut();
        throw new Error("Vous n'avez pas les permissions d'administrateur.");
      }

      toast({
        title: "Connexion réussie",
        description: `Bienvenue — interface ${interfaceChoice === "refonte" ? "nouvelle" : "classique"}`,
      });

      logUserAction("login");
      navigate("/admin/dashboard");
    } catch (error: any) {
      let errorMessage = "Identifiants invalides";

      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Email ou mot de passe incorrect";
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage = "Veuillez confirmer votre email";
      } else if (error.message?.includes("User not found")) {
        errorMessage = "Utilisateur introuvable";
      } else if (error.message?.includes("permissions d'administrateur")) {
        errorMessage = error.message;
      }

      toast({
        title: "Erreur de connexion",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Seo title="Connexion Administrateur" description="Accès à l'interface d'administration" />

      <div
        className="refonte-root refonte-login-root"
        data-accent="jaune"
        data-density="comfy"
        data-motion="on"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          position: "relative",
          overflow: "hidden",
          background: "radial-gradient(ellipse at 20% 0%, var(--vert-100) 0%, var(--gris-50) 55%)",
        }}
      >
        {/* Faisceau décor animé */}
        <svg
          viewBox="0 0 1000 900"
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 700,
            height: 560,
            opacity: 0.35,
            pointerEvents: "none",
          }}
          aria-hidden
        >
          {[-32, -22, -12, -2, 8, 18, 28].map((a, i) => (
            <g
              key={i}
              transform={`rotate(${a} 700 700)`}
              style={{ animation: `refonte-faisceau-rays ${3 + i * 0.4}s var(--ease-out) infinite alternate` }}
            >
              <path
                d={`M 680 680 L ${740 + i * 4} ${-50 + i * 8} L 720 700 Z`}
                fill="var(--pdm-jaune)"
                opacity={0.45 - i * 0.04}
              />
            </g>
          ))}
        </svg>

        <div
          className="refonte-login-card"
          style={{
            width: "100%",
            maxWidth: 440,
            background: "var(--surface)",
            borderRadius: 22,
            padding: 36,
            boxShadow: "var(--sh-lg)",
            border: "1px solid var(--border)",
            animation: "refonte-scale-in 420ms var(--ease-spring)",
            zIndex: 1,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
            <span className="refonte-logo-halo">
              <ApidiaLogo size={72} />
            </span>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 26,
                letterSpacing: "-0.02em",
                margin: "20px 0 4px",
                color: "var(--text)",
              }}
            >
              Bienvenue
            </h1>
            <div style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", maxWidth: 320 }}>
              Connectez-vous avec vos identifiants administrateur
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <RefonteField
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="admin@paysdemanosque.com"
              autoComplete="email"
              required
            />
            <RefonteField
              label="Mot de passe"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />

            {/* Sélecteur d'interface */}
            <InterfaceChooser value={interfaceChoice} onChange={setInterfaceChoice} />

            <RefonteButton
              type="submit"
              variant="vert"
              size="lg"
              style={{ marginTop: 6, width: "100%", height: 46 }}
              icon={isLoading ? undefined : "check"}
              disabled={isLoading}
            >
              {isLoading ? "Connexion en cours…" : "Se connecter"}
            </RefonteButton>
          </form>

          <div
            style={{
              textAlign: "center",
              marginTop: 20,
              fontFamily: "var(--font-script)",
              fontSize: 22,
              color: "var(--pdm-vert)",
            }}
          >
            Destination Pays de Manosque
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 18,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 10,
            color: "var(--text-3)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Apidia · Back-office touristique
        </div>
      </div>
    </>
  );
}

/* ---------- Refonte Field (input styled PdM) ---------- */

interface RefonteFieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}

function RefonteField({ label, type = "text", value, onChange, placeholder, autoComplete, required }: RefonteFieldProps) {
  return (
    <div>
      <label
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "var(--text-3)",
          textTransform: "uppercase",
          letterSpacing: "0.09em",
          display: "block",
          marginBottom: 5,
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        style={{
          width: "100%",
          height: 44,
          padding: "0 14px",
          border: "1px solid var(--border-strong)",
          borderRadius: 10,
          background: "var(--surface)",
          fontSize: 14,
          fontFamily: "inherit",
          color: "var(--text)",
          transition: "border-color var(--dur-fast), box-shadow var(--dur-fast)",
          outline: "none",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--pdm-vert)";
          e.target.style.boxShadow = "0 0 0 3px rgba(162,199,67,0.18)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "var(--border-strong)";
          e.target.style.boxShadow = "none";
        }}
      />
    </div>
  );
}

/* ---------- Interface chooser (styled PdM) ---------- */

interface InterfaceChooserProps {
  value: AdminInterface;
  onChange: (v: AdminInterface) => void;
}

function InterfaceChooser({ value, onChange }: InterfaceChooserProps) {
  const options: { k: AdminInterface; title: string; desc: string; badge?: string; icon: "sparkles" | "grid" }[] = [
    {
      k: "refonte",
      title: "Nouvelle interface",
      desc: "Charte PdM · layouts éditoriaux",
      badge: "Bêta",
      icon: "sparkles",
    },
    {
      k: "classic",
      title: "Interface classique",
      desc: "Version précédente",
      icon: "grid",
    },
  ];
  return (
    <div style={{ marginTop: 4 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "var(--text-3)",
          textTransform: "uppercase",
          letterSpacing: "0.09em",
          marginBottom: 6,
        }}
      >
        Interface après connexion
      </div>
      <div className="refonte-login-chooser-grid">
        {options.map((o) => {
          const active = value === o.k;
          return (
            <button
              key={o.k}
              type="button"
              onClick={() => onChange(o.k)}
              style={{
                position: "relative",
                textAlign: "left",
                borderRadius: 12,
                border: "1px solid " + (active ? "var(--pdm-vert)" : "var(--border-strong)"),
                padding: "10px 12px",
                background: active ? "var(--vert-50)" : "var(--surface)",
                boxShadow: active ? "0 0 0 3px rgba(162,199,67,0.18)" : "none",
                cursor: "pointer",
                transition: "all var(--dur-fast)",
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              {o.badge && active && (
                <span
                  style={{
                    position: "absolute",
                    top: -8,
                    right: 10,
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    background: "var(--pdm-jaune)",
                    color: "var(--gris-900)",
                    padding: "2px 7px",
                    borderRadius: 999,
                  }}
                >
                  {o.badge}
                </span>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    background: active ? "var(--pdm-vert)" : "var(--surface-2)",
                    color: active ? "white" : "var(--text-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all var(--dur-fast)",
                    flexShrink: 0,
                  }}
                >
                  <Icon name={o.icon} size={12} />
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{o.title}</span>
              </div>
              <span style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.3 }}>{o.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
