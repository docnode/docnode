/// <reference lib="webworker" />

// IMPORTANT: Any console.log you put in this file won't be visible in the browser console.
// In Chrome, you can open the worker console from chrome://inspect/#workers

import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../src/server/index.js";
import type {
  ClientProvider,
  MessageFromWorker,
  MessageToWorker,
} from "../src/client/index.js";
import { IndexedDBProvider } from "../src/client/providers/indexeddb.js";
import type { Operations } from "docnode";
declare const self: SharedWorkerGlobalScope;

let DOCNODE_WORKER: DocNodeWorker | undefined;
let USER_ID: string | undefined;
let URL: string | undefined;
const connectedPorts: MessagePort[] = [];

self.onconnect = (event) => {
  const port = event.ports[0]; // https://stackoverflow.com/a/39343584/10476393
  if (!port) return;
  port.start();
  connectedPorts.push(port);
  const sendMessage = (message: MessageFromWorker) => port.postMessage(message);
  try {
    // Messages received from the main thread
    port.onmessage = (ev: MessageEvent<MessageToWorker>) => {
      if (ev.data.type === "INIT") {
        const { workerConfig } = ev.data;
        const { userId, url } = workerConfig;
        if (!userId || !url) {
          console.error("Invalid worker config", workerConfig);
        } else if (URL && URL !== url) {
          throw new Error("URL mismatch"); // https://stackoverflow.com/a/74680317/10476393
        } else if (USER_ID && USER_ID !== userId) {
          port.close();
        } else {
          DOCNODE_WORKER ??= new DocNodeWorker(url);
        }
        return;
      }
      if (ev.data.type === "OPERATIONS") {
        // Broadcast operations to all ports except the sender (tabs, iframes, etc.)
        for (const p of connectedPorts) {
          if (p !== port) {
            p.postMessage(ev.data);
          }
        }
        // Push operations to the server and then to idb
        DOCNODE_WORKER?.onLocalOperations(ev.data.operations).catch((err) => {
          throw err;
        });
        return;
      }
      ev.data satisfies never;
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    sendMessage({ type: "ERROR", error });
  }
};

class DocNodeWorker {
  private _socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  private _clientProvider: ClientProvider = new IndexedDBProvider();

  private _pushInProgress = false;
  private _inLocalWaiting = false; // debería disparar un push al inicializar (quizás hay en local)

  constructor(url: string) {
    this._socket = io(url, {
      auth: {
        userId: "John Salchichon",
        token: "1234567890",
      },
    });
    this._setupSocketClient();
  }

  // prettier-ignore
  private _setupSocketClient() {
    this._socket.on("connect", () => console.log("Connected to Socket.io server"))
    this._socket.on("connect_error", err => console.error("Socket.io connection error:", err))
    this._socket.on("disconnect", reason => console.error("Socket.io disconnected:", reason))
   }

  async onLocalOperations(operations: Operations) {
    await this._clientProvider.saveOperations(operations);
    if (this._pushInProgress) this._inLocalWaiting = true;

    const pushOperations = async () => {
      if (this._pushInProgress) throw new Error("Push already in progress");
      this._pushInProgress = true;
      const allOperations = await this._clientProvider.getOperations();
      const [error, newOperations] =
        await this._pushOperationsToServer(allOperations);
      if (error) {
        // retry. Maybe I should consider throw the error depending on the error type
        // to avoid infinite loops
        this._pushInProgress = false;
        await pushOperations();
      } else {
        // TODO: como hago en deleteOperations de indexedDB si quizás mientras viajaba al servidor y volvía
        // hubo otras operaciones que escribieron en idb?
        // 2 stores? Almacenar el id de la última operación enviada?
        await this._clientProvider.mergeAndDeleteOperations(newOperations);
        this._pushInProgress = false;
        this._inLocalWaiting = false;
        if (this._inLocalWaiting) await pushOperations();
      }
    };
    if (!this._pushInProgress) await pushOperations();
  }

  private async _pushOperationsToServer(
    operations: Operations,
  ): Promise<[Error, undefined] | [undefined, Operations]> {
    const response = await new Promise<Operations | Error>((resolve) => {
      this._socket.emit("push", operations, (res: Operations | Error) => {
        resolve(res);
      });
    });
    if (response instanceof Error) return [response, undefined];
    return [undefined, response];
  }
}
