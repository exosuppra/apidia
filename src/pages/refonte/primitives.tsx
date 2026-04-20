import React, { useEffect, useState, CSSProperties, ReactNode, ButtonHTMLAttributes } from "react";

/* ============================================================
   Apidia Refonte · Primitives (icons, logo, charts, form bits)
   Partagé par les 3 variations.
   ============================================================ */

/* ---------- ICONS (single stroke, 1.7 weight) ---------- */
export type IconName =
  | "users" | "user" | "clock" | "briefcase" | "bell" | "inbox" | "eye"
  | "history" | "book" | "chat" | "share" | "calendar" | "globe" | "chart"
  | "star" | "link" | "layers" | "plus" | "check" | "x" | "search"
  | "chevron" | "chevronD" | "chevronL" | "pin" | "sparkles" | "flag"
  | "download" | "refresh" | "filter" | "settings" | "logout" | "arrow-left"
  | "mail" | "moreV" | "moreH" | "grid" | "list" | "palette" | "drag"
  | "command" | "upload" | "bolt" | "alert";

interface IconProps {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}

export function Icon({ name, size = 16, style }: IconProps) {
  const S = size;
  const p = {
    width: S, height: S, viewBox: "0 0 24 24", fill: "none" as const,
    stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const, style,
  };
  switch (name) {
    case "users":     return <svg {...p}><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.4-5.6 6.5-5.6s5.9 2 6.5 5.6"/><circle cx="17" cy="9" r="2.7"/><path d="M21.5 18.8c-.4-2.2-1.9-3.8-4-4.2"/></svg>;
    case "user":      return <svg {...p}><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.8-3.8 3.9-6 7.5-6s6.7 2.2 7.5 6"/></svg>;
    case "clock":     return <svg {...p}><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/></svg>;
    case "briefcase": return <svg {...p}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18"/></svg>;
    case "bell":      return <svg {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>;
    case "inbox":     return <svg {...p}><path d="M3 13v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6M3 13l2.5-7A2 2 0 0 1 7.4 5h9.2a2 2 0 0 1 1.9 1L21 13M3 13h5l1.5 2.5h5L16 13h5"/></svg>;
    case "eye":       return <svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>;
    case "history":   return <svg {...p}><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v5h5"/><path d="M12 8v4l3 2"/></svg>;
    case "book":      return <svg {...p}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M4 19.5h15"/></svg>;
    case "chat":      return <svg {...p}><path d="M4 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/></svg>;
    case "share":     return <svg {...p}><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8 15.8 6.2M8.2 13.2 15.8 17.8"/></svg>;
    case "calendar":  return <svg {...p}><rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/></svg>;
    case "globe":     return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 3 4 6 4 9s-1.4 6-4 9c-2.6-3-4-6-4-9s1.4-6 4-9z"/></svg>;
    case "chart":     return <svg {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>;
    case "star":      return <svg {...p}><path d="M12 3.5l2.6 5.4 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z"/></svg>;
    case "link":      return <svg {...p}><path d="M10 13.5a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10.5a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>;
    case "layers":    return <svg {...p}><path d="M12 3 3 8l9 5 9-5-9-5zM3 13l9 5 9-5M3 18l9 5 9-5"/></svg>;
    case "plus":      return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case "check":     return <svg {...p}><path d="M4 12l5 5L20 6"/></svg>;
    case "x":         return <svg {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case "search":    return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case "chevron":   return <svg {...p}><path d="M9 6l6 6-6 6"/></svg>;
    case "chevronD":  return <svg {...p}><path d="M6 9l6 6 6-6"/></svg>;
    case "chevronL":  return <svg {...p}><path d="M15 6l-6 6 6 6"/></svg>;
    case "pin":       return <svg {...p}><path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>;
    case "sparkles":  return <svg {...p}><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3zM19 15l.9 2.3 2.3.9-2.3.9L19 21.5l-.9-2.4-2.3-.9 2.3-.9L19 15z"/></svg>;
    case "flag":      return <svg {...p}><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>;
    case "download":  return <svg {...p}><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>;
    case "refresh":   return <svg {...p}><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/></svg>;
    case "filter":    return <svg {...p}><path d="M3 5h18l-7 9v5l-4 2v-7L3 5z"/></svg>;
    case "settings":  return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h0a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v0a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>;
    case "logout":    return <svg {...p}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>;
    case "arrow-left":return <svg {...p}><path d="M19 12H5M12 5l-7 7 7 7"/></svg>;
    case "mail":      return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>;
    case "moreV":     return <svg {...p}><circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/></svg>;
    case "moreH":     return <svg {...p}><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>;
    case "grid":      return <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
    case "list":      return <svg {...p}><path d="M4 6h16M4 12h16M4 18h16"/></svg>;
    case "palette":   return <svg {...p}><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2.5-1 2.5-2.3 0-.6-.2-1.1-.6-1.5a2 2 0 0 1 1.5-3.3H18a3 3 0 0 0 3-3c0-4.4-4-8-9-8z"/><circle cx="7" cy="10" r="1"/><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="17" cy="10" r="1"/></svg>;
    case "drag":      return <svg {...p}><circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/></svg>;
    case "command":   return <svg {...p}><path d="M9 6H6a3 3 0 1 1 3-3v3zM9 6v12M9 6h6M9 18v-3H6a3 3 0 1 0 3 3zM9 18h6M15 6V3a3 3 0 1 1 3 3h-3zM15 18h3a3 3 0 1 0-3-3v3zM15 12h3"/></svg>;
    case "upload":    return <svg {...p}><path d="M12 15V3M7 8l5-5 5 5M4 21h16"/></svg>;
    case "bolt":      return <svg {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>;
    case "alert":     return <svg {...p}><path d="M12 4l10 17H2L12 4z"/><path d="M12 10v4M12 18h.01"/></svg>;
    default:          return <svg {...p}><rect x="4" y="4" width="16" height="16" rx="2"/></svg>;
  }
}

/* ---------- Logo PdM (rond noir avec faisceau) ---------- */
interface ApidiaLogoProps {
  size?: number;
  withRay?: boolean;
  full?: boolean;
}

export function ApidiaLogo({ size = 40, withRay = false, full = false }: ApidiaLogoProps) {
  if (full) {
    return (
      <img
        src="/refonte/logo-pdm.png"
        alt="Pays de Manosque"
        style={{ width: size, height: "auto", objectFit: "contain", display: "inline-block" }}
      />
    );
  }
  const box = size * 1.15;
  return (
    <div style={{ position: "relative", width: box, height: box, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <div style={{
        width: box, height: box, overflow: "hidden",
        backgroundImage: "url(/refonte/logo-pdm.png)",
        backgroundRepeat: "no-repeat",
        backgroundSize: `${size * 1.72}px auto`,
        backgroundPosition: `${-size * 0.12}px ${-size * 0.09}px`,
        filter: withRay ? "drop-shadow(0 2px 8px rgba(255,214,65,0.25))" : "none",
      }}/>
    </div>
  );
}

/* ---------- Avatar ---------- */
interface AvatarProps {
  initials: string;
  size?: number;
  color?: "vert" | "turq" | "jaune" | "gris";
  ring?: boolean;
}

export function Avatar({ initials, size = 32, color = "vert", ring }: AvatarProps) {
  const map: Record<string, string> = {
    vert: "var(--pdm-vert)", turq: "var(--pdm-turquoise)",
    jaune: "var(--pdm-jaune)", gris: "var(--gris-600)",
  };
  const fg = color === "jaune" ? "var(--gris-900)" : "white";
  return (
    <div style={{
      width: size, height: size,
      borderRadius: "50%",
      background: map[color] || map.vert,
      color: fg,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700,
      fontFamily: "var(--font-ui)",
      letterSpacing: "-0.02em",
      boxShadow: ring ? "0 0 0 2px var(--surface)" : "none",
      flexShrink: 0,
    }}>{initials}</div>
  );
}

/* ---------- Chip ---------- */
type ChipColor = "vert" | "turq" | "jaune" | "danger" | "neutral" | "darkV" | "darkJ" | "darkT" | "darkD" | "darkN";

interface ChipProps {
  children: ReactNode;
  color?: ChipColor;
  size?: "sm" | "md";
  style?: CSSProperties;
}

export function Chip({ children, color = "neutral", size = "md", style }: ChipProps) {
  const colors: Record<ChipColor, { bg: string; fg: string }> = {
    vert:   { bg: "var(--vert-100)", fg: "var(--vert-700)" },
    turq:   { bg: "var(--turq-100)", fg: "var(--turq-700)" },
    jaune:  { bg: "var(--jaune-100)", fg: "#8a6b00" },
    danger: { bg: "var(--danger-soft)", fg: "var(--danger)" },
    neutral:{ bg: "var(--gris-150)", fg: "var(--gris-800)" },
    darkV:  { bg: "rgba(162,199,67,0.15)", fg: "var(--vert-400)" },
    darkJ:  { bg: "rgba(255,214,65,0.15)", fg: "var(--pdm-jaune)" },
    darkT:  { bg: "rgba(74,181,188,0.15)", fg: "var(--turq-400)" },
    darkD:  { bg: "rgba(217,76,76,0.18)", fg: "#ff9898" },
    darkN:  { bg: "rgba(255,255,255,0.08)", fg: "rgba(255,255,255,0.7)" },
  };
  const c = colors[color] || colors.neutral;
  const pad = size === "sm" ? "2px 7px" : "3px 9px";
  const fs = size === "sm" ? 10 : 11;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: pad, fontSize: fs, fontWeight: 700,
      color: c.fg, background: c.bg,
      borderRadius: 999, letterSpacing: "0.02em",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      ...style,
    }}>{children}</span>
  );
}

/* ---------- Button ---------- */
type ButtonVariant = "primary" | "jaune" | "vert" | "turq" | "orange" | "outline" | "ghost" | "danger" | "darkGhost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size"> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
}

export function Button({ children, variant = "primary", size = "md", icon, iconRight, onClick, style, disabled, ...rest }: ButtonProps) {
  const sizes: Record<ButtonSize, { h: number; px: number; fs: number }> = {
    sm: { h: 28, px: 10, fs: 12 },
    md: { h: 36, px: 14, fs: 13 },
    lg: { h: 44, px: 18, fs: 14 },
  };
  const s = sizes[size];
  const variants: Record<ButtonVariant, { bg: string; fg: string; bd: string }> = {
    primary:  { bg: "var(--gris-800)", fg: "white", bd: "transparent" },
    jaune:    { bg: "var(--pdm-jaune)", fg: "var(--gris-900)", bd: "transparent" },
    vert:     { bg: "var(--pdm-vert)", fg: "white", bd: "transparent" },
    turq:     { bg: "var(--pdm-turquoise)", fg: "white", bd: "transparent" },
    orange:   { bg: "#F18F00", fg: "white", bd: "transparent" },
    outline:  { bg: "var(--surface)", fg: "var(--text)", bd: "var(--border-strong)" },
    ghost:    { bg: "transparent", fg: "var(--text-2)", bd: "transparent" },
    danger:   { bg: "var(--danger-soft)", fg: "var(--danger)", bd: "transparent" },
    darkGhost:{ bg: "rgba(255,255,255,0.06)", fg: "white", bd: "rgba(255,255,255,0.1)" },
  };
  const v = variants[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: s.h, padding: `0 ${s.px}px`,
        fontSize: s.fs, fontWeight: 600,
        background: v.bg, color: v.fg,
        border: `1px solid ${v.bd}`,
        borderRadius: 8,
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "filter var(--dur-fast), transform var(--dur-fast)",
        fontFamily: "var(--font-ui)",
        whiteSpace: "nowrap",
        ...style,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.filter = "brightness(0.96)"; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.filter = ""; }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = "scale(0.98)"; }}
      onMouseUp={e => { if (!disabled) e.currentTarget.style.transform = ""; }}
      {...rest}
    >
      {icon && <Icon name={icon} size={s.fs + 2}/>}
      {children}
      {iconRight && <Icon name={iconRight} size={s.fs + 2}/>}
    </button>
  );
}

