import React, { useState, ReactNode } from "react";
import { Icon, ApidiaLogo, Avatar, Chip, Button, AnimatedNumber, HBarChart, AreaChart, ImgPlaceholder, IconName } from "./primitives";
import {
  USER, HUB, ACTIVITY, STATS_SITES, STATS_GLOBAL, EVOLUTION,
  FICHES, FICHES_KPI, SYNC, MISSIONS, MISSIONS_KPI,
  Fiche, Mission,
} from "./data";

/* =============================================================
   V1 · ÉDITORIAL INSTITUTIONNEL
   Typo éditoriale, beaucoup d'air, vert PdM dominant,
   faisceau jaune signature. Fidèle à Apidia.
   ============================================================= */

export type Screen = "login" | "home" | "fiches" | "detail" | "stats" | "missions";

/* ---------- Top bar ---------- */
interface V1TopBarProps {
  screen: Screen;
  onNav: (s: Screen) => void;
  onReorg: () => void;
}

function V1TopBar({ screen, onNav, onReorg }: V1TopBarProps) {
  const showBack = screen !== "home";
  const titles: Record<string, { t: string; s: string }> = {
    home:     { t: "Administration", s: `Connecté en tant que ${USER.email}` },
    fiches:   { t: "Gestion des fiches", s: "6 134 fiches · 5 671 publiées · 3 196 alertes" },
    stats:    { t: "Statistiques Web", s: "Analyse des performances des 8 sites du réseau" },
    missions: { t: "Ordres de Mission", s: "Suivi des déplacements et frais de l'équipe" },
    detail:   { t: "Édition de fiche", s: "Mise à jour éditoriale" },
  };
  const info = titles[screen] || titles.home;
  return (
    <header style={{
      padding: "24px 44px 18px",
      display: "flex", alignItems: "center", gap: 16,
      borderBottom: "1px solid var(--border)",
      background: "var(--surface)",
      position: "sticky", top: 0, zIndex: 30,
    }}>
      {showBack ? (
        <button onClick={() => onNav("home")} style={{
          width: 38, height: 38, borderRadius: 10, background: "var(--surface-2)",
          border: "1px solid var(--border)", color: "var(--text-2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all var(--dur-fast)",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "var(--gris-150)")}
        onMouseLeave={e => (e.currentTarget.style.background = "var(--surface-2)")}
        ><Icon name="arrow-left" size={15}/></button>
      ) : (
        <ApidiaLogo size={48}/>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, letterSpacing: "-0.025em", margin: 0, lineHeight: 1.1 }}>
          {info.t}
        </h1>
        <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>{info.s}</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {screen === "home" && <Button variant="outline" size="md" icon="drag" onClick={onReorg}>Réorganiser</Button>}
        <button style={{
          width: 38, height: 38, borderRadius: 10, border: "1px solid var(--border)",
          background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center",
        }}><Icon name="palette" size={15}/></button>
        <button style={{
          width: 38, height: 38, borderRadius: 10, border: "1px solid var(--border)",
          background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
        }}>
          <Icon name="bell" size={15}/>
          <span style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: 4, background: "var(--pdm-jaune)", border: "1.5px solid var(--surface)" }}/>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4, padding: "0 10px 0 4px", borderRadius: 20, background: "var(--surface-2)" }}>
          <Avatar initials={USER.initials} size={30} color="vert"/>
          <div style={{ fontSize: 12 }}>
            <div style={{ fontWeight: 600 }}>{USER.name}</div>
            <div style={{ color: "var(--text-3)", fontSize: 10 }}>{USER.role}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ---------- V1 Login ---------- */
interface LoginProps { onLogin: () => void; }

export function V1Login({ onLogin }: LoginProps) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, position: "relative", overflow: "hidden",
      background: "radial-gradient(ellipse at 20% 0%, var(--vert-100) 0%, var(--gris-50) 55%)",
    }}>
      <svg viewBox="0 0 1000 900" style={{ position: "absolute", top: -80, right: -80, width: 700, height: 560, opacity: 0.35, pointerEvents: "none" }}>
        {[-32, -22, -12, -2, 8, 18, 28].map((a, i) => (
          <g key={i} transform={`rotate(${a} 700 700)`} style={{ animation: `refonte-faisceau-rays ${3 + i * 0.4}s var(--ease-out) infinite alternate` }}>
            <path d={`M 680 680 L ${740 + i * 4} ${-50 + i * 8} L 720 700 Z`} fill="var(--pdm-jaune)" opacity={0.45 - i * 0.04}/>
          </g>
        ))}
      </svg>

      <div style={{
        width: 420, background: "var(--surface)", borderRadius: 22, padding: 36,
        boxShadow: "var(--sh-lg)", border: "1px solid var(--border)",
        animation: "refonte-scale-in 420ms var(--ease-spring)", zIndex: 1,
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
          <ApidiaLogo size={72}/>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, letterSpacing: "-0.02em", margin: "20px 0 4px" }}>Bienvenue</h1>
          <div style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center" }}>
            Connectez-vous avec vos identifiants administrateur
          </div>
        </div>
        <form onSubmit={e => { e.preventDefault(); onLogin(); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <V1Field label="Email" defaultValue="q.duroy@paysdemanosque.com" type="email"/>
          <V1Field label="Mot de passe" defaultValue="••••••••••" type="password"/>
          <Button variant="vert" size="lg" style={{ marginTop: 6, width: "100%", height: 46 }} icon="check">Se connecter</Button>
        </form>
        <div style={{ textAlign: "center", marginTop: 20, fontFamily: "var(--font-script)", fontSize: 22, color: "var(--pdm-vert)" }}>
          Destination Pays de Manosque
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 18, left: 0, right: 0, textAlign: "center", fontSize: 10, color: "var(--text-3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
        Apidia · Back-office touristique
      </div>
    </div>
  );
}

