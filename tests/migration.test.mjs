import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
test("La migration conserve les fiches et passages existants sans inventer de motivations", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("PRAGMA foreign_keys = ON");
    db.exec(
      readFileSync(
        new URL("../drizzle/0000_demonic_silver_fox.sql", import.meta.url),
        "utf8",
      ),
    );
    const columns = db
      .prepare("PRAGMA table_info(prospects)")
      .all()
      .map((c) => c.name);
    const old = Object.fromEntries(columns.map((c) => [c, ""]));
    Object.assign(old, {
      id: "legacy",
      company: "Entreprise existante",
      needs: '["Automatisation"]',
      notes: "Échange à conserver",
      visit_count: 1,
      created_at: "2026-09-15T08:00:00Z",
      last_visit_at: "2026-09-15T08:00:00Z",
    });
    db.prepare(
      `INSERT INTO prospects (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`,
    ).run(...columns.map((c) => old[c]));
    db.prepare("INSERT INTO visits VALUES (?, ?, ?, ?)").run(
      "visit-legacy",
      "legacy",
      old.created_at,
      "Premier échange",
    );
    db.exec(
      readFileSync(
        new URL("../drizzle/0001_jittery_menace.sql", import.meta.url),
        "utf8",
      ),
    );
    const migrated = db
      .prepare("SELECT * FROM prospects WHERE id=?")
      .get("legacy");
    for (const c of columns) assert.equal(migrated[c], old[c]);
    assert.equal(migrated.motivations, "[]");
    assert.equal(migrated.motivation_notes, "");
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM visits").get().n, 1);
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    db.close();
  }
});
