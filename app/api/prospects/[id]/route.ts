import {
  getDb,
  fromRow,
  columns,
  values,
  apiError,
  checkOrigin,
} from "../../../../db";
import { validateInput } from "../../../../lib/model";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const db = await getDb();
    const row = await db
      .prepare("SELECT * FROM prospects WHERE id=?")
      .bind(id)
      .first();
    if (!row)
      return Response.json({ error: "Prospect introuvable." }, { status: 404 });
    const visits = await db
      .prepare(
        "SELECT id, prospect_id AS prospectId, visited_at AS visitedAt, note FROM visits WHERE prospect_id=? ORDER BY visited_at DESC",
      )
      .bind(id)
      .all();
    return Response.json(
      { prospect: fromRow(row), visits: visits.results },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(request: Request, context: Context) {
  const denied = checkOrigin(request);
  if (denied) return denied;
  let p;
  let payload: Record<string, unknown>;
  try {
    const raw = await request.json();
    p = validateInput(raw);
    payload = raw as Record<string, unknown>;
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
  try {
    const { id } = await context.params;
    const db = await getDb();
    if (!("motivations" in payload) || !("motivationNotes" in payload)) {
      const current = await db
        .prepare("SELECT * FROM prospects WHERE id=?")
        .bind(id)
        .first();
      if (!current)
        return Response.json(
          { error: "Prospect introuvable." },
          { status: 404 },
        );
      const existing = fromRow(current);
      if (!("motivations" in payload)) p.motivations = existing.motivations;
      if (!("motivationNotes" in payload))
        p.motivationNotes = existing.motivationNotes;
    }
    const row = await db
      .prepare(
        `UPDATE prospects SET ${columns.map((c) => c + "=?").join(",")},search_text=?,updated_at=? WHERE id=? RETURNING *`,
      )
      .bind(...values(p), new Date().toISOString(), id)
      .first();
    if (!row)
      return Response.json({ error: "Prospect introuvable." }, { status: 404 });
    return Response.json({ prospect: fromRow(row) });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: Request, context: Context) {
  const denied = checkOrigin(request);
  if (denied) return denied;
  try {
    const { id } = await context.params;
    const db = await getDb();
    const row = await db
      .prepare("DELETE FROM prospects WHERE id=? RETURNING id")
      .bind(id)
      .first();
    if (!row)
      return Response.json({ error: "Prospect introuvable." }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (e) {
    return apiError(e);
  }
}
