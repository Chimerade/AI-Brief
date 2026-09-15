"use client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  NEEDS,
  STATUSES,
  PRIORITIES,
  MATURITIES,
  TIMELINES,
  BUDGETS,
  emptyProspect,
  type Prospect,
  type ProspectInput,
  type Visit,
} from "../lib/model";

type Listing = {
  prospects: Prospect[];
  total: number;
  stats: { total: number; today: number; hot: number; followUp: number };
};
const blank: Listing = {
  prospects: [],
  total: 0,
  stats: { total: 0, today: 0, hot: 0, followUp: 0 },
};
function dateTime(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function dateOnly(value: string) {
  return new Date(value + "T12:00:00").toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}
function fullName(p: ProspectInput) {
  return [p.firstName, p.lastName].filter(Boolean).join(" ") || p.company;
}
function initials(p: ProspectInput) {
  return (
    p.firstName.charAt(0) + p.lastName.charAt(0) || p.company.slice(0, 2)
  ).toUpperCase();
}
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    let message = "Connexion impossible. Votre saisie est conservée.";
    try {
      const payload = (await response.json()) as { error?: string };
      message = payload.error || message;
    } catch {
      /* Keep the connection error when the response is not JSON. */
    }
    throw new Error(message);
  }
  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>);
}

export default function Home() {
  const [data, setData] = useState<Listing>(blank);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [need, setNeed] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<Prospect | "new" | null>(null);
  const [detail, setDetail] = useState<Prospect | null>(null);
  const [notice, setNotice] = useState("");
  const [exporting, setExporting] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => {
    function shortcut(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        search.current?.focus();
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  const params = useCallback(
    () => new URLSearchParams({ q: debounced, status, priority, need }),
    [debounced, status, priority, need],
  );
  useEffect(() => {
    const controller = new AbortController();
    const p = params();
    p.set("page", String(page));
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setMilliseconds(-1);
    p.set("start", start.toISOString());
    p.set("end", end.toISOString());
    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await api<Listing>("/api/prospects?" + p, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setData(result);
          if (page > 1 && !result.prospects.length) setPage(page - 1);
        }
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Chargement impossible.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [params, page, revision]);
  function filter(setter: (v: string) => void, value: string) {
    setter(value);
    setPage(1);
  }
  function nav(mode: "all" | "follow" | "hot") {
    setStatus(mode === "follow" ? "À recontacter" : "");
    setPriority(mode === "hot" ? "Haute" : "");
    setNeed("");
    setQuery("");
    setDebounced("");
    setPage(1);
  }
  function refreshed(message: string) {
    setRevision((v) => v + 1);
    setNotice(message);
  }
  async function exportCsv() {
    setExporting(true);
    setError("");
    try {
      const response = await fetch("/api/export?" + params());
      if (!response.ok) throw new Error("L’export a échoué. Réessayez.");
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download =
        "prospects-" + new Date().toISOString().slice(0, 10) + ".csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export impossible.");
    } finally {
      setExporting(false);
    }
  }
  const active =
    priority === "Haute"
      ? "hot"
      : status === "À recontacter"
        ? "follow"
        : "all";
  const filtered = !!(query || status || priority || need);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Rencontre, accueil">
          <span className="brand-mark">r.</span>rencontre
          <span className="brand-dot">.</span>
        </Link>
        <div className="workspace-label">VOTRE ESPACE SALON</div>
        <div className="event-card">
          <span className="event-icon">↗</span>
          <div>
            <strong>Rencontres & IA</strong>
            <small>Chaque échange compte</small>
          </div>
          <span className="live-dot" />
        </div>
        <nav aria-label="Vues des prospects">
          <button
            onClick={() => nav("all")}
            className={"nav-item " + (active === "all" ? "active" : "")}
            aria-current={active === "all" ? "page" : undefined}
          >
            <span>▦</span>Tous les prospects <b>{data.stats.total}</b>
          </button>
          <button
            onClick={() => nav("follow")}
            className={"nav-item " + (active === "follow" ? "active" : "")}
            aria-current={active === "follow" ? "page" : undefined}
          >
            <span>◷</span>À recontacter <b>{data.stats.followUp}</b>
          </button>
          <button
            onClick={() => nav("hot")}
            className={"nav-item " + (active === "hot" ? "active" : "")}
            aria-current={active === "hot" ? "page" : undefined}
          >
            <span>☆</span>Prioritaires <b>{data.stats.hot}</b>
          </button>
        </nav>
        <div className="sidebar-note">
          <span className="note-star">✳</span>
          <strong>
            Moins de saisie.
            <br />
            Plus de rencontres.
          </strong>
          <p>
            Capturez l’essentiel maintenant.
            <br />
            Construisez la suite après le salon.
          </p>
        </div>
        <div className="sidebar-footer">
          <span className="avatar">EQ</span>
          <div>
            <strong>Équipe salon</strong>
            <small>Espace de prospection</small>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>
            ESPACE DE PROSPECTION <span className="crumb">/</span>{" "}
            <strong>Prospects</strong>
          </span>
          <span className="live-label">
            <i />
            Votre carnet de rencontres
          </span>
        </header>
        <div className="page-content">
          <div className="heading-row">
            <div>
              <p className="eyebrow">UNE CONVERSATION, UNE OPPORTUNITÉ</p>
              <h1>Vos rencontres, bien en tête.</h1>
              <p className="subtitle">
                Gardez le fil de chaque échange et révélez les besoins en IA.
              </p>
            </div>
            <button className="primary" onClick={() => setEditor("new")}>
              <span className="plus">＋</span>Nouveau prospect
            </button>
          </div>
          <section className="stats" aria-label="Chiffres du salon">
            <div>
              <span>Prospects enregistrés</span>
              <strong>
                {data.stats.total}
                <small>rencontres à cultiver</small>
              </strong>
            </div>
            <div>
              <span>Passages aujourd’hui</span>
              <strong>
                {data.stats.today}
                <small>au rythme du salon</small>
              </strong>
            </div>
            <div>
              <span>
                Priorité haute <i className="stat-dot" />
              </span>
              <strong>
                {data.stats.hot}
                <small>opportunités à saisir</small>
              </strong>
            </div>
            <div>
              <span>À recontacter</span>
              <strong>
                {data.stats.followUp}
                <small>pour donner suite</small>
              </strong>
            </div>
          </section>
          <section className="prospect-panel" aria-label="Liste des prospects">
            <div className="panel-title">
              <div>
                <h2>
                  Le carnet de rencontres <span>{data.total}</span>
                </h2>
                <p>Les bonnes informations, au bon moment.</p>
              </div>
              <button
                className="secondary"
                onClick={exportCsv}
                disabled={!data.total || exporting}
              >
                {exporting ? "Export…" : "↓ Exporter"}
              </button>
            </div>
            <div className="filterbar">
              <div className="search">
                <span aria-hidden="true">⌕</span>
                <input
                  ref={search}
                  value={query}
                  onChange={(e) => filter(setQuery, e.target.value)}
                  aria-label="Rechercher un prospect"
                  placeholder="Rechercher un nom, une société, un besoin…"
                />
                <kbd>⌘ K</kbd>
              </div>
              <select
                value={status}
                onChange={(e) => filter(setStatus, e.target.value)}
                aria-label="Filtrer par statut"
              >
                <option value="">Tous les statuts</option>
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select
                value={priority}
                onChange={(e) => filter(setPriority, e.target.value)}
                aria-label="Filtrer par priorité"
              >
                <option value="">Toutes les priorités</option>
                {PRIORITIES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select
                value={need}
                onChange={(e) => filter(setNeed, e.target.value)}
                aria-label="Filtrer par besoin IA"
              >
                <option value="">Tous les besoins IA</option>
                {NEEDS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            {error && (
              <div className="error-banner" role="alert">
                {error}
                <button onClick={() => setRevision((v) => v + 1)}>
                  Réessayer
                </button>
              </div>
            )}
            <div
              className={"table-wrap " + (loading ? "is-loading" : "")}
              aria-busy={loading}
            >
              <table>
                <thead>
                  <tr>
                    <th>INTERLOCUTEUR</th>
                    <th>SOCIÉTÉ</th>
                    <th>BESOINS IA</th>
                    <th>PRIORITÉ</th>
                    <th>STATUT</th>
                    <th>DERNIER PASSAGE</th>
                  </tr>
                </thead>
                <tbody>
                  {data.prospects.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <button
                          className="contact-button"
                          onClick={() => setDetail(p)}
                        >
                          <span
                            className={
                              "avatar color-" + (p.id.charCodeAt(0) % 4)
                            }
                          >
                            {initials(p)}
                          </span>
                          <span>
                            <strong>{fullName(p)}</strong>
                            <small>
                              {p.role || p.email || "Fonction à préciser"}
                            </small>
                          </span>
                        </button>
                      </td>
                      <td>
                        <strong className="company">{p.company || "—"}</strong>
                      </td>
                      <td>
                        <div className="tags">
                          {p.needs.slice(0, 2).map((n) => (
                            <span key={n} className="tag">
                              {n}
                            </span>
                          ))}
                          {p.needs.length > 2 && (
                            <span
                              className="tag"
                              title={p.needs.slice(2).join(", ")}
                            >
                              +{p.needs.length - 2}
                            </span>
                          )}
                          {!p.needs.length && (
                            <span className="muted">À explorer</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={"priority priority-" + p.priority}>
                          <i />
                          {p.priority}
                        </span>
                      </td>
                      <td>
                        <span
                          className={
                            "status status-" +
                            STATUSES.indexOf(
                              p.status as (typeof STATUSES)[number],
                            )
                          }
                        >
                          {p.status}
                        </span>
                        {p.followUpDate && (
                          <small className="follow-date">
                            Relance : {dateOnly(p.followUpDate)}
                          </small>
                        )}
                      </td>
                      <td>
                        <button
                          className="date-button"
                          onClick={() => setDetail(p)}
                        >
                          <time dateTime={p.lastVisitAt}>
                            {dateTime(p.lastVisitAt)}
                          </time>
                          <small>
                            {p.visitCount} passage{p.visitCount > 1 ? "s" : ""}{" "}
                            <span>↗</span>
                          </small>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.prospects.length &&
              !error &&
              (loading ? (
                <div className="loading-message" role="status">
                  Chargement de votre carnet…
                </div>
              ) : (
                <div className="empty">
                  <div className="empty-art">
                    <span className="mini-card">
                      Bonjour.
                      <br />
                      <i />
                      <i />
                    </span>
                    <span className="spark">✳</span>
                  </div>
                  <p className="eyebrow">
                    {filtered
                      ? "UN AUTRE MOT, UNE AUTRE PISTE"
                      : "FAITES PLACE AUX RENCONTRES"}
                  </p>
                  <h2>
                    {filtered ? (
                      "Aucun prospect ne correspond."
                    ) : (
                      <>
                        Votre prochain prospect
                        <br />
                        commence par un bon échange.
                      </>
                    )}
                  </h2>
                  <p>
                    {filtered ? (
                      "Essayez un autre terme ou retirez les filtres."
                    ) : (
                      <>
                        Un nom, un besoin, quelques notes.
                        <br />
                        Gardez l’essentiel en moins d’une minute.
                      </>
                    )}
                  </p>
                  <button
                    className="primary"
                    onClick={() => (filtered ? nav("all") : setEditor("new"))}
                  >
                    {filtered
                      ? "Réinitialiser les filtres"
                      : "＋ Enregistrer ma première rencontre"}
                  </button>
                </div>
              ))}
            <footer className="table-footer">
              <span>
                {data.total
                  ? `${(page - 1) * 30 + 1}–${Math.min(page * 30, data.total)} sur ${data.total} prospect${data.total > 1 ? "s" : ""}`
                  : "Aucun prospect pour le moment"}
                {filtered && (
                  <button
                    className="text-button reset"
                    onClick={() => nav("all")}
                  >
                    Effacer les filtres
                  </button>
                )}
              </span>
              {data.total > 30 ? (
                <div className="pagination">
                  <button
                    disabled={page === 1 || loading}
                    onClick={() => setPage(page - 1)}
                    aria-label="Page précédente"
                  >
                    ←
                  </button>
                  <span>
                    Page {page} / {Math.ceil(data.total / 30)}
                  </span>
                  <button
                    disabled={page * 30 >= data.total || loading}
                    onClick={() => setPage(page + 1)}
                    aria-label="Page suivante"
                  >
                    →
                  </button>
                </div>
              ) : (
                <span>Chaque passage est horodaté automatiquement</span>
              )}
            </footer>
          </section>
          <div className="bottom-note">
            <span>↗</span>
            <p>
              <strong>
                Un salon passe vite. Les bonnes connexions restent.
              </strong>{" "}
              Retrouvez ici toutes vos conversations et leurs prochaines étapes.
            </p>
            <span>RENCONTRE / IA</span>
          </div>
        </div>
      </main>
      {editor && (
        <ProspectEditor
          key={editor === "new" ? "new" : editor.id}
          prospect={editor === "new" ? null : editor}
          close={() => setEditor(null)}
          saved={(next) => {
            refreshed(
              editor === "new"
                ? "Rencontre enregistrée. À la suivante !"
                : "Fiche mise à jour.",
            );
            if (!next) setEditor(null);
          }}
        />
      )}
      {detail && (
        <ProspectDetail
          prospect={detail}
          close={() => setDetail(null)}
          edit={(p) => {
            setDetail(null);
            setEditor(p);
          }}
          changed={refreshed}
        />
      )}
      {notice && (
        <div className="toast" role="status">
          <span>✓</span>
          {notice}
          <button
            onClick={() => setNotice("")}
            aria-label="Fermer la notification"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function Modal({
  children,
  close,
  label,
  wide = false,
}: {
  children: React.ReactNode;
  close: () => void;
  label: string;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={"drawer " + (wide ? "wide" : "")}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      {children}
    </dialog>
  );
}
function Choices({
  label,
  values,
  value,
  onChange,
}: {
  label: string;
  values: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset className="choice-field">
      <legend>{label}</legend>
      <div className="choices">
        {values.map((s) => (
          <label
            key={s}
            className={"choice " + (value === s ? "selected" : "")}
          >
            <input
              type="radio"
              name={label}
              checked={value === s}
              onChange={() => onChange(s)}
            />
            {s}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
function ProspectEditor({
  prospect,
  close,
  saved,
}: {
  prospect: Prospect | null;
  close: () => void;
  saved: (next: boolean) => void;
}) {
  const [form, setForm] = useState<ProspectInput>(
    prospect ? { ...prospect } : emptyProspect(),
  );
  const [baseline, setBaseline] = useState(JSON.stringify(form));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const firstRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(form) !== baseline;
  useEffect(() => {
    function shortcut(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    }
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  function change<K extends keyof ProspectInput>(
    key: K,
    value: ProspectInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  function dismiss() {
    if (busy) return;
    if (
      !dirty ||
      window.confirm("Abandonner les modifications non enregistrées ?")
    )
      close();
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const next =
      (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ===
      "next";
    setBusy(true);
    setError("");
    try {
      await api("/api/prospects" + (prospect ? "/" + prospect.id : ""), {
        method: prospect ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      setBaseline(JSON.stringify(form));
      if (next) {
        const fresh = emptyProspect();
        setForm(fresh);
        setBaseline(JSON.stringify(fresh));
        requestAnimationFrame(() => firstRef.current?.focus());
      }
      saved(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      close={dismiss}
      label={prospect ? "Modifier le prospect" : "Nouveau prospect"}
      wide
    >
      <form ref={formRef} onSubmit={submit}>
        <header className="drawer-header">
          <div>
            <p className="eyebrow">
              {prospect ? "GARDER LE LIEN" : "UNE NOUVELLE CONVERSATION"}
            </p>
            <h2>
              {prospect ? "Modifier le prospect" : "Faisons connaissance."}
            </h2>
            <p>
              {prospect
                ? "Complétez la fiche au fil de vos échanges."
                : "L’essentiel maintenant. Les détails quand vous avez le temps."}
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={dismiss}
            disabled={busy}
            aria-label="Fermer le formulaire"
          >
            ×
          </button>
        </header>
        <div className="drawer-body">
          <div className="timestamp-note">
            ◷{" "}
            {prospect
              ? "Premier passage : " + dateTime(prospect.createdAt)
              : "Le premier passage sera horodaté à l’enregistrement."}
          </div>
          <fieldset disabled={busy} className="form-fields">
            <section className="form-section">
              <h3>
                <span>01</span> Votre interlocuteur
              </h3>
              <p className="section-help">
                Un prénom, un nom ou une société suffit pour démarrer.
              </p>
              <div className="form-grid">
                <label>
                  Prénom
                  <input
                    ref={firstRef}
                    value={form.firstName}
                    onChange={(e) => change("firstName", e.target.value)}
                    autoComplete="given-name"
                    maxLength={250}
                    placeholder="Camille"
                  />
                </label>
                <label>
                  Nom
                  <input
                    value={form.lastName}
                    onChange={(e) => change("lastName", e.target.value)}
                    autoComplete="family-name"
                    maxLength={250}
                    placeholder="Martin"
                  />
                </label>
                <label>
                  Société
                  <input
                    value={form.company}
                    onChange={(e) => change("company", e.target.value)}
                    autoComplete="organization"
                    maxLength={250}
                    placeholder="Nom de l’entreprise"
                  />
                </label>
                <label>
                  Fonction
                  <input
                    value={form.role}
                    onChange={(e) => change("role", e.target.value)}
                    autoComplete="organization-title"
                    maxLength={250}
                    placeholder="Direction, innovation, RH…"
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => change("email", e.target.value)}
                    autoComplete="email"
                    maxLength={250}
                    placeholder="camille@entreprise.fr"
                  />
                </label>
                <label>
                  Téléphone
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => change("phone", e.target.value)}
                    autoComplete="tel"
                    maxLength={250}
                    placeholder="06 12 34 56 78"
                  />
                </label>
              </div>
            </section>
            <section className="form-section">
              <h3>
                <span>02</span> Les besoins en IA
              </h3>
              <p className="section-help">
                Plusieurs sujets peuvent se croiser. Cochez ce qui ressort.
              </p>
              <fieldset className="needs-field">
                <legend className="sr-only">Besoins discutés</legend>
                <div className="need-choices">
                  {NEEDS.map((n) => (
                    <label
                      key={n}
                      className={
                        "need-choice " +
                        (form.needs.includes(n) ? "selected" : "")
                      }
                    >
                      <input
                        type="checkbox"
                        checked={form.needs.includes(n)}
                        onChange={(e) =>
                          change(
                            "needs",
                            e.target.checked
                              ? [...form.needs, n]
                              : form.needs.filter((v) => v !== n),
                          )
                        }
                      />
                      {n}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="block-label">
                Notes de l’échange
                <textarea
                  value={form.notes}
                  onChange={(e) => change("notes", e.target.value)}
                  rows={4}
                  maxLength={10000}
                  placeholder="Quel problème cherche-t-on à résoudre ? Processus actuel, attentes, contraintes, outils utilisés…"
                />
              </label>
            </section>
            <section className="form-section">
              <h3>
                <span>03</span> Qualifier l’opportunité
              </h3>
              <Choices
                label="Priorité"
                values={PRIORITIES}
                value={form.priority}
                onChange={(v) => change("priority", v)}
              />
              <Choices
                label="Maturité IA"
                values={MATURITIES}
                value={form.maturity}
                onChange={(v) => change("maturity", v)}
              />
              <div className="form-grid">
                <label>
                  Échéance du projet
                  <select
                    value={form.timeline}
                    onChange={(e) => change("timeline", e.target.value)}
                  >
                    {TIMELINES.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Budget envisagé
                  <select
                    value={form.budget}
                    onChange={(e) => change("budget", e.target.value)}
                  >
                    {BUDGETS.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
            <section className="form-section">
              <h3>
                <span>04</span> Et après le salon ?
              </h3>
              <div className="form-grid">
                <label>
                  Statut
                  <select
                    value={form.status}
                    onChange={(e) => change("status", e.target.value)}
                  >
                    {STATUSES.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Date de relance
                  <input
                    type="date"
                    value={form.followUpDate}
                    onChange={(e) => change("followUpDate", e.target.value)}
                  />
                </label>
              </div>
              <label className="block-label">
                Prochaine action
                <textarea
                  value={form.nextAction}
                  onChange={(e) => change("nextAction", e.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder="Envoyer un cas client, proposer une démo, organiser un atelier…"
                />
              </label>
            </section>
          </fieldset>
        </div>
        <footer className="drawer-actions">
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div>
            <button
              type="button"
              className="text-button"
              onClick={dismiss}
              disabled={busy}
            >
              Annuler
            </button>
            <span className="shortcut-hint">⌘ / Ctrl + Entrée</span>
            <button
              className={prospect ? "primary" : "secondary"}
              type="submit"
              value="save"
              disabled={busy}
            >
              {busy ? "Enregistrement…" : "Enregistrer"}
            </button>
            {!prospect && (
              <button
                className="primary"
                type="submit"
                value="next"
                disabled={busy}
              >
                Enregistrer et suivant →
              </button>
            )}
          </div>
        </footer>
      </form>
    </Modal>
  );
}

function ProspectDetail({
  prospect,
  close,
  edit,
  changed,
}: {
  prospect: Prospect;
  close: () => void;
  edit: (p: Prospect) => void;
  changed: (message: string) => void;
}) {
  const [record, setRecord] = useState(prospect);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [visitNote, setVisitNote] = useState("");
  const [newVisit, setNewVisit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api<{ prospect: Prospect; visits: Visit[] }>(
      "/api/prospects/" + prospect.id,
      { signal: controller.signal },
    )
      .then((d) => {
        if (!controller.signal.aborted) {
          setRecord(d.prospect);
          setVisits(d.visits);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [prospect.id]);
  function dismiss() {
    if (
      !busy &&
      (!visitNote ||
        window.confirm("Abandonner la note de passage non enregistrée ?"))
    )
      close();
  }
  async function addVisit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { visit } = await api<{ visit: Visit }>(
        "/api/prospects/" + record.id + "/visits",
        { method: "POST", body: JSON.stringify({ note: visitNote }) },
      );
      setVisits((v) => [visit, ...v]);
      setRecord((r) => ({
        ...r,
        lastVisitAt: visit.visitedAt,
        updatedAt: visit.visitedAt,
        visitCount: r.visitCount + 1,
      }));
      setVisitNote("");
      setNewVisit(false);
      changed("Nouveau passage enregistré.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await api("/api/prospects/" + record.id, { method: "DELETE" });
      changed("Prospect et historique supprimés.");
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal close={dismiss} label={"Fiche de " + fullName(record)}>
      <header className="drawer-header">
        <div>
          <p className="eyebrow">LE FIL DE VOTRE RENCONTRE</p>
          <h2>{fullName(record)}</h2>
          <p>
            {[record.role, record.company].filter(Boolean).join(" · ") ||
              "Coordonnées à compléter"}
          </p>
        </div>
        <button
          className="icon-button"
          onClick={dismiss}
          disabled={busy}
          aria-label="Fermer la fiche"
        >
          ×
        </button>
      </header>
      <div className="drawer-body detail-body">
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="detail-badges">
          <span className={"priority priority-" + record.priority}>
            <i />
            Priorité {record.priority.toLowerCase()}
          </span>
          <span
            className={
              "status status-" +
              STATUSES.indexOf(record.status as (typeof STATUSES)[number])
            }
          >
            {record.status}
          </span>
        </div>
        <div className="contact-links">
          <span>
            EMAIL
            {record.email ? (
              <a href={"mailto:" + record.email}>{record.email} ↗</a>
            ) : (
              <em>Non renseigné</em>
            )}
          </span>
          <span>
            TÉLÉPHONE
            {record.phone ? (
              <a href={"tel:" + record.phone.replace(/[^+\d]/g, "")}>
                {record.phone} ↗
              </a>
            ) : (
              <em>Non renseigné</em>
            )}
          </span>
        </div>
        <section className="detail-section">
          <h3>Besoins en IA</h3>
          <div className="tags">
            {record.needs.length ? (
              record.needs.map((n) => (
                <span className="tag" key={n}>
                  {n}
                </span>
              ))
            ) : (
              <span className="muted">Les besoins restent à explorer.</span>
            )}
          </div>
          <p className="notes-text">
            {record.notes || "Aucune note pour le moment."}
          </p>
        </section>
        <section className="detail-section">
          <h3>L’opportunité en bref</h3>
          <dl className="qualification">
            <div>
              <dt>Maturité IA</dt>
              <dd>{record.maturity}</dd>
            </div>
            <div>
              <dt>Échéance</dt>
              <dd>{record.timeline}</dd>
            </div>
            <div>
              <dt>Budget</dt>
              <dd>{record.budget}</dd>
            </div>
          </dl>
        </section>
        <section className="next-action">
          <span>↗</span>
          <div>
            <h3>La prochaine étape</h3>
            <p>{record.nextAction || "À définir ensemble."}</p>
            {record.followUpDate && (
              <strong>Relance le {dateOnly(record.followUpDate)}</strong>
            )}
          </div>
        </section>
        <section className="detail-section">
          <div className="history-title">
            <h3>
              Historique des passages <span>{record.visitCount}</span>
            </h3>
            <button
              className="text-button"
              onClick={() => setNewVisit((v) => !v)}
              disabled={busy || loading}
            >
              {newVisit ? "Fermer" : "＋ Nouveau passage"}
            </button>
          </div>
          {newVisit && (
            <form className="visit-form" onSubmit={addVisit}>
              <label className="block-label">
                Un nouvel échange
                <textarea
                  value={visitNote}
                  onChange={(e) => setVisitNote(e.target.value)}
                  maxLength={2000}
                  placeholder="Quoi de neuf depuis votre dernier échange ?"
                  rows={3}
                  disabled={busy}
                />
              </label>
              <button className="primary" type="submit" disabled={busy}>
                {busy ? "Enregistrement…" : "Horodater ce passage"}
              </button>
            </form>
          )}
          {loading ? (
            <p className="muted" role="status">
              Chargement de l’historique…
            </p>
          ) : (
            <ol className="history">
              {visits.map((v, i) => (
                <li key={v.id}>
                  <div className="history-dot" />
                  <div>
                    <strong>
                      {i === visits.length - 1
                        ? "Premier échange"
                        : "Nouveau passage"}
                    </strong>
                    <time dateTime={v.visitedAt}>
                      {new Date(v.visitedAt).toLocaleString("fr-FR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                    {v.note && <p>{v.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
        <div className="record-meta">
          Créé le {dateTime(record.createdAt)} · Modifié le{" "}
          {dateTime(record.updatedAt)}
        </div>
      </div>
      <footer className="drawer-actions">
        {deleting ? (
          <div className="delete-confirm">
            <p>
              Supprimer <strong>{fullName(record)}</strong> et ses{" "}
              {record.visitCount} passage{record.visitCount > 1 ? "s" : ""} ?
              Cette action est définitive.
            </p>
            <div>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setDeleting(false)}
              >
                Conserver
              </button>
              <button className="danger" disabled={busy} onClick={remove}>
                {busy ? "Suppression…" : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <button
              className="text-button delete-button"
              onClick={() => setDeleting(true)}
              disabled={busy}
            >
              Supprimer
            </button>
            <button
              className="primary"
              disabled={busy || loading}
              onClick={() => {
                if (
                  !visitNote ||
                  window.confirm(
                    "Abandonner la note de passage non enregistrée ?",
                  )
                )
                  edit(record);
              }}
            >
              Modifier la fiche ↗
            </button>
          </div>
        )}
      </footer>
    </Modal>
  );
}
