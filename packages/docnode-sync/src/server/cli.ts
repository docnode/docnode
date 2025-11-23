import { PostgresProvider } from "./providers/postgres/index.js";
import { DocNodeServer } from "./index.js";

new DocNodeServer({ port: 8081, provider: PostgresProvider });