interface V1FieldProps {
  label: string;
  defaultValue?: string;
  type?: string;
  mono?: boolean;
  full?: boolean;
}

function V1Field({ label, defaultValue, type = "text", mono, full }: V1FieldProps) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : "auto" }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.09em", display: "block", marginBottom: 5 }}>{label}</label>
      <input
        type={type}
        defaultValue={defaultValue}
        style={{
          width: "100%", height: 42, padding: "0 14px",
          border: "1px solid var(--border-strong)", borderRadius: 10,
          background: "var(--surface)", fontSize: 13,
          fontFamily: mono ? "var(--font-mono)" : "inherit",
          transition: "border-color var(--dur-fast)",
        }}
        onFocus={e => (e.target.style.borderColor = "var(--pdm-vert)")}
        onBlur={e => (e.target.style.borderColor = "var(--border-strong)")}
      />
    </div>
  );
}

/* ---------- V1 Home (hub admin) ---------- */
interface HomeProps { onNav: (s: Screen) => void; }

export function V1Home({ onNav }: HomeProps) {
  return (
    <div style={{ animation: "refonte-fade-in 400ms var(--ease-out)" }}>
      {/* Hero éditorial */}
      <div style={{ padding: "28px 44px 24px", background: "var(--surface)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--pdm-vert)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
          ★ Tableau de bord administrateur
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 38, letterSpacing: "-0.03em", margin: 0, lineHeight: 1.05, maxWidth: 900 }}>
          Bonjour {USER.name.split(" ")[0]}. <span style={{ color: "var(--text-3)" }}>Voici votre</span>
          <br/>espace de pilotage <span style={{ color: "var(--pdm-vert)" }}>Apidia</span>.
        </h2>
        <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 12, maxWidth: 680 }}>
          <b>{FICHES_KPI.apidae.toLocaleString("fr").replace(/,/g, " ")}</b> fiches APIDAE référencées ·{" "}
          <b>{FICHES_KPI.apidia.toLocaleString("fr").replace(/,/g, " ")}</b> publiées sur Apidia ·
          <b style={{ color: "#8a6b00" }}> {FICHES_KPI.alerts.toLocaleString("fr").replace(/,/g, " ")} alertes</b> en attente de validation.
        </div>
      </div>

      {/* Bandeau OTO / IA */}
      <div style={{
        padding: "14px 44px", display: "flex", alignItems: "center", gap: 14,
        background: "linear-gradient(90deg, var(--vert-100) 0%, var(--vert-50) 50%, var(--gris-50) 100%)",
        borderBottom: "1px solid var(--vert-200)",
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 18, background: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--sh-sm)" }}>
          <Icon name="sparkles" size={18} style={{ color: "var(--pdm-jaune)" }}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            <b>ApidIA</b> — l'agent IA vient de synchroniser{" "}
            <b style={{ color: "var(--vert-700)" }}>12 fiches APIDAE → Apidia</b> et a préparé{" "}
            <b style={{ color: "var(--vert-700)" }}>3 suggestions</b>.
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>Dernière activité · il y a 18 min</div>
        </div>
        <Button variant="vert" size="md" iconRight="chevron">Voir les suggestions</Button>
      </div>

      {/* Rubriques */}
      <div style={{ padding: "36px 44px 24px", maxWidth: 1400, margin: "0 auto" }}>
        {HUB.map((section, si) => (
          <section key={section.group} style={{ marginBottom: 42, animation: `refonte-fade-in 500ms ${si * 80}ms var(--ease-out) both` }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 18 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: "var(--gris-800)", color: "var(--pdm-vert)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}><Icon name={section.icon as IconName} size={15}/></div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, letterSpacing: "-0.015em", margin: 0, color: "var(--pdm-vert)" }}>{section.group}</h2>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
              <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{section.items.length} modules</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {section.items.map((item, i) => (
                <V1HubCard key={item.id} item={item} delay={si * 80 + i * 40}
                  onClick={() => {
                    if (item.id === "fiches") onNav("fiches");
                    else if (item.id === "stats") onNav("stats");
                    else if (item.id === "missions") onNav("missions");
                  }}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Activité */}
        <section>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 16 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--gris-800)", color: "var(--pdm-vert)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="history" size={15}/>
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, letterSpacing: "-0.015em", margin: 0, color: "var(--pdm-vert)" }}>Activité récente</h2>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
            <button style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 600 }}>Tout afficher →</button>
          </div>
          <div style={{ background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
            {ACTIVITY.slice(0, 6).map((a, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 18px", borderBottom: i < 5 ? "1px solid var(--border)" : "none",
                animation: `refonte-slide-in-right 400ms ${i * 50}ms var(--ease-out) both`,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: "var(--pdm-vert)", flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                  <b>{a.who.split("@")[0].replace(/^[a-z]\./, m => m.toUpperCase())}</b>
                  <span style={{ color: "var(--text-3)" }}> {a.what}</span>
                  {a.target && <b style={{ color: "var(--pdm-vert)" }}> {a.target}</b>}
                  {a.meta && <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{a.meta}</div>}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>{a.t}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

interface HubCardProps {
  item: { id: string; icon: string; title: string; desc: string; cta: string; badge: string | null };
  delay: number;
  onClick: () => void;
}

function V1HubCard({ item, delay, onClick }: HubCardProps) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
      background: "var(--surface)", border: "1px solid " + (hover ? "var(--pdm-vert)" : "var(--border)"),
      borderRadius: 14, padding: 20, textAlign: "left", cursor: "pointer",
      transition: "all var(--dur-med) var(--ease-out)",
      transform: hover ? "translateY(-3px)" : "none",
      boxShadow: hover ? "var(--sh-md)" : "var(--sh-xs)",
      animation: `refonte-fade-in 500ms ${delay}ms var(--ease-out) both`,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: hover ? "var(--pdm-vert)" : "var(--vert-100)",
          color: hover ? "white" : "var(--vert-700)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all var(--dur-med) var(--ease-spring)",
          transform: hover ? "scale(1.08) rotate(-4deg)" : "none",
        }}><Icon name={item.icon as IconName} size={20}/></div>
        {item.badge && <Chip color={item.badge.length > 2 ? "neutral" : "jaune"} size="sm">{item.badge}</Chip>}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: "-0.01em", lineHeight: 1.2, marginBottom: 5 }}>{item.title}</div>
      <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.45, marginBottom: 12, minHeight: 34 }}>{item.desc}</div>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
        color: hover ? "var(--pdm-vert)" : "var(--text-2)", transition: "color var(--dur-fast)",
      }}>
        {item.cta}
        <Icon name="chevron" size={13} style={{ transform: hover ? "translateX(3px)" : "none", transition: "transform var(--dur-fast)" }}/>
      </div>
    </button>
  );
}

