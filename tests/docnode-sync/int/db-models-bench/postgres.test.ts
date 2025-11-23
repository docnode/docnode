// import { expect, test } from "vitest";
// import { createNode, Doc, type JsonDoc } from "../../src/core/index.js";
// import { type JsonDocNode, type TxPayload } from "../../src/core/index.js";
// import type { ClientProvider } from "../../src/client/index.js";
// import { customConsoleTable } from "./customConsoleTable.js";
// import { drizzle } from "drizzle-orm/postgres-js";
// import { docnodesTest, documentsTest, queryClient } from "./test-schema.js";
// import * as schema from "./test-schema.js";
// import { eq, inArray, sql } from "drizzle-orm";
// import type { SerializedTxPayload } from "../../src/server/index.js";

import { test } from "vitest";
test.todo("Postgres benchmark");

// const DEBUG = true;

// const A = {
//   type: "A" as const,
//   state: {
//     foo: (value: unknown) => (typeof value === "string" ? value : undefined),
//   },
// };

// let index = 0;

// test.todo(
//   "Postgres - Benchmarking 1 row per docnode vs 1 row per doc",
//   async () => {
//     const QUANTITY = 5;
//     const providers = [PostgresProvider, PostgresProviderGrouped];

//     const results: Record<"get" | "save" | "_name", number | string>[] = [];
//     index = 0;
//     for (const [i, Provider] of providers.entries()) {
//       index = i;
//       const provider = new Provider();
//       await provider.cleanDB();
//       const doc = new Doc({ nodes: [A] });
//       await provider.saveOnChange(doc);
//         const nodes = Array.from({ length: QUANTITY }).map((_, i) => {
//           return createNode(A, { foo: i.toString() });
//         });
//         doc.root.append(...nodes);
//       performance.mark(`start get ${Provider.name} - ${index}`);
//       await new Promise((resolve) => setTimeout(resolve, 5)); // Without this, the test fails half of the time
//       const nodes = await provider.getJsonDoc(doc.id);
//       performance.mark(`end get ${Provider.name} - ${index}`);
//       expect(Object.keys(nodes).length).toBe(QUANTITY + 1);
//       results.push({
//         _name: `${Provider.name} - ${index}`,
//         get: performance.measure(
//           `get ${Provider.name} - ${index}`,
//           `start get ${Provider.name} - ${index}`,
//           `end get ${Provider.name} - ${index}`,
//         ).duration,
//         save: performance.measure(
//           `save ${Provider.name} - ${index}`,
//           `start save ${Provider.name} - ${index}`,
//           `end save ${Provider.name} - ${index}`,
//         ).duration,
//       });
//     }
//     if (DEBUG) customConsoleTable(results);
//   },
// );

// test.todo("Postgres - update full row vs only changed fields", async () => {
//   const QUANTITY = 5;
//   const providers = [
//     PostgresProviderGrouped,
//     // PostgresProviderGrouped,
//   ];

//   const results: Record<"get" | "save" | "_name", number | string>[] = [];
//   for (const [index, Provider] of providers.entries()) {
//     const provider = new Provider();
//     await provider.cleanDB();
//     const doc = new Doc({ nodes: [A] });
//       const nodes = Array.from({ length: QUANTITY }).map((_, i) => {
//         return createNode(A, { foo: i.toString() });
//       });
//       doc.root.append(...nodes);
//     if (index === 1) {
//       await provider
//         .saveOnChange(doc)
//         .then(() => performance.mark(`end save ${Provider.name} - ${index}`));
//     } else {
//       await provider
//         .saveOnChange3(doc)
//         .then(() => performance.mark(`end save ${Provider.name} - ${index}`));
//     }
//       doc.root.setState("foo", "rootFoo");
//       performance.mark(`start save ${Provider.name} - ${index}`);
//     performance.mark(`start get ${Provider.name} - ${index}`);
//     await new Promise((resolve) => setTimeout(resolve, 5)); // Without this, the test fails half of the time
//     const nodes = await provider.getJsonDoc(doc.id);
//     performance.mark(`end get ${Provider.name} - ${index}`);
//     expect(Array.isArray(nodes)).toBe(false);
//     expect(Object.keys(nodes).length).toBe(QUANTITY + 1);
//     results.push({
//       _name: `${Provider.name} - ${index}`,
//       get: performance.measure(
//         `get ${Provider.name} - ${index}`,
//         `start get ${Provider.name} - ${index}`,
//         `end get ${Provider.name} - ${index}`,
//       ).duration,
//       save: performance.measure(
//         `save ${Provider.name} - ${index}`,
//         `start save ${Provider.name} - ${index}`,
//         `end save ${Provider.name} - ${index}`,
//       ).duration,
//     });
//   }
//   if (DEBUG) customConsoleTable(results);
// });

// class PostgresProvider implements ClientProvider {
//   private db = drizzle(queryClient, { schema });

