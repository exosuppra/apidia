/* ============================================================
   Apidia Refonte · Data model
   Basé sur la structure réelle du back-office Pays de Manosque.
   Ce sont des données de prototype — à remplacer par de vraies
   requêtes Supabase au moment de l'intégration production.
   ============================================================ */

export interface User {
  name: string;
  email: string;
  initials: string;
  role: string;
}

export interface HubItem {
  id: string;
  icon: string;
  title: string;
  desc: string;
  cta: string;
  badge: string | null;
}

export interface HubGroup {
  group: string;
  icon: string;
  items: HubItem[];
}

export interface ActivityItem {
  t: string;
  who: string;
  what: string;
  target?: string;
  meta?: string;
}

export interface StatsSite {
  name: string;
  slug: string;
  users: number;
  pages: number;
  engagement: number;
  duree: string;
  new: number;
}

export interface StatsGlobal {
  users: number;
  newUsers: number;
  pages: number;
  engagement: number;
  pagesPerSession: number;
  avgDuration: string;
  retention: number;
}

export interface EvolutionPoint {
  m: string;
  v: number;
}

export interface Fiche {
  id: string;
  nom: string;
  type: string;
  commune: string;
  statut: "publié" | "à vérifier" | "brouillon";
  source: "APIDAE" | "Apidia";
  maj: string;
  score: number;
}

export interface FichesKpi {
  total: number;
  published: number;
  desynced: number;
  alerts: number;
  apidae: number;
  apidia: number;
}

export interface SyncStatus {
  en_cours: boolean;
  batch: number;
  total_batches: number;
  fiches_done: number;
  fiches_total: number;
  pct: number;
  eta: string;
  depuis: string;
}

export interface Mission {
  id: string;
  objet: string;
  agent: string;
  du: string;
  au: string;
  jours: number;
  frais: number;
  statut: "à valider" | "validé" | "clôturé" | "refusé";
  vehicule: string;
}

export interface MissionsKpi {
  en_attente: number;
  valides_mois: number;
  frais_mois: number;
  jours_mois: number;
}

export interface Demande {
  id: string;
  fiche: string;
  champ: string;
  from: string;
  date: string;
}

export const USER: User = {
  name: "Quentin Duroy",
  email: "q.duroy@paysdemanosque.com",
  initials: "QD",
  role: "Administrateur",
};

export const HUB: HubGroup[] = [
  {
    group: "RH & Administration",
    icon: "users",
    items: [
      { id: "users", icon: "users", title: "Gestion des utilisateurs", desc: "Gérer les comptes utilisateurs et leurs permissions", cta: "Accéder", badge: null },
      { id: "rh-ia", icon: "clock", title: "Suivi RH – Projets IA", desc: "Suivi des heures de travail et valorisation des projets IA", cta: "Accéder au suivi RH", badge: null },
      { id: "missions", icon: "briefcase", title: "Ordres de Mission", desc: "Suivi des ordres de mission et frais associés", cta: "Accéder aux missions", badge: "3" },
      { id: "santons", icon: "bell", title: "Planning Foire aux Santons", desc: "Gestion des bénévoles et planning de la Foire aux Santons", cta: "Accéder au planning", badge: null },
    ],
  },
  {
    group: "Accueil & Qualification de la donnée touristique",
    icon: "pin",
    items: [
      { id: "demandes", icon: "inbox", title: "Demandes utilisateurs", desc: "Traiter les demandes de modification des fiches", cta: "Voir les demandes", badge: "12" },
      { id: "fiches", icon: "eye", title: "Toutes les fiches", desc: "Données touristiques Apidae, mises à jour par l'agent IA ApidIA", cta: "Voir toutes les fiches", badge: "6134" },
      { id: "historique", icon: "history", title: "Historique des actions", desc: "Voir l'historique des actions des utilisateurs", cta: "Consulter l'historique", badge: null },
      { id: "kb", icon: "book", title: "ApidIA : Base de connaissances", desc: "Enrichissez les connaissances du conseiller en séjour virtuel", cta: "Gérer la base", badge: null },
      { id: "oto", icon: "chat", title: "OTO : Chat Telegram", desc: "Chat bidirectionnel avec les utilisateurs via Telegram", cta: "Accéder au chat OTO", badge: null },
    ],
  },
  {
    group: "Gestion de Projet Réseaux sociaux",
    icon: "share",
    items: [
      { id: "social", icon: "calendar", title: "Planning éditorial social média", desc: "Gérer le planning de publication sur les réseaux sociaux", cta: "Accéder au planning", badge: null },
    ],
  },
  {
    group: "Gestion de Projet Web",
    icon: "globe",
    items: [
      { id: "verdon", icon: "globe", title: "Intense Verdon Edito", desc: "Plateforme éditoriale Intense Verdon", cta: "Accéder à la plateforme", badge: null },
      { id: "stats", icon: "chart", title: "Statistiques Web", desc: "Statistiques et données des projets web", cta: "Voir les statistiques", badge: null },
      { id: "google", icon: "star", title: "E-réputation Google", desc: "Suivi des avis et notes Google par établissement", cta: "Voir les statistiques", badge: null },
      { id: "linking", icon: "link", title: "Linking", desc: "Suivi du linking par commune et vérification des sites", cta: "Accéder au linking", badge: null },
      { id: "widget", icon: "layers", title: "Widget Apidia", desc: "Créer des widgets d'intégration de fiches touristiques", cta: "Gérer les widgets", badge: null },
    ],
  },
];