/* ---------- V1 Fiches ---------- */
interface FichesProps { onOpenFiche: (f: Fiche) => void; }

export function V1Fiches({ onOpenFiche }: FichesProps) {
  const [tab, setTab] = useState("all");
  const tabs = [
    { id: "all", label: "Toutes", count: FICHES_KPI.total, accent: undefined as string | undefined },
    { id: "published", label: "Publiées", count: FICHES_KPI.published, accent: undefined },
    { id: "alerts", label: "Alertes", count: FICHES_KPI.alerts, accent: "jaune" },
    { id: "desync", label: "Désynchronisées", count: FICHES_KPI.desynced, accent: "danger" },
  ];
  const featured = FICHES[0];
  const rest = FICHES.slice(1);

  return (
    <div style={{ animation: "refonte-fade-in 400ms var(--ease-out)" }}>
      {/* Toolbar */}
      <div style={{ padding: "18px 44px 0", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 420 }}>
            <Icon name="search" size={14} style={{ position: "absolute", left: 14, top: 14, color: "var(--text-3)" }}/>
            <input placeholder="Rechercher par nom, commune, SIRET…" style={{
              width: "100%", height: 42, padding: "0 14px 0 38px",
              border: "1px solid var(--border-strong)", borderRadius: 10,
              background: "var(--surface)", fontSize: 13,
            }}/>
          </div>
          <Button variant="outline" size="md" icon="filter">Filtres</Button>
          <Button variant="outline" size="md" icon="refresh">Synchroniser</Button>
          <div style={{ flex: 1 }}/>
          <Button variant="ghost" size="md" icon="download">Exporter</Button>
          <Button variant="vert" size="md" icon="plus">Nouvelle fiche</Button>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "10px 14px", fontSize: 13, fontWeight: 600,
              color: tab === t.id ? "var(--pdm-vert)" : "var(--text-2)",
              borderBottom: tab === t.id ? "2px solid var(--pdm-vert)" : "2px solid transparent",
              marginBottom: -1, transition: "all var(--dur-fast)",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              {t.label}
              <span style={{
                fontSize: 10, fontFamily: "var(--font-mono)",
                padding: "2px 7px", borderRadius: 8,
                background: t.accent === "jaune" ? "var(--jaune-100)" : t.accent === "danger" ? "var(--danger-soft)" : "var(--surface-2)",
                color: t.accent === "jaune" ? "#8a6b00" : t.accent === "danger" ? "var(--danger)" : "var(--text-2)",
              }}>{t.count.toLocaleString("fr").replace(/,/g, " ")}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bandeau synchro en cours */}
      {SYNC.en_cours && (
        <div style={{
          margin: "18px 44px 0", padding: "12px 16px",
          background: "var(--turq-100)", borderRadius: 12,
          display: "flex", alignItems: "center", gap: 14,
          border: "1px solid var(--turq-200)",
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: "white", display: "flex", alignItems: "center", justifyContent: "center", animation: "refonte-subtle-bob 1.4s ease-in-out infinite" }}>
            <Icon name="refresh" size={14} style={{ color: "var(--turq-700)" }}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--turq-700)" }}>
              Synchronisation APIDAE → Apidia en cours · batch {SYNC.batch}/{SYNC.total_batches}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
              {SYNC.fiches_done}/{SYNC.fiches_total} fiches · {SYNC.eta} · démarré il y a {SYNC.depuis}
            </div>
          </div>
          <div style={{ width: 180 }}>
            <div style={{ height: 6, borderRadius: 3, background: "var(--turq-200)", overflow: "hidden" }}>
              <div style={{ width: `${SYNC.pct}%`, height: "100%", background: "var(--pdm-turquoise)", transition: "width 1s var(--ease-out)" }}/>
            </div>
            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4, fontFamily: "var(--font-mono)", textAlign: "right" }}>{SYNC.pct}%</div>
          </div>
        </div>
      )}

      <div style={{ padding: "24px 44px 40px", maxWidth: 1400, margin: "0 auto" }}>
        {/* Featured */}
        <article style={{
          display: "grid", gridTemplateColumns: "1.1fr 1fr",
          background: "var(--surface)", borderRadius: 18, overflow: "hidden",
          border: "1px solid var(--border)", marginBottom: 28, boxShadow: "var(--sh-sm)",
        }}>
          <div style={{ position: "relative" }}>
            <ImgPlaceholder label="Photo fiche" color="vert" ratio="16/10"/>
            <div style={{ position: "absolute", top: 14, left: 14, display: "flex", gap: 6 }}>
              <Chip color="vert">★ Coup de cœur éditorial</Chip>
              <Chip color="neutral">{featured.type}</Chip>
            </div>
          </div>
          <div style={{ padding: "32px 32px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--pdm-vert)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
              FICHE · {featured.id} · Source {featured.source}
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: "-0.025em", margin: "0 0 10px", lineHeight: 1.05 }}>
              {featured.nom}
            </h2>
            <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 16, display: "flex", alignItems: "center", gap: 7 }}>
              <Icon name="pin" size={13}/>{featured.commune} · mise à jour {featured.maj}
            </div>
            <div style={{ display: "flex", gap: 24, marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Score qualité</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 28 }}>
                  <AnimatedNumber value={featured.score}/>
                  <span style={{ fontSize: 13, color: "var(--text-3)", marginLeft: 3 }}>/100</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Statut</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, textTransform: "capitalize", paddingTop: 6 }}>{featured.statut}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Source</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, paddingTop: 6 }}>{featured.source}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="vert" size="md" icon="eye" onClick={() => onOpenFiche(featured)}>Ouvrir la fiche</Button>
              <Button variant="outline" size="md" icon="share">Voir sur Apidia</Button>
            </div>
          </div>
        </article>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {rest.map((f, i) => <V1FicheCard key={f.id} fiche={f} delay={i * 40} onClick={() => onOpenFiche(f)}/>)}
        </div>
      </div>
    </div>
  );
}