//   async getJsonDoc(docId: string): Promise<JsonDoc> {
//     const result = await this.db.query.docnodesTest.findMany({
//       columns: {
//         data: true,
//       },
//       where: eq(docnodesTest.docId, docId),
//     });
//     const jsondoc = result.map((docnode) => docnode.data) as JsonDocNode[];
//     const jsonDoc2: JsonDoc = jsondoc.reduce((acc, node) => {
//       acc[node.id] = node;
//       return acc;
//     }, {} as JsonDoc);
//     return jsonDoc2;
//   }

//   async saveTxPayload(txPayload: TxPayload, docId: string) {
//     const serializedTxPayload: SerializedTxPayload = {
//       ...txPayload,
//       deleted: Array.from(txPayload.deleted),
//     };

//     // 2. then we add the serializedTxPayload to the docnodes table
//     const valuesToInsert = Object.entries(serializedTxPayload.updated).map(
//       ([docnodeId, data]) => ({
//         docId,
//         docnodeId,
//         data,
//         clock: 0,
//       }),
//     );
//     await this.db
//       .insert(docnodesTest)
//       .values(valuesToInsert)
//       .onConflictDoUpdate({
//         target: [docnodesTest.docnodeId, docnodesTest.docId],
//         set: {
//           data: sql.raw("excluded.data"),
//         },
//       })
//       .execute();
//     // now we delete the docnodes that were deleted

//     if (serializedTxPayload.deleted.length > 0) {
//       await this.db
//         .delete(docnodesTest)
//         .where(inArray(docnodesTest.docnodeId, serializedTxPayload.deleted))
//         .execute();
//     }
//   }

//   async saveOnChange(doc: Doc) {
//     // eslint-disable-next-line @typescript-eslint/no-misused-promises
//     doc.onChange(async ({ txPayload }) => {
//       await this.saveTxPayload(txPayload, doc.id);
//     });
//   }

//   async cleanDB() {
//     await this.db.delete(docnodesTest).execute();
//   }
// }

// class PostgresProviderGrouped implements ClientProvider {
//   private db = drizzle(queryClient, { schema });

//   async getJsonDoc(docId: string): Promise<JsonDoc> {
//     const result = await this.db.query.documentsTest.findFirst({
//       columns: {
//         doc: true,
//       },
//       where: eq(docnodesTest.docId, docId),
//     });
//     if (!result) throw new Error("Document not found");
//     return JSON.parse(result.doc!) as JsonDoc;
//   }

//   async saveOnChange(doc: Doc) {
//     performance.mark(`start save ${this.constructor.name} - ${index}`);
//     return new Promise<void>((resolve) => {
//       // eslint-disable-next-line @typescript-eslint/no-misused-promises
//       doc.onChange(async () => {
//         try {
//           console.log("onChange");
//           const data = doc.toJSON();
//           await this.db
//             .insert(documentsTest)
//             .values({ docId: doc.id, doc: JSON.stringify(data) })
//             .onConflictDoUpdate({
//               target: [documentsTest.docId],
//               set: {
//                 doc: sql.raw("excluded.doc"),
//               },
//             })
//             .execute();
//           performance.mark(`end save ${this.constructor.name} - ${index}`);
//         } catch (error) {
//           console.error("Error saving document:", error);
//         } finally {
//           resolve();
//         }
//       });
//     });
//   }

//   async saveOnChange2(doc: Doc) {
//     // eslint-disable-next-line @typescript-eslint/no-misused-promises
//     doc.onChange(async () => {
//       console.log("onChange");
//       const data = doc.toJSON();
//       await this.db
//         .insert(documentsTest)
//         .values({ docId: doc.id, doc: JSON.stringify(data) })
//         .onConflictDoUpdate({
//           target: [documentsTest.docId],
//           set: {
//             doc: sql.raw("excluded.doc"),
//           },
//         })
//         .execute();
//     });
//   }

//   async saveOnChange3(doc: Doc) {
//     console.log("saveOnChange2--2222");
//     const current = await this.getJsonDoc(doc.id);
//     await new Promise((resolve) => {
//       doc.onChange(({ txPayload }) => {
//         console.log("txPayload", txPayload);
//         const { updated, deleted } = txPayload;
//         Object.entries(updated).forEach(([key, value]) => {
//           console.log("updated", key, value);
//           current[key] = value;
//         });
//         deleted.forEach((key) => {
//           delete current[key];
//         });
//         console.log("current", current);
//         this.db
//           .insert(documentsTest)
//           .values({ docId: doc.id, doc: JSON.stringify(current) })
//           .onConflictDoUpdate({
//             target: [documentsTest.docId],
//             set: {
//               doc: sql.raw("excluded.doc"),
//             },
//           })
//           .execute()
//           .then(resolve)
//           .catch((error) => {
//             console.error("Error saving to IndexedDB: ", error);
//           });
//       });
//     });
//   }

//   async cleanDB() {
//     await this.db.delete(docnodesTest).execute();
//   }
// }