export const ACTIVITY: ActivityItem[] = [
  { t: "20 avr. 14:01", who: "q.duroy@paysdemanosque.com", what: "s'est connecté(e)" },
  { t: "20 avr. 13:47", who: "q.duroy@paysdemanosque.com", what: "s'est connecté(e)" },
  { t: "20 avr. 13:47", who: "q.duroy@paysdemanosque.com", what: "s'est connecté(e)", meta: "{\"method\":\"direct\"}" },
  { t: "20 avr. 11:22", who: "l.martin@paysdemanosque.com", what: "a modifié la fiche", target: "Bastide de la Brillane" },
  { t: "20 avr. 10:08", who: "Agent ApidIA", what: "a synchronisé", target: "12 fiches APIDAE → Apidia" },
  { t: "20 avr. 09:44", who: "c.alberto@paysdemanosque.com", what: "a validé", target: "3 demandes utilisateurs" },
  { t: "19 avr. 17:30", who: "n.reverdy@paysdemanosque.com", what: "a créé", target: "Ordre de Mission OM-0428" },
  { t: "19 avr. 16:02", who: "OTO", what: "a répondu à", target: "Jean P. · Itinéraire Valensole" },
];

export const STATS_SITES: StatsSite[] = [
  { name: "Pays de Manosque", slug: "pays-de-manosque", users: 468368, pages: 395392, engagement: 20.4, duree: "0:20", new: 202410 },
  { name: "Gréoux-les-Bains",   slug: "greoux-les-bains",  users: 263106, pages: 178907, engagement: 69.8, duree: "1:48", new: 84234 },
  { name: "Manosque",           slug: "manosque",          users: 100984, pages: 78883,  engagement: 59.0, duree: "1:01", new: 40200 },
  { name: "Webcam",             slug: "webcam",            users: 30029,  pages: 17568,  engagement: 18.8, duree: "0:19", new: 11200 },
  { name: "VTT Provence Verdon",slug: "vtt-provence",      users: 21962,  pages: 17037,  engagement: 121.1,duree: "2:10", new: 9102 },
  { name: "Verdon Mystères",    slug: "verdon-mysteres",   users: 16345,  pages: 3342,   engagement: 18.8, duree: "1:39", new: 6800 },
  { name: "Verdon Croisières",  slug: "verdon-croisieres", users: 2954,   pages: 2722,   engagement: 5.6,  duree: "1:01", new: 1150 },
  { name: "Provence Verdon Affaires", slug: "pva",         users: 1651,   pages: 1170,   engagement: 58.7, duree: "0:56", new: 612 },
];

export const STATS_GLOBAL: StatsGlobal = {
  users: 905399,
  newUsers: 469932,
  pages: 695021,
  engagement: 52.4,
  pagesPerSession: 13.41,
  avgDuration: "1:14",
  retention: 48,
};

export const EVOLUTION: EvolutionPoint[] = [
  { m: "Jan", v: 12000 }, { m: "Fév", v: 14800 }, { m: "Mar", v: 16000 }, { m: "Avr", v: 18500 },
  { m: "Mai", v: 28000 }, { m: "Juin", v: 42000 }, { m: "Juil", v: 58000 }, { m: "Août", v: 62000 },
  { m: "Sep", v: 48000 }, { m: "Oct", v: 32000 }, { m: "Nov", v: 22000 }, { m: "Déc", v: 18000 },
  { m: "Jan", v: 15000 }, { m: "Fév", v: 13500 },
];

export const FICHES_KPI: FichesKpi = {
  total: 6134,
  published: 6128,
  desynced: 5108,
  alerts: 3196,
  apidae: 6134,
  apidia: 5671,
};