interface FicheCardProps { fiche: Fiche; delay: number; onClick: () => void; }

function V1FicheCard({ fiche, delay, onClick }: FicheCardProps) {
  const [hover, setHover] = useState(false);
  const color = fiche.statut === "publié" ? "vert" : fiche.statut === "à vérifier" ? "jaune" : "neutral";
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
      background: "var(--surface)", border: "1px solid " + (hover ? "var(--border-strong)" : "var(--border)"),
      borderRadius: 12, overflow: "hidden", textAlign: "left", cursor: "pointer",
      transition: "all var(--dur-med) var(--ease-out)",
      transform: hover ? "translateY(-2px)" : "none",
      boxShadow: hover ? "var(--sh-md)" : "none",
      animation: `refonte-fade-in 500ms ${delay}ms var(--ease-out) both`,
      width: "100%",
    }}>
      <ImgPlaceholder label={fiche.type} color={fiche.type === "Événement" ? "jaune" : fiche.type === "Hébergement" ? "turq" : "vert"} ratio="16/10"/>
      <div style={{ padding: 13 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
          <Chip color={color as any} size="sm">{fiche.statut}</Chip>
          <Chip color="neutral" size="sm">{fiche.source}</Chip>
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: "-0.01em", marginBottom: 4, lineHeight: 1.22, minHeight: 34 }}>{fiche.nom}</div>
        <div style={{ fontSize: 11, color: "var(--text-3)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span><Icon name="pin" size={10} style={{ marginRight: 3 }}/>{fiche.commune}</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{fiche.maj}</span>
        </div>
      </div>
    </button>
  );
}

