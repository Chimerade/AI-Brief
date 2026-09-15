import { sqliteTable, text, index, integer } from "drizzle-orm/sqlite-core";
export const prospects = sqliteTable(
  "prospects",
  {
    id: text("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    role: text("role").notNull(),
    company: text("company").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    needs: text("needs").notNull(),
    notes: text("notes").notNull(),
    priority: text("priority").notNull(),
    status: text("status").notNull(),
    maturity: text("maturity").notNull(),
    timeline: text("timeline").notNull(),
    budget: text("budget").notNull(),
    nextAction: text("next_action").notNull(),
    followUpDate: text("follow_up_date").notNull(),
    searchText: text("search_text").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    lastVisitAt: text("last_visit_at").notNull(),
    visitCount: integer("visit_count").notNull().default(1),
  },
  (t) => [
    index("idx_prospects_last_visit").on(t.lastVisitAt),
    index("idx_prospects_status_last_visit").on(t.status, t.lastVisitAt),
    index("idx_prospects_priority_last_visit").on(t.priority, t.lastVisitAt),
  ],
);
export const visits = sqliteTable(
  "visits",
  {
    id: text("id").primaryKey(),
    prospectId: text("prospect_id")
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    visitedAt: text("visited_at").notNull(),
    note: text("note").notNull(),
  },
  (t) => [index("idx_visits_prospect_date").on(t.prospectId, t.visitedAt)],
);