export const FICHES: Fiche[] = [
  { id: "FIC-10419", nom: "Marché Provençal du Samedi", type: "Événement", commune: "Manosque", statut: "publié", source: "APIDAE", maj: "il y a 2 h", score: 92 },
  { id: "FIC-10418", nom: "Bastide de la Brillane", type: "Hébergement", commune: "Manosque", statut: "à vérifier", source: "APIDAE", maj: "hier", score: 78 },
  { id: "FIC-10417", nom: "Parcours VTT Plateau de Valensole", type: "Activité", commune: "Valensole", statut: "publié", source: "Apidia", maj: "il y a 3 j", score: 88 },
  { id: "FIC-10416", nom: "Auberge de Haute-Provence", type: "Restaurant", commune: "Forcalquier", statut: "publié", source: "APIDAE", maj: "il y a 5 j", score: 95 },
  { id: "FIC-10415", nom: "Festival du Lubéron 2026", type: "Événement", commune: "Manosque", statut: "brouillon", source: "Apidia", maj: "il y a 1 j", score: 64 },
  { id: "FIC-10414", nom: "Congrès Provence Tech 2026", type: "Événement", commune: "Gréoux-les-Bains", statut: "à vérifier", source: "APIDAE", maj: "il y a 2 j", score: 70 },
  { id: "FIC-10413", nom: "Thermes de Gréoux", type: "Patrimoine", commune: "Gréoux-les-Bains", statut: "publié", source: "APIDAE", maj: "il y a 6 j", score: 97 },
  { id: "FIC-10412", nom: "Château de Manosque", type: "Patrimoine", commune: "Manosque", statut: "publié", source: "APIDAE", maj: "il y a 4 j", score: 94 },
  { id: "FIC-10411", nom: "Mas du Luberon", type: "Hébergement", commune: "Manosque", statut: "à vérifier", source: "Apidia", maj: "il y a 8 j", score: 72 },
  { id: "FIC-10410", nom: "Gorges du Verdon – Point Sublime", type: "Patrimoine", commune: "Moustiers", statut: "publié", source: "APIDAE", maj: "il y a 10 j", score: 96 },
  { id: "FIC-10409", nom: "Lavandes de Valensole", type: "Patrimoine", commune: "Valensole", statut: "publié", source: "APIDAE", maj: "aujourd'hui", score: 99 },
];

export const SYNC: SyncStatus = {
  en_cours: true,
  batch: 23,
  total_batches: 37,
  fiches_done: 4600,
  fiches_total: 4816,
  pct: 96,
  eta: "~2h restantes",
  depuis: "37h 9m",
};

export const MISSIONS: Mission[] = [
  { id: "OM-0428", objet: "Salon Mahana · Lyon", agent: "Camille Alberto", du: "18 avr.", au: "20 avr.", jours: 3, frais: 842, statut: "à valider", vehicule: "Train" },
  { id: "OM-0427", objet: "Visite terrain · Valensole", agent: "Lou Martin", du: "15 avr.", au: "15 avr.", jours: 1, frais: 62, statut: "validé", vehicule: "Service" },
  { id: "OM-0426", objet: "Congrès Office Tourisme 2026", agent: "Noé Reverdy", du: "10 avr.", au: "12 avr.", jours: 3, frais: 1240, statut: "validé", vehicule: "Train" },
  { id: "OM-0425", objet: "Formation APIDAE · Aix", agent: "Camille Alberto", du: "04 avr.", au: "04 avr.", jours: 1, frais: 180, statut: "validé", vehicule: "Personnel" },
  { id: "OM-0424", objet: "Accueil presse · Gorges du Verdon", agent: "Lou Martin", du: "28 mar.", au: "29 mar.", jours: 2, frais: 420, statut: "clôturé", vehicule: "Service" },
  { id: "OM-0423", objet: "Étude de marché hébergement", agent: "Noé Reverdy", du: "22 mar.", au: "22 mar.", jours: 1, frais: 95, statut: "refusé", vehicule: "Personnel" },
];

export const MISSIONS_KPI: MissionsKpi = {
  en_attente: 3,
  valides_mois: 8,
  frais_mois: 4280,
  jours_mois: 17,
};

export const DEMANDES: Demande[] = [
  { id: "DEM-0871", fiche: "Bastide de la Brillane", champ: "Horaires", from: "Martin D.", date: "il y a 2h" },
  { id: "DEM-0870", fiche: "Auberge Valensole", champ: "Tarifs", from: "Sophie P.", date: "il y a 5h" },
  { id: "DEM-0869", fiche: "Congrès Provence Tech", champ: "Description", from: "Jean R.", date: "hier" },
];