/* ---------- V1 Fiche détail ---------- */
interface DetailProps { fiche: Fiche | null; onBack: () => void; }

export function V1FicheDetail({ fiche, onBack }: DetailProps) {
  const [section, setSection] = useState("identite");
  if (!fiche) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--text-3)" }}>
        <div style={{ fontSize: 14 }}>Aucune fiche sélectionnée.</div>
        <Button variant="vert" size="md" onClick={onBack} style={{ marginTop: 16 }}>Retour</Button>
      </div>
    );
  }
  const sections = [
    { id: "identite", label: "Identité", icon: "flag" as IconName },
    { id: "medias", label: "Médias", icon: "layers" as IconName },
    { id: "tarifs", label: "Tarifs", icon: "bolt" as IconName },
    { id: "ouvertures", label: "Ouvertures", icon: "calendar" as IconName },
    { id: "contacts", label: "Contacts", icon: "user" as IconName },
    { id: "publication", label: "Publication", icon: "globe" as IconName },
  ];
  return (
    <div style={{ animation: "refonte-fade-in 400ms var(--ease-out)" }}>
      <div style={{ padding: "16px 44px", background: "var(--surface)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="arrow-left" size={13}/>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{fiche.id} · {fiche.source}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: "-0.015em", margin: 0 }}>{fiche.nom}</h1>
        </div>
        <Chip color="vert">Score {fiche.score}/100</Chip>
        <Chip color={fiche.statut === "publié" ? "vert" : "jaune"}>{fiche.statut}</Chip>
        <Button variant="outline" size="md" icon="share">Aperçu</Button>
        <Button variant="vert" size="md" icon="check">Enregistrer</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 300px", minHeight: "calc(100vh - 158px)" }}>
        {/* Nav latérale */}
        <nav style={{ padding: "20px 14px", borderRight: "1px solid var(--border)", background: "var(--surface)" }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              width: "100%", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10,
              fontSize: 13, fontWeight: section === s.id ? 700 : 500,
              color: section === s.id ? "var(--pdm-vert)" : "var(--text-2)",
              background: section === s.id ? "var(--vert-100)" : "transparent",
              borderRadius: 8, marginBottom: 2, textAlign: "left",
              transition: "all var(--dur-fast)",
            }}><Icon name={s.icon} size={14}/>{s.label}</button>
          ))}
          <div style={{ marginTop: 22, padding: 12, background: "var(--vert-100)", borderRadius: 10, fontSize: 11, color: "var(--vert-700)" }}>
            <div style={{ fontWeight: 700, marginBottom: 3 }}>✨ Suggestion ApidIA</div>
            <div>La description peut être enrichie de 2 phrases pour +12% d'engagement</div>
          </div>
        </nav>

        {/* Main */}
        <main style={{ padding: "28px 32px", background: "var(--bg)" }}>
          {section === "identite" && (
            <>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, margin: "0 0 18px", letterSpacing: "-0.015em" }}>Identité de la fiche</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <V1Field label="Nom" defaultValue={fiche.nom} full/>
                <V1Field label="Type" defaultValue={fiche.type}/>
                <V1Field label="Source" defaultValue={fiche.source}/>
                <V1Field label="Commune" defaultValue={fiche.commune}/>
                <V1Field label="Identifiant" defaultValue={fiche.id} mono/>
                <V1Field label="SIRET" defaultValue="123 456 789 00012" mono/>
                <V1Field label="Adresse" defaultValue="Place Marcel Pagnol" full/>
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, margin: "28px 0 14px", letterSpacing: "-0.015em" }}>Descriptif éditorial</h3>
              <div style={{ background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)", padding: 16, fontSize: 13, lineHeight: 1.6, color: "var(--text-2)" }}>
                Au cœur de la Haute-Provence, cet établissement invite à découvrir l'art de vivre manosquin. Entre pierres dorées et lavandes, un lieu où se mêlent authenticité, raffinement et hospitalité provençale.{" "}
                <span style={{ background: "var(--jaune-100)", padding: "0 3px" }}>Cette description peut être enrichie par ApidIA — cliquer pour générer.</span>
              </div>
            </>
          )}
          {section !== "identite" && (
            <div style={{ padding: 60, textAlign: "center", color: "var(--text-3)", background: "var(--surface)", borderRadius: 14, border: "1px dashed var(--border)" }}>
              <Icon name={sections.find(s => s.id === section)!.icon} size={32} style={{ opacity: 0.25, marginBottom: 10 }}/>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>Section {sections.find(s => s.id === section)!.label}</div>
              <div style={{ fontSize: 12, marginTop: 5 }}>Formulaire éditorial Apidia</div>
            </div>
          )}
        </main>

        {/* Right synchro */}
        <aside style={{ padding: "24px 22px", borderLeft: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 12 }}>Synchronisation</div>
          {[
            { label: "APIDAE", time: "il y a 2 h", ok: true },
            { label: "Apidia public", time: "il y a 2 h", ok: true },
            { label: "Google Business", time: "différé", ok: false },
            { label: "Tourinsoft", time: "il y a 6 h", ok: true },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < 3 ? "1px solid var(--border)" : "none" }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: s.ok ? "var(--pdm-vert)" : "var(--pdm-jaune)" }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: 10, color: "var(--text-3)" }}>{s.time}</div>
              </div>
              <Icon name={s.ok ? "check" : "refresh"} size={13} style={{ color: s.ok ? "var(--vert-700)" : "var(--text-3)" }}/>
            </div>
          ))}
          <div style={{ marginTop: 22, fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 12 }}>Historique éditorial</div>
          {ACTIVITY.slice(0, 4).map((a, i) => (
            <div key={i} style={{ fontSize: 11, marginBottom: 10, paddingLeft: 10, borderLeft: "2px solid var(--vert-200)" }}>
              <div style={{ color: "var(--text-2)" }}>{a.what}{a.target ? " " + a.target : ""}</div>
              <div style={{ color: "var(--text-3)", marginTop: 2 }}>{a.who.split("@")[0]} · {a.t}</div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

/* ---------- V1 Stats ---------- */
export function V1Stats() {
  const [site, setSite] = useState(STATS_SITES[0].slug);
  const cur = STATS_SITES.find(s => s.slug === site) || STATS_SITES[0];
  const G = STATS_GLOBAL;

  return (
    <div style={{ animation: "refonte-fade-in 400ms var(--ease-out)", padding: "28px 44px 40px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Site selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 22, overflowX: "auto", paddingBottom: 8 }}>
        {STATS_SITES.map(s => (
          <button key={s.slug} onClick={() => setSite(s.slug)} style={{
            padding: "8px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: site === s.slug ? "var(--gris-800)" : "var(--surface)",
            color: site === s.slug ? "white" : "var(--text-2)",
            border: "1px solid " + (site === s.slug ? "var(--gris-800)" : "var(--border)"),
            whiteSpace: "nowrap", transition: "all var(--dur-fast)",
          }}>{s.name}</button>
        ))}
      </div>

      {/* Hero stat */}
      <div style={{ background: "var(--surface)", borderRadius: 20, border: "1px solid var(--border)", padding: 28, marginBottom: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 28, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--pdm-vert)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
              Utilisateurs · 14 mois · {cur.name}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 66, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 8 }}>
              <AnimatedNumber value={cur.users}/>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-2)" }}>
              dont <b>{cur.new.toLocaleString("fr").replace(/,/g, " ")}</b> nouveaux utilisateurs
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>Durée moyenne {cur.duree} · engagement {cur.engagement}s</div>
          </div>
          <AreaChart data={EVOLUTION} color="var(--pdm-vert)" height={180}/>
        </div>
      </div>

      {/* Global KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 22 }}>
        {[
          { k: "Global utilisateurs", v: G.users, d: "réseau 8 sites", str: false },
          { k: "Nouveaux utilisateurs", v: G.newUsers, d: "+12% vs 2024", str: false },
          { k: "Pages vues", v: G.pages, d: `${G.pagesPerSession} pages/session`, str: false },
          { k: "Durée moyenne", v: G.avgDuration, d: `rétention ${G.retention}%`, str: true },
        ].map((kpi, i) => (
          <div key={i} style={{ background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)", padding: 18, animation: `refonte-fade-in 500ms ${i * 60}ms var(--ease-out) both` }}>
            <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>{kpi.k}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 26, letterSpacing: "-0.02em" }}>
              {kpi.str ? kpi.v : <AnimatedNumber value={kpi.v as number}/>}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 3 }}>{kpi.d}</div>
          </div>
        ))}
      </div>

      {/* Comparaison sites */}
      <div style={{ background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)", padding: 22 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 17, letterSpacing: "-0.01em", marginBottom: 4 }}>Classement utilisateurs · tous sites</div>
        <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16 }}>14 mois glissants</div>
        <HBarChart data={STATS_SITES.map(s => ({ label: s.name, v: s.users }))} color="var(--pdm-vert)" height={STATS_SITES.length * 36}/>
      </div>
    </div>
  );
}

/* ---------- V1 Missions ---------- */
export function V1Missions() {
  const [filter, setFilter] = useState("all");
  const filters = [
    { id: "all", label: "Tous" },
    { id: "à valider", label: "À valider" },
    { id: "validé", label: "Validés" },
    { id: "clôturé", label: "Clôturés" },
    { id: "refusé", label: "Refusés" },
  ];
  const K = MISSIONS_KPI;
  const rows = filter === "all" ? MISSIONS : MISSIONS.filter(m => m.statut === filter);

  return (
    <div style={{ animation: "refonte-fade-in 400ms var(--ease-out)", padding: "28px 44px 40px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header banner */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0,
        background: "var(--gris-900)", color: "white", borderRadius: 16, padding: 22, marginBottom: 22,
        position: "relative", overflow: "hidden",
      }}>
        <svg viewBox="0 0 400 200" style={{ position: "absolute", top: -40, right: -20, width: 300, height: 200, opacity: 0.18, pointerEvents: "none" }}>
          {[0, 8, 16, 24].map((a, i) => (
            <path key={i} d={`M 280 180 L ${300 + i * 6} 20 L 290 180 Z`} transform={`rotate(${a} 280 180)`} fill="var(--pdm-jaune)"/>
          ))}
        </svg>
        {[
          { k: "À valider", v: K.en_attente, d: "demandes ouvertes", color: "var(--pdm-jaune)" },
          { k: "Validés ce mois", v: K.valides_mois, d: "missions approuvées", color: "var(--pdm-vert)" },
          { k: "Frais du mois", v: `${K.frais_mois.toLocaleString("fr").replace(/,/g, " ")} €`, d: "toutes missions", color: "white" },
          { k: "Jours de déplacement", v: K.jours_mois, d: "équipe complète", color: "white" },
        ].map((s, i) => (
          <div key={i} style={{ borderRight: i < 3 ? "1px solid rgba(255,255,255,0.08)" : "none", padding: "0 20px" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>{s.k}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 30, letterSpacing: "-0.025em", color: s.color }}>{s.v}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 3 }}>{s.d}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: "8px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: filter === f.id ? "var(--pdm-vert)" : "var(--surface)",
            color: filter === f.id ? "white" : "var(--text-2)",
            border: "1px solid " + (filter === f.id ? "var(--pdm-vert)" : "var(--border)"),
            transition: "all var(--dur-fast)",
          }}>{f.label}</button>
        ))}
        <div style={{ flex: 1 }}/>
        <Button variant="outline" size="md" icon="download">Export comptable</Button>
        <Button variant="vert" size="md" icon="plus">Nouvel ordre</Button>
      </div>

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((m, i) => <V1MissionRow key={m.id} mission={m} delay={i * 50}/>)}
      </div>
    </div>
  );
}

