import { getDb, fromRow, whereFilters, apiError } from "../../../db";
import { csvCell } from "../../../lib/model";
export async function GET(request: Request) {
  try {
    const db = await getDb();
    const { sql, bindings } = whereFilters(new URL(request.url).searchParams);
    const rows = await db
      .prepare("SELECT * FROM prospects" + sql + " ORDER BY last_visit_at DESC")
      .bind(...bindings)
      .all();
    const header = [
      "Prénom",
      "Nom",
      "Fonction",
      "Société",
      "Email",
      "Téléphone",
      "Besoins IA",
      "Notes",
      "Priorité",
      "Statut",
      "Maturité",
      "Échéance projet",
      "Budget",
      "Prochaine action",
      "Date de relance",
      "Premier passage (UTC)",
      "Dernier passage (UTC)",
      "Nombre de passages",
    ];
    const lines = rows.results
      .map(fromRow)
      .map((p) =>
        [
          p.firstName,
          p.lastName,
          p.role,
          p.company,
          p.email,
          p.phone,
          p.needs.join(" | "),
          p.notes,
          p.priority,
          p.status,
          p.maturity,
          p.timeline,
          p.budget,
          p.nextAction,
          p.followUpDate,
          p.createdAt,
          p.lastVisitAt,
          p.visitCount,
        ]
          .map(csvCell)
          .join(";"),
      );
    return new Response(
      "\uFEFF" + [header.map(csvCell).join(";"), ...lines].join("\r\n"),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="prospects-' +
            new Date().toISOString().slice(0, 10) +
            '.csv"',
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (e) {
    return apiError(e);
  }
}
