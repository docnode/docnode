import { type Doc, type DocNode } from "./main.js";
import { type Json, type UnsafeDefinition, type Diff } from "./types.js";
import { detachRange, isObjectEmpty } from "./utils.js";

export function stringifyStateKey(node: DocNode, key: string): string {
  const resolvedNodeDef = node.doc["_resolvedNodeDefs"].get(node.type)!;
  const stateDefinition = resolvedNodeDef?.state[key];
  if (!(key in node["_state"])) {
    return resolvedNodeDef.defaultStrings[key]!;
  }
  const stateValue = (node as DocNode<UnsafeDefinition>)["_state"][key];
  const stateJson = stateDefinition?.toJSON
    ? stateDefinition.toJSON(stateValue)
    : stateValue;
  const stringified = JSON.stringify(stateJson);
  if (stringified === undefined)
    throw new Error(
      `The JSON serialization for state ${key} on a node of type ${node.type} is undefined.`,
    );
  return stringified;
}

export function parseStateKey(
  node: DocNode,
  key: string,
  stringifiedValue: string,
): unknown {
  const stateDef = node.doc["_resolvedNodeDefs"].get(node.type)?.state[key];
  const value = JSON.parse(stringifiedValue) as Json;
  const stateValue = stateDef?.fromJSON(value);
  return stateValue;
}

/**
 * Bookkeeping of one transaction: the inverse operations and the structural
 * membership they depend on. The full tracker sees every mutation and serves
 * rollback and change events. When a mutation happens inside `skipUndo`, the
 * full tracker is forked into an undo tracker that only sees the undoable
 * mutations from then on, and that fork becomes the undo step. Transactions
 * without `skipUndo` never fork, so they cost the same as before.
 */
export type Tracker = {
  inverse: Operations;
  inserted: Set<string>;
  deleted: Map<string, DocNode>;
  moved: Set<string>;
};

/** The trackers the current mutation must update. */
function trackers(doc: Doc): Tracker[] {
  const excluded =
    doc.undoManager["_skipUndoDepth"] > 0 &&
    // Initialization is excluded as a whole at commit.
    !doc["_transactionFlags"].skipUndo;
  if (!excluded) return doc["_trackers"];
  if (!doc["_undo"]) {
    doc["_undo"] = fork(doc["_full"]);
    doc["_trackers"] = [doc["_full"], doc["_undo"]];
  }
  return doc["_fullOnly"];
}

function fork(full: Tracker): Tracker {
  const state: StatePatch = {};
  for (const id in full.inverse[1]) state[id] = { ...full.inverse[1][id] };
  return {
    inverse: [full.inverse[0].slice(), state],
    inserted: new Set(full.inserted),
    deleted: new Map(full.deleted),
    moved: new Set(full.moved),
  };
}

function hasChanges(diff: Omit<Diff, "updated">, statePatch: StatePatch) {
  return Boolean(
    diff.inserted.size ||
    diff.deleted.size ||
    diff.moved.size ||
    !isObjectEmpty(statePatch),
  );
}

export const onSetState = {
  operations: (node: DocNode, key: string) => {
    const doc = node.doc;
    const value = stringifyStateKey(node, key);
    const full = doc["_inverseOperations"][1][node.id]?.[key];
    // A write that returns to a tracker's captured value cancels its inverse.
    for (const t of trackers(doc)) {
      const state = t.inverse[1];
      const patch = state[node.id];
      if (patch?.[key] === value) {
        delete patch[key];
        if (isObjectEmpty(patch)) delete state[node.id];
      }
    }
    if (full === value) {
      const patch = doc["_operations"][1][node.id];
      if (patch) {
        delete patch[key];
        if (isObjectEmpty(patch)) {
          delete doc["_operations"][1][node.id];
          doc["_diff"].updated.delete(node.id);
        }
      }
    } else {
      (doc["_operations"][1][node.id] ??= {})[key] = value;
      if (!doc["_diff"].inserted.has(node.id))
        doc["_diff"].updated.add(node.id);
    }
  },
  inverseOps: (node: DocNode, key: string) => {
    const doc = node.doc;
    let value: string | undefined;
    for (const t of trackers(doc)) {
      // The inverse of an insertion deletes the node, so its state is moot.
      if (t.inserted.has(node.id)) continue;
      const state = t.inverse[1];
      if (state[node.id]?.[key] !== undefined) continue;
      (state[node.id] ??= {})[key] = value ??= stringifyStateKey(node, key);
    }
  },
};

