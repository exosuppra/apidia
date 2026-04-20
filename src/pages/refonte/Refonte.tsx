import React, { useEffect, useState } from "react";
import "./refonte-tokens.css";
import {
  V1Shell, V1Login, V1Home, V1Fiches, V1FicheDetail, V1Stats, V1Missions,
  Screen,
} from "./V1";
import { Fiche } from "./data";

/* =============================================================
   Apidia · Refonte preview
   Port du prototype "Apidia Refonte.html" livré par Claude Design.
   Pour l'instant seule la variation V1 (Éditorial — celle retenue
   dans le chat) est branchée. V2 et V3 sont à venir.
   ============================================================= */

type Variation = "v1" | "v2" | "v3";
type Accent = "vert" | "turq" | "jaune";
type Density = "comfy" | "dense";
type Motion = "on" | "off";

interface PersistedState {
  variation: Variation;
  accent: Accent;
  density: Density;
  motion: Motion;
}

const DEFAULTS: PersistedState = {
  variation: "v1",
  accent: "jaune",
  density: "comfy",
  motion: "on",
};

const loadState = (): PersistedState => {
  try {
    const raw = localStorage.getItem("apidia_refonte_state");
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
};

export default function Refonte() {
  const initial = loadState();
  const [variation, setVariation] = useState<Variation>(initial.variation);
  const [accent, setAccent] = useState<Accent>(initial.accent);
  const [density, setDensity] = useState<Density>(initial.density);
  const [motion, setMotion] = useState<Motion>(initial.motion);
  const [screen, setScreen] = useState<Screen>("login");
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [tweaksOpen, setTweaksOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("apidia_refonte_state", JSON.stringify({ variation, accent, density, motion }));
  }, [variation, accent, density, motion]);

  const onNav = (s: Screen) => setScreen(s);
  const onOpenFiche = (f: Fiche) => { setFiche(f); setScreen("detail"); };
  const onLogin = () => setScreen("home");
  const onLogout = () => setScreen("login");

  const renderScreen = () => {
    if (screen === "login") return <V1Login onLogin={onLogin}/>;
    const children = (() => {
      switch (screen) {
        case "home":     return <V1Home onNav={onNav}/>;
        case "fiches":   return <V1Fiches onOpenFiche={onOpenFiche}/>;
        case "detail":   return <V1FicheDetail fiche={fiche} onBack={() => setScreen("fiches")}/>;
        case "stats":    return <V1Stats/>;
        case "missions": return <V1Missions/>;
        default:         return null;
      }
    })();
    return <V1Shell screen={screen} onNav={onNav} onLogout={onLogout}>{children}</V1Shell>;
  };

  const variationInfo = (v: Variation) => {
    if (v === "v1") return { label: "01 · Éditorial", ready: true };
    if (v === "v2") return { label: "02 · Dense", ready: false };
    return { label: "03 · ApidIA", ready: false };
  };

  return (
    <div className="refonte-root" data-accent={accent} data-density={density} data-motion={motion} data-variation={variation}>
      {renderScreen()}

      {/* Variation switcher (bottom center) */}
      <div className="var-switcher">
        {(["v1", "v2", "v3"] as Variation[]).map(v => {
          const info = variationInfo(v);
          return (
            <button
              key={v}
              className={variation === v ? "active" : ""}
              onClick={() => {
                if (info.ready) setVariation(v);
                else alert(`La variation « ${info.label} » n'est pas encore portée. V1 Éditorial est disponible — V2/V3 arrivent bientôt.`);
              }}
              title={info.ready ? info.label : `${info.label} (bientôt)`}
              style={{ opacity: info.ready ? 1 : 0.5 }}
            >
              <span className="dot"/>{info.label}
            </button>
          );
        })}
        <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.15)", margin: "0 4px" }}/>
        <button onClick={() => setTweaksOpen(v => !v)} title="Tweaks" style={{ padding: "0 12px" }}>
          ⚙ Tweaks
        </button>
      </div>

      {/* Tweaks panel */}
      {tweaksOpen && (
        <div className="tweaks-panel">
          <h4>⚙ Tweaks
            <span style={{ flex: 1 }}/>
            <button onClick={() => setTweaksOpen(false)} style={{ fontSize: 14, color: "var(--text-3)" }}>×</button>
          </h4>

          <div className="tweak-row">
            <div className="tweak-label">Accent</div>
            <div className="opts">
              {[
                { k: "vert" as Accent, l: "Vert", bg: "var(--pdm-vert)" },
                { k: "turq" as Accent, l: "Turquoise", bg: "var(--pdm-turquoise)" },
                { k: "jaune" as Accent, l: "Jaune", bg: "var(--pdm-jaune)" },
              ].map(o => (
                <button key={o.k} className={accent === o.k ? "active" : ""} onClick={() => setAccent(o.k)}>
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: o.bg, marginRight: 4, verticalAlign: "middle" }}/>{o.l}
                </button>
              ))}
            </div>
          </div>

          <div className="tweak-row">
            <div className="tweak-label">Densité</div>
            <div className="opts">
              {[
                { k: "comfy" as Density, l: "Confort" },
                { k: "dense" as Density, l: "Dense" },
              ].map(o => (
                <button key={o.k} className={density === o.k ? "active" : ""} onClick={() => setDensity(o.k)}>{o.l}</button>
              ))}
            </div>
          </div>

          <div className="tweak-row">
            <div className="tweak-label">Motion</div>
            <div className="opts">
              {[
                { k: "on" as Motion, l: "Activé" },
                { k: "off" as Motion, l: "Réduit" },
              ].map(o => (
                <button key={o.k} className={motion === o.k ? "active" : ""} onClick={() => setMotion(o.k)}>{o.l}</button>
              ))}
            </div>
          </div>

          <div className="tweak-row">
            <div className="tweak-label">Aller à…</div>
            <div className="opts">
              {[
                { k: "login" as Screen, l: "Login" },
                { k: "home" as Screen, l: "Hub" },
                { k: "fiches" as Screen, l: "Fiches" },
                { k: "stats" as Screen, l: "Stats" },
                { k: "missions" as Screen, l: "Missions" },
              ].map(o => (
                <button key={o.k} className={screen === o.k ? "active" : ""} onClick={() => setScreen(o.k)}>{o.l}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
