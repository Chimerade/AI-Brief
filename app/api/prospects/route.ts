import {
  getDb,
  fromRow,
  whereFilters,
  fields,
  columns,
  values,
  apiError,
  checkOrigin,
} from "../../../db";
import { validateInput } from "../../../lib/model";
export async function GET(request: Request) {
  try {
    const db = await getDb();
    const params = new URL(request.url).searchParams;
    const { sql, bindings } = whereFilters(params);
    const page = Math.max(1, Math.min(100000, Number(params.get("page")) || 1));
    const day = params.get("day") || new Date().toISOString().slice(0, 10);
    const start = params.get("start") || day + "T00:00:00.000Z";
    const end = params.get("end") || day + "T23:59:59.999Z";
    const [rows, count, stats] = await db.batch<Record<string, unknown>>([
      db
        .prepare(
          "SELECT * FROM prospects" +
            sql +
            " ORDER BY last_visit_at DESC, id DESC LIMIT 30 OFFSET ?",
        )
        .bind(...bindings, (page - 1) * 30),
      db
        .prepare("SELECT COUNT(*) AS total FROM prospects" + sql)
        .bind(...bindings),
      db
        .prepare(
          "SELECT COUNT(*) AS total, COALESCE(SUM(priority='Haute'),0) AS hot, COALESCE(SUM(status='À recontacter'),0) AS followUp, (SELECT COUNT(*) FROM visits WHERE visited_at>=? AND visited_at<=?) AS today FROM prospects",
        )
        .bind(start, end),
    ]);
    return Response.json(
      {
        prospects: rows.results.map(fromRow),
        total: count.results[0].total,
        stats: stats.results[0],
        page,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  const denied = checkOrigin(request);
  if (denied) return denied;
  let p;
  try {
    p = validateInput(await request.json());
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
  try {
    const db = await getDb();
    const id = crypto.randomUUID();
    const at = new Date().toISOString();
    await db.batch<Record<string, unknown>>([
      db
        .prepare(
          `INSERT INTO prospects (id,${columns.join(",")},search_text,created_at,updated_at,last_visit_at,visit_count) VALUES (${Array(
            fields.length + 5,
          )
            .fill("?")
            .join(",")},1)`,
        )
        .bind(id, ...values(p), at, at, at),
      db
        .prepare(
          "INSERT INTO visits (id,prospect_id,visited_at,note) VALUES (?,?,?,?)",
        )
        .bind(crypto.randomUUID(), id, at, "Premier échange"),
    ]);
    return Response.json(
      {
        prospect: {
          ...p,
          id,
          createdAt: at,
          updatedAt: at,
          lastVisitAt: at,
          visitCount: 1,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    return apiError(e);
  }
}
