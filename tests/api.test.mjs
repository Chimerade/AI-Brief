import test from "node:test";
import assert from "node:assert/strict";
import { emptyProspect } from "../lib/model.ts";
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
async function request(path, method = "GET", body, headers = {}) {
  return fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
test("CRUD SQLite, recherche, historique, filtres et export", async () => {
  let id;
  try {
    const invalid = await request("/api/prospects", "POST", emptyProspect());
    assert.equal(invalid.status, 400);
    const forbidden = await request(
      "/api/prospects",
      "POST",
      { ...emptyProspect(), company: "Refusé" },
      { Origin: "https://foreign.example" },
    );
    assert.equal(forbidden.status, 403);
    const p = {
      ...emptyProspect(),
      firstName: "Élodie",
      lastName: "Test-Salon-" + Date.now(),
      company: "Entreprise de test",
      email: "test@example.invalid",
      phone: "+33612345678",
      needs: ["Automatisation", "Analyse de données"],
      motivations: [
        "Gagner du temps / productivité",
        "Rattraper la concurrence",
      ],
      motivationNotes: "Éviter la surcharge des équipes.",
      notes: "Réduire les saisies manuelles\nÉtudier un pilote.",
      priority: "Haute",
      status: "À recontacter",
      nextAction: "Organiser une démonstration",
    };
    const created = await request("/api/prospects", "POST", p);
    assert.equal(created.status, 201, await created.clone().text());
    const result = await created.json();
    id = result.prospect.id;
    const firstTime = result.prospect.createdAt;
    assert.equal(result.prospect.visitCount, 1);
    const read = await (await request("/api/prospects/" + id)).json();
    assert.equal(read.prospect.firstName, "Élodie");
    assert.equal(read.visits.length, 1);
    assert.deepEqual(read.prospect.motivations, p.motivations);
    assert.equal(read.prospect.motivationNotes, p.motivationNotes);
    const byMotivation = await (
      await request(
        "/api/prospects?q=" +
          encodeURIComponent(p.lastName) +
          "&motivation=" +
          encodeURIComponent("Rattraper la concurrence"),
      )
    ).json();
    assert.equal(byMotivation.total, 1);
    const byWords = await (
      await request(
        "/api/prospects?q=" +
          encodeURIComponent(p.lastName + " eviter surcharge"),
      )
    ).json();
    assert.equal(byWords.total, 1);
    const mismatch = await (
      await request(
        "/api/prospects?q=" +
          encodeURIComponent(p.lastName) +
          "&motivation=" +
          encodeURIComponent("Réduire les coûts"),
      )
    ).json();
    assert.equal(mismatch.total, 0);
    let list = await (
      await request(
        "/api/prospects?q=" +
          encodeURIComponent("elodie " + p.lastName) +
          "&priority=Haute&status=" +
          encodeURIComponent("À recontacter"),
      )
    ).json();
    assert.equal(list.total, 1);
    assert.equal(list.prospects[0].id, id);
    list = await (
      await request(
        "/api/prospects?q=" +
          encodeURIComponent(p.lastName) +
          "&need=" +
          encodeURIComponent("Analyse de données"),
      )
    ).json();
    assert.equal(list.total, 1);
    list = await (
      await request("/api/prospects?q=" + encodeURIComponent("' OR 1=1 --"))
    ).json();
    assert.equal(list.total, 0);
    list = await (await request("/api/prospects?q=%25")).json();
    assert.equal(list.total, 0);
    const edited = await request("/api/prospects/" + id, "PUT", {
      ...p,
      company: "Société modifiée",
      status: "RDV planifié",
    });
    assert.equal(edited.status, 200);
    const updated = await edited.json();
    assert.equal(updated.prospect.createdAt, firstTime);
    assert.equal(updated.prospect.lastVisitAt, firstTime);
    assert.equal(updated.prospect.company, "Société modifiée");
    const noSolution = await request("/api/prospects/" + id, "PUT", {
      ...p,
      needs: [],
    });
    assert.equal(noSolution.status, 200);
    assert.deepEqual((await noSolution.json()).prospect.needs, []);
    const legacy = { ...p, company: "Société modifiée" };
    delete legacy.motivations;
    delete legacy.motivationNotes;
    const fromOldTab = await request("/api/prospects/" + id, "PUT", legacy);
    assert.equal(fromOldTab.status, 200);
    const preserved = (await fromOldTab.json()).prospect;
    assert.deepEqual(preserved.motivations, p.motivations);
    assert.equal(preserved.motivationNotes, p.motivationNotes);
    const added = await request("/api/prospects/" + id + "/visits", "POST", {
      note: "Second passage : démonstration validée.",
    });
    assert.equal(added.status, 201);
    const after = await (await request("/api/prospects/" + id)).json();
    assert.equal(after.visits.length, 2);
    assert.equal(after.prospect.visitCount, 2);
    assert.equal(
      after.visits[0].note,
      "Second passage : démonstration validée.",
    );
    assert.equal(after.prospect.lastVisitAt, after.visits[0].visitedAt);
    const csv = await request(
      "/api/export?q=" +
        encodeURIComponent(p.lastName) +
        "&motivation=" +
        encodeURIComponent("Rattraper la concurrence"),
    );
    assert.equal(csv.status, 200);
    assert.match(csv.headers.get("content-type"), /text\/csv/);
    const text = await csv.text();
    assert.match(text, /Société modifiée/);
    assert.match(text, /'\+33612345678/);
    assert.match(text, /Nombre de passages/);
    assert.match(text, /Motivations \/ enjeux/);
    assert.match(text, /Rattraper la concurrence/);
    assert.match(text, /Éviter la surcharge des équipes/);
    const clear = await request("/api/prospects/" + id, "PUT", {
      ...p,
      motivations: [],
      motivationNotes: "",
    });
    assert.equal(clear.status, 200);
    const cleared = (await clear.json()).prospect;
    assert.deepEqual(cleared.motivations, []);
    assert.equal(cleared.motivationNotes, "");
    const deleted = await request("/api/prospects/" + id, "DELETE");
    assert.equal(deleted.status, 204);
    assert.equal((await request("/api/prospects/" + id)).status, 404);
    assert.equal(
      (
        await request("/api/prospects/" + id + "/visits", "POST", {
          note: "Impossible",
        })
      ).status,
      404,
    );
    id = null;
  } finally {
    if (id) await request("/api/prospects/" + id, "DELETE");
  }
});
