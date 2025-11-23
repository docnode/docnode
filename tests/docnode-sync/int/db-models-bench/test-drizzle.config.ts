import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./tests-int/db-models-bench/test-schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DOCNODE_DB_URL!,
  },
});