/* ---------- AnimatedNumber ---------- */
interface AnimatedNumberProps {
  value: number;
  format?: (v: number) => string;
  duration?: number;
}

export function AnimatedNumber({ value, format, duration = 900 }: AnimatedNumberProps) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const from = 0, to = value;
    let raf: number;
    function tick(t: number) {
      const pct = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - pct, 3);
      setV(from + (to - from) * eased);
      if (pct < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  const display = format ? format(v) : Math.round(v).toLocaleString("fr-FR").replace(/,/g, " ");
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{display}</span>;
}

/* ---------- Sparkline ---------- */
interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  fill?: string;
}

export function Sparkline({ data, color = "var(--pdm-vert)", height = 30, fill }: SparklineProps) {
  if (!data?.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const W = 100, H = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return [x, y] as const;
  });
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = d + ` L${W} ${H} L0 ${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      {fill && <path d={area} fill={fill}/>}
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        style={{ strokeDasharray: 1000, strokeDashoffset: 1000, animation: "refonte-dash-draw 1s var(--ease-out) forwards" }}/>
    </svg>
  );
}

/* ---------- HBar chart (comparaison par site) ---------- */
interface HBarDatum { label: string; v: number; }

interface HBarChartProps {
  data: HBarDatum[];
  color?: string;
  height?: number;
}

export function HBarChart({ data, color = "var(--pdm-vert)", height = 240 }: HBarChartProps) {
  const max = Math.max(...data.map(d => d.v));
  const rowH = Math.floor(height / data.length);
  return (
    <div style={{ width: "100%" }}>
      {data.map((d, i) => (
        <div key={d.label} style={{
          display: "grid", gridTemplateColumns: "120px 1fr 80px", gap: 10, alignItems: "center", height: rowH,
          animation: `refonte-slide-in-right 500ms ${i * 50}ms var(--ease-out) both`,
        }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.label}</div>
          <div style={{ position: "relative", height: rowH - 8, background: "var(--gris-100)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(d.v / max) * 100}%`, background: color, borderRadius: 4, transition: "width 900ms var(--ease-out)" }}/>
          </div>
          <div style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", color: "var(--text-2)", textAlign: "right", fontFamily: "var(--font-mono)" }}>
            {d.v.toLocaleString("fr-FR").replace(/,/g, " ")}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- AreaChart (évolution) ---------- */