interface MissionRowProps { mission: Mission; delay: number; }

function V1MissionRow({ mission, delay }: MissionRowProps) {
  const [open, setOpen] = useState(false);
  const colorMap: Record<string, "jaune" | "vert" | "neutral" | "danger"> = {
    "à valider": "jaune", "validé": "vert", "clôturé": "neutral", "refusé": "danger",
  };
  return (
    <div style={{ background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden", animation: `refonte-fade-in 500ms ${delay}ms var(--ease-out) both` }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", padding: 16, display: "flex", alignItems: "center", gap: 14, textAlign: "left", background: "transparent" }}>
        <Avatar initials={mission.agent.split(" ").map(w => w[0]).join("")} size={36} color={mission.statut === "validé" ? "vert" : mission.statut === "à valider" ? "jaune" : "gris"}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-3)" }}>{mission.id}</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 15, letterSpacing: "-0.01em" }}>{mission.objet}</span>
            <Chip color={colorMap[mission.statut]} size="sm">{mission.statut}</Chip>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 12 }}>
            <span>{mission.agent}</span><span>·</span>
            <span><Icon name="calendar" size={11}/> {mission.du} → {mission.au} ({mission.jours}j)</span><span>·</span>
            <span><Icon name="briefcase" size={11}/> {mission.vehicule}</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: "-0.01em" }}>{mission.frais} €</div>
          <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>frais déclarés</div>
        </div>
        <Icon name="chevron" size={13} style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform var(--dur-fast)" }}/>
      </button>
      {open && (
        <div style={{ padding: "18px", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, animation: "refonte-fade-in 300ms var(--ease-out)", background: "var(--surface-2)" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 }}>Détails</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", rowGap: 6, columnGap: 14, fontSize: 12 }}>
              <span style={{ color: "var(--text-3)" }}>Objet</span><span>{mission.objet}</span>
              <span style={{ color: "var(--text-3)" }}>Véhicule</span><span>{mission.vehicule}</span>
              <span style={{ color: "var(--text-3)" }}>Jours</span><span>{mission.jours} jour(s)</span>
              <span style={{ color: "var(--text-3)" }}>Frais</span><span style={{ fontFamily: "var(--font-mono)" }}>{mission.frais} €</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 }}>Workflow</div>
            {[
              { e: "Créée", ok: true },
              { e: "Soumise", ok: true },
              { e: "Validée direction", ok: mission.statut === "validé" || mission.statut === "clôturé" },
              { e: "Remboursée", ok: mission.statut === "clôturé" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 5 }}>
                <div style={{ width: 14, height: 14, borderRadius: 7, background: s.ok ? "var(--pdm-vert)" : "var(--gris-200)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {s.ok && <Icon name="check" size={9}/>}
                </div>
                <span style={{ color: s.ok ? "var(--text)" : "var(--text-3)" }}>{s.e}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Reorg modal ---------- */
interface ReorgModalProps { onClose: () => void; }

function V1ReorgModal({ onClose }: ReorgModalProps) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(10, 14, 18, 0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24,
      animation: "refonte-fade-in 200ms var(--ease-out)",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--surface)", borderRadius: 20, padding: 26, width: 700, maxHeight: "86vh", overflow: "auto",
        boxShadow: "var(--sh-lg)", animation: "refonte-scale-in 320ms var(--ease-spring)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--vert-100)", color: "var(--pdm-vert)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="drag" size={18}/>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: "-0.015em", margin: 0 }}>Réorganiser le tableau de bord</h2>
            <div style={{ fontSize: 12, color: "var(--text-3)" }}>Glissez-déposez les rubriques pour adapter votre espace</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface-2)" }}><Icon name="x" size={13}/></button>
        </div>
        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {HUB.flatMap(g => g.items).map((item, i) => (
            <div key={item.id} style={{
              padding: 12, background: "var(--surface-2)", borderRadius: 10,
              display: "flex", alignItems: "center", gap: 10, cursor: "grab",
              border: "1px dashed var(--border-strong)", transition: "all var(--dur-fast)",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--vert-100)"; e.currentTarget.style.borderColor = "var(--pdm-vert)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
            >
              <Icon name="drag" size={13} style={{ color: "var(--text-3)" }}/>
              <Icon name={item.icon as IconName} size={14} style={{ color: "var(--pdm-vert)" }}/>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{item.title}</span>
              <input type="checkbox" defaultChecked={i < 8} style={{ marginLeft: "auto", accentColor: "var(--pdm-vert)" }}/>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 22 }}>
          <Button variant="ghost" size="md" onClick={onClose}>Annuler</Button>
          <Button variant="vert" size="md" icon="check" onClick={onClose}>Enregistrer la disposition</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- V1 Shell (sidebar + topbar wrapper) ---------- */
interface ShellProps {
  screen: Screen;
  onNav: (s: Screen) => void;
  onLogout: () => void;
  children: ReactNode;
}

export function V1Shell({ screen, onNav, onLogout, children }: ShellProps) {
  const [reorgOpen, setReorgOpen] = useState(false);
  const nav: { id: Screen; icon: IconName; label: string }[] = [
    { id: "home", icon: "grid", label: "Hub" },
    { id: "fiches", icon: "eye", label: "Fiches" },
    { id: "stats", icon: "chart", label: "Statistiques" },
    { id: "missions", icon: "briefcase", label: "Missions" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh", background: "var(--gris-100)" }}>
      {/* Sidebar */}
      <aside style={{
        background: "var(--gris-900)", color: "white",
        padding: "22px 16px 16px",
        display: "flex", flexDirection: "column", gap: 14,
        position: "sticky", top: 0, height: "100vh",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 4px" }}>
          <ApidiaLogo size={40}/>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, lineHeight: 1, letterSpacing: "-0.01em" }}>APIDIA</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>Back-office PdM</div>
          </div>
        </div>

        <nav style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 2 }}>
          {nav.map(n => {
            const active = screen === n.id || (screen === "detail" && n.id === "fiches");
            return (
              <button key={n.id} onClick={() => onNav(n.id)} style={{
                height: 40, padding: "0 12px", borderRadius: 10,
                display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                background: active ? "rgba(255,214,65,0.14)" : "transparent",
                color: active ? "var(--pdm-jaune)" : "rgba(255,255,255,0.75)",
                fontSize: 13, fontWeight: 600,
                transition: "all var(--dur-fast)",
                position: "relative",
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                {active && <span style={{ position: "absolute", left: -16, top: 8, bottom: 8, width: 3, borderRadius: 2, background: "var(--pdm-jaune)" }}/>}
                <Icon name={n.icon} size={16}/>
                {n.label}
              </button>
            );
          })}
        </nav>

        <div style={{ flex: 1 }}/>

        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Synchro APIDAE</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: "var(--pdm-vert)", boxShadow: "0 0 8px var(--pdm-vert)" }}/>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.85)" }}>En ligne · il y a 2h</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 6px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Avatar initials={USER.initials} size={32} color="vert"/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>{USER.name}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{USER.role}</div>
          </div>
          <button onClick={onLogout} title="Déconnexion" style={{ width: 28, height: 28, borderRadius: 8, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "white"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
          >
            <Icon name="logout" size={14}/>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <V1TopBar screen={screen} onNav={onNav} onReorg={() => setReorgOpen(true)}/>
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </main>

      {reorgOpen && <V1ReorgModal onClose={() => setReorgOpen(false)}/>}
    </div>
  );
}
