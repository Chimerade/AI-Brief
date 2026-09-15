import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyProspect,
  validateInput,
  normalize,
  searchText,
  csvCell,
} from "../lib/model.ts";
test("Enregistrement rapide : une société seule suffit", () => {
  const p = validateInput({
    ...emptyProspect(),
    company: "  Société Énergie  ",
  });
  assert.equal(p.company, "Société Énergie");
  assert.equal(p.priority, "Moyenne");
});
test("Validation des contacts et de la qualification", () => {
  for (const invalid of [
    null,
    {},
    emptyProspect(),
    { ...emptyProspect(), firstName: "Jean", email: "incorrect" },
    { ...emptyProspect(), firstName: "Jean", priority: "Inconnue" },
    { ...emptyProspect(), firstName: "Jean", needs: ["Inconnu"] },
    { ...emptyProspect(), firstName: "Jean", followUpDate: "2026-02-30" },
    { ...emptyProspect(), firstName: "Jean", notes: "x".repeat(10001) },
  ])
    assert.throws(() => validateInput(invalid));
});
test("Recherche insensible aux accents, incluant besoins et notes", () => {
  assert.equal(normalize("ÉLÈNE À PARIS"), "elene a paris");
  assert.match(
    searchText({
      ...emptyProspect(),
      notes: "Résumé métier",
      needs: ["Création de contenu"],
    }),
    /resume metier creation de contenu/,
  );
});
test("CSV : échappement, multilignes et protection contre les formules", () => {
  assert.equal(csvCell('Dit "bonjour"\nSuite'), '"Dit ""bonjour""\nSuite"');
  assert.equal(csvCell("=1+1"), '"\'=1+1"');
  assert.equal(csvCell("+33612345678"), '"\'+33612345678"');
  assert.equal(csvCell(" @SUM(A1)"), '"\' @SUM(A1)"');
});