interface AreaDatum { m: string; v: number; }

interface AreaChartProps {
  data: AreaDatum[];
  color?: string;
  height?: number;
}

export function AreaChart({ data, color = "var(--pdm-vert)", height = 220 }: AreaChartProps) {
  const W = 800, H = height;
  const pad = { t: 20, r: 20, b: 30, l: 50 };
  const max = Math.max(...data.map(d => d.v));
  const pts = data.map((d, i) => {
    const x = pad.l + (i / (data.length - 1)) * (W - pad.l - pad.r);
    const y = pad.t + (1 - d.v / max) * (H - pad.t - pad.b);
    return [x, y, d] as const;
  });
  const smooth = pts.map(([x, y], i, arr) => {
    if (i === 0) return `M${x} ${y}`;
    const [px, py] = arr[i - 1];
    const cx = (px + x) / 2;
    return `C${cx} ${py}, ${cx} ${y}, ${x} ${y}`;
  }).join(" ");
  const area = smooth + ` L${pts[pts.length - 1][0]} ${H - pad.b} L${pts[0][0]} ${H - pad.b} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height, display: "block" }}>
      <defs>
        <linearGradient id="refonte-area-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = pad.t + t * (H - pad.t - pad.b);
        return <line key={t} x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="var(--gris-150)" strokeWidth="1"/>;
      })}
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = pad.t + t * (H - pad.t - pad.b);
        const val = Math.round(max * (1 - t) / 1000) * 1000;
        return <text key={"y"+t} x={pad.l - 10} y={y + 4} fontSize="10" fill="var(--text-3)" textAnchor="end" fontFamily="var(--font-mono)">
          {val >= 1000 ? (val/1000).toFixed(0)+"k" : val}
        </text>;
      })}
      {pts.filter((_, i) => i % 2 === 0).map(([x, , d], i) => (
        <text key={"x"+i} x={x} y={H - 8} fontSize="10" fill="var(--text-3)" textAnchor="middle" fontFamily="var(--font-mono)">{d.m}</text>
      ))}
      <path d={area} fill="url(#refonte-area-g)" style={{ animation: "refonte-fade-in 700ms var(--ease-out)" }}/>
      <path d={smooth} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        style={{ strokeDasharray: 3000, strokeDashoffset: 3000, animation: "refonte-dash-draw 1.4s var(--ease-out) forwards" }}/>
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="white" stroke={color} strokeWidth="1.8"
          style={{ animation: `refonte-fade-in 300ms ${1000 + i * 40}ms var(--ease-out) both` }}/>
      ))}
    </svg>
  );
}

/* ---------- Image placeholder (blob form) ---------- */
interface ImgPlaceholderProps {
  label: string;
  color?: "vert" | "turq" | "jaune" | "gris";
  ratio?: string;
  style?: CSSProperties;
}

export function ImgPlaceholder({ label, color = "vert", ratio = "4/3", style }: ImgPlaceholderProps) {
  const map: Record<string, string> = {
    vert: "linear-gradient(135deg, var(--vert-200), var(--vert-100))",
    turq: "linear-gradient(135deg, var(--turq-200), var(--turq-100))",
    jaune:"linear-gradient(135deg, var(--jaune-200), var(--jaune-100))",
    gris: "linear-gradient(135deg, var(--gris-200), var(--gris-100))",
  };
  return (
    <div style={{
      aspectRatio: ratio, background: map[color], borderRadius: 12,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden", ...style,
    }}>
      <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.15 }}>
        <circle cx="30" cy="35" r="10" fill="currentColor" color="var(--gris-700)"/>
        <path d="M10 80 Q30 60 50 75 T90 70 L90 100 L10 100 Z" fill="currentColor" color="var(--gris-700)"/>
      </svg>
      <div style={{
        fontSize: 10, color: "var(--text-3)", background: "rgba(255,255,255,0.6)",
        padding: "3px 8px", borderRadius: 12, fontFamily: "var(--font-mono)",
      }}>{label}</div>
    </div>
  );
}