export const onInsertRange = (
  doc: Doc,
  target: DocNode,
  position: "append" | "before",
  nodes: DocNode[],
) => {
  let newNext: DocNode | undefined;
  let newPrev: DocNode | undefined;
  let newParent: DocNode;

  switch (position) {
    case "append":
      newPrev = target.last;
      newParent = target;
      break;
    case "before":
      newNext = target;
      newPrev = target.prev;
      newParent = target.parent!;
      break;
  }
  doc["_operations"][0].push([
    0,
    nodes.map((node) => [node.id, node.type]),
    newParent === doc.root ? 0 : newParent.id,
    newPrev?.id ?? 0,
    newNext?.id ?? 0,
  ]);
  const ts = trackers(doc);
  pushInverse(ts, newParent, [
    1,
    nodes[0]!.id,
    nodes.length > 1 ? nodes.at(-1)!.id : 0,
  ]);
  nodes.forEach((topLevelNode) => {
    markInserted(doc, ts, topLevelNode);
    topLevelNode.descendants().forEach((node) => {
      markInserted(doc, ts, node);
      const parent = node.parent!;
      if (!node.prev) {
        doc["_operations"][0].push([
          0,
          getChildren(parent).map((child) => [child.id, child.type]),
          parent.id,
          0,
          0,
        ]);
        pushInverse(ts, parent, [
          1,
          node.id,
          parent.last !== node ? parent.last!.id : 0,
        ]);
      }
    });
  });
};

/**
 * A tracker that inserted the parent in this transaction needs no inverse for
 * its children: undoing the parent's insertion removes the whole subtree.
 */
function pushInverse(
  ts: Tracker[],
  parent: DocNode,
  operation: OrderedOperation,
) {
  for (const t of ts) {
    if (!t.inserted.has(parent.id)) t.inverse[0].push(operation);
  }
}

function markInserted(doc: Doc, ts: Tracker[], node: DocNode) {
  if (doc["_diff"].deleted.has(node.id)) doc["_diff"].updated.add(node.id);
  for (const t of ts) {
    if (t.deleted.delete(node.id)) t.moved.add(node.id);
    else t.inserted.add(node.id);
  }
  // [#4GOSK]
  const jsonState = node["_stateToJson"]();
  if (!isObjectEmpty(jsonState)) doc["_operations"][1][node.id] = jsonState;
}

export const onDeleteRange = (
  doc: Doc,
  startNode: DocNode,
  endNode: DocNode,
) => {
  const parent = startNode.parent!;
  doc["_operations"][0].push([
    1,
    startNode.id,
    startNode !== endNode ? endNode.id : 0,
  ]);
  const ts = trackers(doc);
  const jsonNodes: [string, string][] = [];
  // Iterating the range also validates it, so it must run before the parent
  // is touched.
  startNode.to(endNode).forEach((node) => {
    jsonNodes.push([node.id, node.type]);
    markDeleted(ts, node);
  });
  // Rollback can omit descendants of a parent inserted in this transaction;
  // a tracker that did not see that insertion still needs them.
  const targets = ts.filter((t) => !t.inserted.has(parent.id));
  const inverse: OrderedOperation[] = [
    [
      0,
      jsonNodes,
      parent === doc.root ? 0 : parent.id,
      startNode.prev?.id ?? 0,
      endNode.next?.id ?? 0,
    ],
  ];
  detachRange(startNode, endNode);
  startNode.to(endNode).forEach((node) => {
    node.descendants({ includeSelf: true }).forEach((node) => {
      delete doc["_operations"][1][node.id];
      doc["_diff"].updated.delete(node.id);
      if (node.first) {
        const children: [string, string][] = [];
        node.children().forEach((child) => {
          markDeleted(ts, child);
          children.push([child.id, child.type]);
        });
        inverse.push([0, children, node.id, 0, 0]);
      }
    });
  });
  // The commit reverses the complete sequence. Reverse this subtree first so
  // replay still restores each parent before its children.
  inverse.reverse();
  targets.forEach((t) => t.inverse[0].push(...inverse));
};

function markDeleted(ts: Tracker[], node: DocNode) {
  let state: Record<string, string> | undefined;
  for (const t of ts) {
    // Deleting a node inserted in this transaction cancels the insertion.
    if (t.inserted.delete(node.id)) {
      t.moved.delete(node.id);
      continue;
    }
    // Keep the state as it was when this tracker first saw it.
    state ??= node["_stateToJson"]();
    t.inverse[1][node.id] = { ...state, ...t.inverse[1][node.id] };
    t.deleted.set(node.id, node);
  }
}

