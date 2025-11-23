import { jsonb, pgTable, primaryKey, text, varchar } from "drizzle-orm/pg-core";
import postgres from "postgres";

if (!process.env.DOCNODE_DB_URL)
  throw new Error("env var DOCNODE_DB_URL not found");
export const queryClient = postgres(process.env.DOCNODE_DB_URL);

export const docnodesTest = pgTable(
  "docnodes-test",
  {
    docId: varchar("docId", { length: 26 }).notNull(),
    docnodeId: varchar("docnodeId", { length: 26 }).notNull(),
    data: jsonb("data"),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.docId, table.docnodeId] }),
    };
  },
);

// wip
export const documentsTest = pgTable(
  "documents-test",
  {
    docId: varchar("docId", { length: 26 }).notNull(),
    doc: text("doc"),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.docId] }),
    };
  },
);
