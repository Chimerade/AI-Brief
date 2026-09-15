import { getDb, apiError, checkOrigin } from "../../../../../db";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = checkOrigin(request);
  if (denied) return denied;
  let note;
  try {
    const body = (await request.json()) as { note?: unknown } | null;
    if (!body || typeof body.note !== "string" || body.note.length > 2000)
      throw new Error();
    note = body.note.trim();
  } catch {
    return Response.json(
      { error: "Note de passage invalide (2 000 caractères maximum)." },
      { status: 400 },
    );
  }
  try {
    const { id } = await context.params;
    const db = await getDb();
    const at = new Date().toISOString();
    const visitId = crypto.randomUUID();
    const results = await db.batch([
      db
        .prepare(
          "INSERT INTO visits (id,prospect_id,visited_at,note) SELECT ?,id,?,? FROM prospects WHERE id=?",
        )
        .bind(visitId, at, note, id),
      db
        .prepare(
          "UPDATE prospects SET last_visit_at=?,updated_at=?,visit_count=visit_count+1 WHERE id=?",
        )
        .bind(at, at, id),
    ]);
    if (!results[0].meta.changes)
      return Response.json({ error: "Prospect introuvable." }, { status: 404 });
    return Response.json(
      { visit: { id: visitId, prospectId: id, visitedAt: at, note } },
      { status: 201 },
    );
  } catch (e) {
    return apiError(e);
  }
}
