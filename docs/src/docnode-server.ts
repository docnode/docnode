import { PostgresProvider } from "@docnode/sync/postgres";
import { DocNodeServer } from "@docnode/sync/server";

new DocNodeServer({ port: 8081, provider: PostgresProvider });