export const onMoveRange = (
  doc: Doc,
  startNode: DocNode,
  endNode: DocNode,
  newParent: DocNode,
  newPrev: DocNode | undefined,
  newNext: DocNode | undefined,
) => {
  const endId = endNode.id === startNode.id ? 0 : endNode.id;
  doc["_operations"][0].push([
    2,
    startNode.id,
    endId,
    newParent === doc.root ? 0 : newParent.id,
    newPrev?.id ?? 0,
    newNext?.id ?? 0,
  ]);
  const currentParent = startNode.parent!;
  const inverse: OrderedOperation = [
    2,
    startNode.id,
    endId,
    currentParent === doc.root ? 0 : currentParent.id,
    startNode.prev?.id ?? 0,
    endNode.next?.id ?? 0,
  ];
  const ts = trackers(doc);
  ts.forEach((t) => t.inverse[0].push(inverse));
  startNode.to(endNode).forEach((node) => {
    for (const t of ts) {
      if (!t.inserted.has(node.id)) t.moved.add(node.id);
    }
  });
};

export const onApplyOperations = (doc: Doc, operations: Operations) => {
  operations[0].forEach((operation) => {
    switch (operation[0]) {
      case 0:
        // Deleting or moving a missing node skips that operation and keeps
        // applying the batch. Inserting a node that already exists is treated
        // the same way: the intent is already satisfied. Undo steps depend on
        // this when an excluded change restored the node first.
        const nodes = operation[1]
          .filter(([id]) => !doc.getNodeById(id))
          .map(([id, type]) => doc["_createNodeFromJson"]([id, type, {}]));
        if (nodes.length === 0) break;
        const prev = operation[3] ? doc.getNodeById(operation[3]) : undefined;
        if (prev) {
          doc["_insertRange"](prev, "after", nodes);
          break;
        }
        const next = operation[4] ? doc.getNodeById(operation[4]) : undefined;
        if (next) {
          doc["_insertRange"](next, "before", nodes);
          break;
        }
        const parent = operation[2] ? doc.getNodeById(operation[2]) : doc.root;
        if (parent) doc["_insertRange"](parent, "append", nodes);
        break;
      case 1:
        try {
          doc
            .getNodeById(operation[1])!
            .to(doc.getNodeById(operation[2] || operation[1])!)
            .delete();
        } catch {}
        break;
      case 2:
        const startNode = doc.getNodeById(operation[1]);
        const endNode = doc.getNodeById(operation[2] || operation[1]);
        if (!startNode || !endNode) break;
        try {
          if (operation[4])
            startNode.to(endNode).move(doc.getNodeById(operation[4])!, "after");
          else if (operation[5])
            startNode
              .to(endNode)
              .move(doc.getNodeById(operation[5])!, "before");
          else
            startNode
              .to(endNode)
              .move(doc.getNodeById(operation[3] as string)!, "append");
        } catch {}
        break;
    }
  });
  // Apply state patch
  const toApplyStatePatch = operations[1];
  for (const id in toApplyStatePatch) {
    const node = doc.getNodeById(id);
    if (!node) continue;
    // A value already in place on a pre-existing node is treated as applied,
    // like an insert of an existing node: it changes nothing and needs no
    // inverse. The state of a node inserted in this transaction is part of
    // its creation and is taken verbatim.
    const inserted = doc["_diff"].inserted.has(id);
    const patch: Record<string, string> = {};
    for (const key in toApplyStatePatch[id]) {
      const value = toApplyStatePatch[id][key]!;
      if (!inserted && stringifyStateKey(node, key) === value) continue;
      patch[key] = value;
    }
    if (isObjectEmpty(patch)) continue;
    doc["_operations"][1][id] = { ...doc["_operations"][1][id], ...patch };
    if (!inserted) doc["_diff"].updated.add(id);
    for (const key in patch) onSetState.inverseOps(node, key);
    for (const key in patch) {
      const state = (node as DocNode<UnsafeDefinition>)["_state"];
      state[key] = parseStateKey(node, key, patch[key]!);
    }
  }
};

