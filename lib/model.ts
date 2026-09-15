export const MOTIVATIONS = [
  "Gagner du temps / productivité",
  "Réduire les coûts",
  "Améliorer la qualité / fiabilité",
  "Soulager les équipes",
  "Développer le chiffre d’affaires",
  "Améliorer le service client",
  "Rattraper la concurrence",
  "Se différencier / innover",
  "Suivre le rythme des évolutions",
  "Répondre à une demande de la direction",
  "Comprendre ce que l’IA peut apporter",
  "Autre",
] as const;
export const NEEDS = [
  "Automatisation",
  "Assistant / chatbot",
  "Analyse de données",
  "Création de contenu",
  "Recherche documentaire",
  "Vision / images",
  "Formation IA",
  "Conseil / cadrage",
  "Autre",
] as const;
export const STATUSES = [
  "À qualifier",
  "À recontacter",
  "RDV planifié",
  "En discussion",
  "Clôturé",
] as const;
export const PRIORITIES = ["Haute", "Moyenne", "Basse"] as const;
export const MATURITIES = [
  "À découvrir",
  "En exploration",
  "En expérimentation",
  "Déjà en production",
] as const;
export const TIMELINES = [
  "À préciser",
  "Immédiat",
  "1 à 3 mois",
  "3 à 6 mois",
  "Plus de 6 mois",
] as const;
export const BUDGETS = [
  "À préciser",
  "Moins de 5 k€",
  "5 à 20 k€",
  "20 à 50 k€",
  "Plus de 50 k€",
] as const;
export type ProspectInput = {
  firstName: string;
  lastName: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  motivations: string[];
  motivationNotes: string;
  needs: string[];
  notes: string;
  priority: string;
  status: string;
  maturity: string;
  timeline: string;
  budget: string;
  nextAction: string;
  followUpDate: string;
};
export type Visit = {
  id: string;
  prospectId: string;
  visitedAt: string;
  note: string;
};
export type Prospect = ProspectInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
  lastVisitAt: string;
  visitCount: number;
};
export const emptyProspect = (): ProspectInput => ({
  firstName: "",
  lastName: "",
  role: "",
  company: "",
  email: "",
  phone: "",
  motivations: [],
  motivationNotes: "",
  needs: [],
  notes: "",
  priority: "Moyenne",
  status: "À qualifier",
  maturity: "À découvrir",
  timeline: "À préciser",
  budget: "À préciser",
  nextAction: "",
  followUpDate: "",
});
export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
export function searchText(p: ProspectInput) {
  return normalize(
    [
      p.firstName,
      p.lastName,
      p.company,
      p.role,
      p.email,
      p.phone,
      p.notes,
      ...p.needs,
      p.nextAction,
      ...p.motivations,
      p.motivationNotes,
    ].join(" "),
  );
}
export function validateInput(raw: unknown): ProspectInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Le formulaire est invalide.");
  const source = raw as Record<string, unknown>;
  const result = emptyProspect();
  for (const key of Object.keys(result) as (keyof ProspectInput)[]) {
    if (key === "needs" || key === "motivations") continue;
    if (key === "motivationNotes" && source[key] === undefined) continue;
    if (typeof source[key] !== "string")
      throw new Error("Champ invalide : " + key);
    const value = (source[key] as string).trim();
    if (
      value.length >
      (key === "notes" || key === "motivationNotes"
        ? 10000
        : key === "nextAction"
          ? 2000
          : 250)
    )
      throw new Error("Le champ " + key + " est trop long.");
    result[key] = value;
  }
  if (!result.firstName && !result.lastName && !result.company)
    throw new Error("Indiquez au moins un prénom, un nom ou une société.");
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email))
    throw new Error("L’adresse email est invalide.");
  if (
    result.followUpDate &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(result.followUpDate) ||
      !Number.isFinite(Date.parse(result.followUpDate)) ||
      new Date(result.followUpDate).toISOString().slice(0, 10) !==
        result.followUpDate)
  )
    throw new Error("La date de relance est invalide.");
  const enums = {
    status: STATUSES,
    priority: PRIORITIES,
    maturity: MATURITIES,
    timeline: TIMELINES,
    budget: BUDGETS,
  };
  for (const [key, values] of Object.entries(enums))
    if (
      !(values as readonly string[]).includes(result[key as keyof typeof enums])
    )
      throw new Error("Choix invalide : " + key);
  if (
    !Array.isArray(source.needs) ||
    source.needs.length > NEEDS.length ||
    source.needs.some(
      (n) => typeof n !== "string" || !(NEEDS as readonly string[]).includes(n),
    )
  )
    throw new Error("Les besoins sélectionnés sont invalides.");
  result.needs = [...new Set(source.needs as string[])];
  const motivations =
    source.motivations === undefined ? [] : source.motivations;
  if (
    !Array.isArray(motivations) ||
    motivations.length > MOTIVATIONS.length ||
    motivations.some(
      (n) =>
        typeof n !== "string" ||
        !(MOTIVATIONS as readonly string[]).includes(n),
    )
  )
    throw new Error("Les motivations sélectionnées sont invalides.");
  result.motivations = [...new Set(motivations as string[])];
  return result;
}
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
