import { env } from "cloudflare:workers";
import {
  normalize,
  searchText,
  type ProspectInput,
  type Prospect,
} from "../lib/model";
export const fields = [
  "firstName",
  "lastName",
  "role",
  "company",
  "email",
  "phone",
  "needs",
  "notes",
  "priority",
  "status",
  "maturity",
  "timeline",
  "budget",
  "nextAction",
  "followUpDate",
] as const;
export const columns = [
  "first_name",
  "last_name",
  "role",
  "company",
  "email",
  "phone",
  "needs",
  "notes",
  "priority",
  "status",
  "maturity",
  "timeline",
  "budget",
  "next_action",
  "follow_up_date",
];
let ready: Promise<unknown> | undefined;
export async function getDb() {
  const db = env.DB;
  if (!db) throw new Error("La base de données est indisponible.");
  // Same schema as the committed Drizzle migration, also initializes local previews.
  if (!ready)
    ready = db
      .batch([
        db.prepare(
          `CREATE TABLE IF NOT EXISTS prospects (id TEXT PRIMARY KEY NOT NULL, first_name TEXT NOT NULL, last_name TEXT NOT NULL, role TEXT NOT NULL, company TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, needs TEXT NOT NULL, notes TEXT NOT NULL, priority TEXT NOT NULL, status TEXT NOT NULL, maturity TEXT NOT NULL, timeline TEXT NOT NULL, budget TEXT NOT NULL, next_action TEXT NOT NULL, follow_up_date TEXT NOT NULL, search_text TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_visit_at TEXT NOT NULL, visit_count INTEGER NOT NULL DEFAULT 1)`,
        ),
        db.prepare(
          `CREATE TABLE IF NOT EXISTS visits (id TEXT PRIMARY KEY NOT NULL, prospect_id TEXT NOT NULL REFERENCES prospects(id) ON DELETE CASCADE, visited_at TEXT NOT NULL, note TEXT NOT NULL)`,
        ),
        db.prepare(
          "CREATE INDEX IF NOT EXISTS idx_prospects_last_visit ON prospects(last_visit_at)",
        ),
        db.prepare(
          "CREATE INDEX IF NOT EXISTS idx_prospects_status_last_visit ON prospects(status,last_visit_at)",
        ),
        db.prepare(
          "CREATE INDEX IF NOT EXISTS idx_prospects_priority_last_visit ON prospects(priority,last_visit_at)",
        ),
        db.prepare(
          "CREATE INDEX IF NOT EXISTS idx_visits_prospect_date ON visits(prospect_id,visited_at)",
        ),
        db.prepare("PRAGMA optimize"),
      ])
      .catch((e: unknown) => {
        ready = undefined;
        throw e;
      });
  await ready;
  return db;
}
export function values(p: ProspectInput) {
  return [
    ...fields.map((f) => (f === "needs" ? JSON.stringify(p.needs) : p[f])),
    searchText(p),
  ];
}
export function fromRow(row: Record<string, unknown>): Prospect {
  const result: Record<string, unknown> = {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastVisitAt: row.last_visit_at,
    visitCount: row.visit_count,
  };
  fields.forEach((f, i) => {
    result[f] = f === "needs" ? JSON.parse(String(row.needs)) : row[columns[i]];
  });
  return result as Prospect;
}
export function whereFilters(params: URLSearchParams) {
  const clauses: string[] = [];
  const bindings: string[] = [];
  const query = normalize((params.get("q") ?? "").slice(0, 500)).trim();
  for (const term of query.split(/\s+/).filter(Boolean)) {
    clauses.push("search_text LIKE ? ESCAPE '\\'");
    bindings.push("%" + term.replace(/[\\%_]/g, "\\$&") + "%");
  }
  for (const field of ["status", "priority"])
    if (params.get(field)) {
      clauses.push(field + " = ?");
      bindings.push(params.get(field)!);
    }
  const need = params.get("need");
  if (need) {
    clauses.push("needs LIKE ? ESCAPE '\\'");
    bindings.push("%" + JSON.stringify(need).replace(/[\\%_]/g, "\\$&") + "%");
  }
  return {
    sql: clauses.length ? " WHERE " + clauses.join(" AND ") : "",
    bindings,
  };
}
export function apiError(error: unknown) {
  console.error("Prospect API error:", error);
  return Response.json(
    { error: "Impossible d’accéder aux prospects. Réessayez dans un instant." },
    { status: 500 },
  );
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: "Origine non autorisée." }, { status: 403 });
}