// A transaction can change history without changing content. Such events carry
// canonical empty operations so content adapters can ignore them without replay.
export const maybeTriggerListeners = (doc: Doc, ignoreEmptyDiff = false) => {
  const hasDocumentChanges = () =>
    hasChanges(doc["_diff"], doc["_operations"][1]);
  if (hasDocumentChanges() || ignoreEmptyDiff) {
    // Normalization is undoable by default; a normalizer opts out explicitly.
    const skipDepth = doc.undoManager["_skipUndoDepth"];
    doc.undoManager["_skipUndoDepth"] = 0;
    doc["_lifeCycleStage"] = "normalize";
    try {
      doc["_normalizeListeners"].forEach((listener) =>
        listener({ diff: doc["_diff"] }),
      );
      if (doc["_strictMode"]) {
        doc["_lifeCycleStage"] = "normalize2";
        doc["_normalizeListeners"].forEach((listener) =>
          listener({ diff: doc["_diff"] }),
        );
      }
    } finally {
      doc.undoManager["_skipUndoDepth"] = skipDepth;
    }
  }
  // push + reverse is more performant than unshift at insertion time
  doc["_inverseOperations"][0].reverse();
  const undo = getUndoOperations(doc);
  doc["_lifeCycleStage"] = "change";
  const historyChanged = doc.undoManager["_record"](undo);
  const documentChanged = hasDocumentChanges();
  if (!documentChanged && !historyChanged) return;
  doc["_changeListeners"].forEach((listener) =>
    listener({
      operations: documentChanged ? doc["_operations"] : [[], {}],
      inverseOperations: documentChanged ? doc["_inverseOperations"] : [[], {}],
      diff: documentChanged
        ? doc["_diff"]
        : {
            inserted: new Set(),
            deleted: new Map(),
            moved: new Set(),
            updated: new Set(),
          },
      flags: undo ? {} : { skipUndo: true },
    }),
  );
};

function getUndoOperations(doc: Doc): Operations | undefined {
  if (doc["_transactionFlags"].skipUndo) return;
  const undo = doc["_undo"];
  // An ordinary transaction shares its entire inverse with history.
  if (!undo)
    return hasChanges(doc["_diff"], doc["_operations"][1])
      ? doc["_inverseOperations"]
      : undefined;
  undo.inverse[0].reverse();
  const state = undo.inverse[1];
  // Excluded writes can leave a captured value equal to the current one. Drop
  // those, but keep the state of nodes whose inverse recreates them.
  for (const id in state) {
    const node = doc.getNodeById(id);
    if (!node || undo.moved.has(id)) continue;
    const patch = state[id]!;
    for (const key in patch) {
      if (stringifyStateKey(node, key) === patch[key]) delete patch[key];
    }
    if (isObjectEmpty(patch)) delete state[id];
  }
  if (
    !undo.inserted.size &&
    !undo.deleted.size &&
    !undo.moved.size &&
    isObjectEmpty(state)
  )
    return;
  return undo.inverse;
}

type InsertOperation = [
  operation: 0,
  nodes: [id: string, type: string][],
  parent: string | 0,
  prev: string | 0,
  next: string | 0,
];

type DeleteOperation = [operation: 1, start: string, end: string | 0];

type MoveOperation = [
  operation: 2,
  start: string,
  end: string | 0,
  parent: string | 0,
  prev: string | 0,
  next: string | 0,
];

export type OrderedOperation =
  | InsertOperation
  | DeleteOperation
  | MoveOperation;

// TODO: not implemented yet
// type ChangeTypeOperation = [
//   operation: 3,
//   type: string,
//   start: string,
//   end: string | 0,
//   includeDescendants: 1 | 0,
// ]

type StatePatch = { [id: string]: Record<string, string> };

export type Operations = readonly [OrderedOperation[], StatePatch];

export function mergeOperations(...operationsList: Operations[]): Operations {
  const orderedOperations: OrderedOperation[] = [];
  const statePatch: StatePatch = {};

  for (const operations of operationsList) {
    orderedOperations.push(...operations[0]);
    for (const nodeId in operations[1]) {
      statePatch[nodeId] ??= {};
      Object.assign(statePatch[nodeId], operations[1][nodeId]);
    }
  }

  return [orderedOperations, statePatch];
}

// TODO: decide whether this will be added to the API in node.getChildren().toArray()
function getChildren(node: DocNode) {
  const children: DocNode[] = [];
  node.children().forEach((node) => {
    children.push(node);
  });
  return children;
}
