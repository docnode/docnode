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

// The existing transaction inverse is the base. Only disagreements with user
// undo are stored here: alternate state, structural membership, and omitted or
// undo-only inverse operations. Ordinary transactions allocate none of this.
export function createUndoChanges() {
  const changes: {
    nodes?: Map<
      string,
      {
        inserted?: boolean;
        deleted?: boolean;
        moved?: boolean;
        state?: Map<string, string | undefined>;
      }
    >;
    ordered?: Map<number, { omit?: true; before?: OrderedOperation[] }>;
  } = {};
  return changes;
}

function nodeUndoChanges(doc: Doc, id: string) {
  const changes = (doc["_undoChanges"] ??= createUndoChanges());
  const nodes = (changes.nodes ??= new Map());
  let node = nodes.get(id);
  if (!node) {
    node = {};
    nodes.set(id, node);
  }
  return node;
}

function trimUndoChanges(doc: Doc, id: string) {
  const changes = doc["_undoChanges"];
  const node = changes?.nodes?.get(id);
  if (node) {
    if (node.state?.size === 0) delete node.state;
    if (isObjectEmpty(node)) changes!.nodes!.delete(id);
  }
  if (changes?.nodes?.size === 0) delete changes.nodes;
  if (changes && isObjectEmpty(changes)) doc["_undoChanges"] = undefined;
}

function isExcluded(doc: Doc) {
  // Initialization is excluded as a whole at commit and needs no differences.
  return (
    !doc["_transactionFlags"]?.skipUndo &&
    Boolean(doc.undoManager?.["_skipUndoDepth"])
  );
}

function undoHas(doc: Doc, kind: "inserted" | "deleted" | "moved", id: string) {
  return (
    doc["_undoChanges"]?.nodes?.get(id)?.[kind] ?? doc["_diff"][kind].has(id)
  );
}

function setMembership(
  doc: Doc,
  node: DocNode,
  kind: "inserted" | "deleted" | "moved",
  full: boolean,
  undo: boolean,
) {
  const diff = doc["_diff"];
  if (!full) diff[kind].delete(node.id);
  else if (kind === "deleted") diff.deleted.set(node.id, node);
  else diff[kind].add(node.id);
  if (full !== undo) nodeUndoChanges(doc, node.id)[kind] = undo;
  else {
    const change = doc["_undoChanges"]?.nodes?.get(node.id);
    if (change) delete change[kind];
    trimUndoChanges(doc, node.id);
  }
}

// Missing key means inherit the full inverse; a stored undefined means omit it.
function undoValue(doc: Doc, id: string, key: string) {
  const state = doc["_undoChanges"]?.nodes?.get(id)?.state;
  return state?.has(key)
    ? state.get(key)
    : doc["_inverseOperations"][1][id]?.[key];
}

function setInverseValue(
  doc: Doc,
  id: string,
  key: string,
  full: string | undefined,
  undo: string | undefined,
) {
  const state = doc["_inverseOperations"][1];
  if (full === undefined) {
    const patch = state[id];
    if (patch) {
      delete patch[key];
      if (isObjectEmpty(patch)) delete state[id];
    }
  } else (state[id] ??= {})[key] = full;
  if (full !== undo)
    (nodeUndoChanges(doc, id).state ??= new Map()).set(key, undo);
  else {
    doc["_undoChanges"]?.nodes?.get(id)?.state?.delete(key);
    trimUndoChanges(doc, id);
  }
}

function appendInverse(
  doc: Doc,
  operation: OrderedOperation,
  full: boolean,
  undo: boolean,
) {
  const ordered = doc["_inverseOperations"][0];
  // Full ordered inverses are append-only until commit. This index also names
  // the gap before the next full inverse, for operations needed only by undo.
  const at = ordered.length;
  if (full) ordered.push(operation);
  if (full === undo) return;
  const changes = (doc["_undoChanges"] ??= createUndoChanges());
  const exceptions = (changes.ordered ??= new Map());
  let change = exceptions.get(at);
  if (!change) {
    change = {};
    exceptions.set(at, change);
  }
  if (full) change.omit = true;
  else (change.before ??= []).push(operation);
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
    const undo = undoValue(doc, node.id, key);
    setInverseValue(
      doc,
      node.id,
      key,
      full === value ? undefined : full,
      !isExcluded(doc) && undo === value ? undefined : undo,
    );
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
    const full = doc["_inverseOperations"][1][node.id]?.[key];
    const undo = undoValue(doc, node.id, key);
    const needsFull = !doc["_diff"].inserted.has(node.id) && full === undefined;
    const needsUndo =
      !isExcluded(doc) &&
      !undoHas(doc, "inserted", node.id) &&
      undo === undefined;
    if (!needsFull && !needsUndo) return;
    const value = stringifyStateKey(node, key);
    setInverseValue(
      doc,
      node.id,
      key,
      needsFull ? value : full,
      needsUndo ? value : undo,
    );
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
  const full = !doc["_diff"].inserted.has(newParent.id);
  const undo = !isExcluded(doc) && !undoHas(doc, "inserted", newParent.id);
  if (full || undo)
    appendInverse(
      doc,
      [1, nodes[0]!.id, nodes.length > 1 ? nodes.at(-1)!.id : 0],
      full,
      undo,
    );
  nodes.forEach((topLevelNode) => {
    copyInsertedToDiff(topLevelNode);
    topLevelNode.descendants().forEach((node) => {
      copyInsertedToDiff(node);
      const parent = node.parent!;
      if (!node.prev) {
        doc["_operations"][0].push([
          0,
          getChildren(parent).map((child) => [child.id, child.type]),
          parent.id,
          0,
          0,
        ]);
        const full = !doc["_diff"].inserted.has(parent.id);
        const undo = !isExcluded(doc) && !undoHas(doc, "inserted", parent.id);
        if (full || undo)
          appendInverse(
            doc,
            [1, node.id, parent.last !== node ? parent.last!.id : 0],
            full,
            undo,
          );
      }
    });
  });
};

function copyInsertedToDiff(node: DocNode) {
  const doc = node.doc;
  const diff = doc["_diff"];
  const deleted = diff.deleted.has(node.id);
  const undoDeleted = undoHas(doc, "deleted", node.id);
  const undoInserted = undoHas(doc, "inserted", node.id);
  const undoMoved = undoHas(doc, "moved", node.id);
  const excluded = isExcluded(doc);
  setMembership(doc, node, "deleted", false, excluded ? undoDeleted : false);
  setMembership(
    doc,
    node,
    "inserted",
    diff.inserted.has(node.id) || !deleted,
    excluded ? undoInserted : undoInserted || !undoDeleted,
  );
  setMembership(
    doc,
    node,
    "moved",
    diff.moved.has(node.id) || deleted,
    excluded ? undoMoved : undoMoved || undoDeleted,
  );
  if (deleted) diff.updated.add(node.id);
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
  const jsonNodes: [string, string][] = [];
  startNode.to(endNode).forEach((node) => {
    jsonNodes.push([node.id, node.type]);
    copyDeletedToDiff(node);
  });
  // Rollback can omit descendants of a newly inserted parent; undo may still
  // need them when that parent's insertion was excluded from history.
  const full = !doc["_diff"].inserted.has(parent.id);
  const undo = !isExcluded(doc) && !undoHas(doc, "inserted", parent.id);
  const inverse: OrderedOperation[] = [];
  if (full || undo)
    inverse.push([
      0,
      jsonNodes,
      parent === doc.root ? 0 : parent.id,
      startNode.prev?.id ?? 0,
      endNode.next?.id ?? 0,
    ]);
  startNode.to(endNode).forEach((node) => {
    node.descendants({ includeSelf: true }).forEach((node) => {
      delete doc["_operations"][1][node.id];
      doc["_diff"].updated.delete(node.id);
      if (node.first) {
        const children: [string, string][] = [];
        node.children().forEach((child) => {
          copyDeletedToDiff(child);
          children.push([child.id, child.type]);
        });
        if (full || undo) inverse.push([0, children, node.id, 0, 0]);
      }
    });
  });
  // The commit reverses the complete sequence. Reverse this subtree first so
  // replay still restores each parent before its children.
  inverse
    .reverse()
    .forEach((operation) => appendInverse(doc, operation, full, undo));
  detachRange(startNode, endNode);
};

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
  appendInverse(
    doc,
    [
      2,
      startNode.id,
      endId,
      currentParent === doc.root ? 0 : currentParent.id,
      startNode.prev?.id ?? 0,
      endNode.next?.id ?? 0,
    ],
    true,
    !isExcluded(doc),
  );
  startNode.to(endNode).forEach((node) => {
    const moved = undoHas(doc, "moved", node.id);
    setMembership(
      doc,
      node,
      "moved",
      doc["_diff"].moved.has(node.id) || !doc["_diff"].inserted.has(node.id),
      moved || (!isExcluded(doc) && !undoHas(doc, "inserted", node.id)),
    );
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
  const undo = getUndoOperations(doc);
  // An ordinary transaction shares the entire inverse with history. Reverse
  // shared arrays only once; mixed histories may have their own array of refs.
  if (undo && undo[0] !== doc["_inverseOperations"][0]) undo[0].reverse();
  doc["_inverseOperations"][0].reverse();
  doc["_lifeCycleStage"] = "change";
  const historyChanged = doc.undoManager?.["_record"](undo);
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

function copyDeletedToDiff(node: DocNode) {
  const doc = node.doc;
  const diff = doc["_diff"];
  const inserted = diff.inserted.has(node.id);
  const undoInserted = undoHas(doc, "inserted", node.id);
  const undoMoved = undoHas(doc, "moved", node.id);
  const undoDeleted = undoHas(doc, "deleted", node.id);
  const excluded = isExcluded(doc);
  if (!inserted || (!excluded && !undoInserted)) {
    const current: Record<string, string> = node["_stateToJson"]();
    for (const key in current) {
      const full = doc["_inverseOperations"][1][node.id]?.[key];
      const undo = undoValue(doc, node.id, key);
      setInverseValue(
        doc,
        node.id,
        key,
        inserted ? full : (full ?? current[key]),
        excluded || undoInserted ? undo : (undo ?? current[key]),
      );
    }
  }
  setMembership(doc, node, "inserted", false, excluded ? undoInserted : false);
  setMembership(
    doc,
    node,
    "moved",
    inserted ? false : diff.moved.has(node.id),
    excluded ? undoMoved : undoInserted ? false : undoMoved,
  );
  setMembership(
    doc,
    node,
    "deleted",
    diff.deleted.has(node.id) || !inserted,
    excluded ? undoDeleted : undoDeleted || !undoInserted,
  );
}

function getUndoOperations(doc: Doc) {
  if (doc["_transactionFlags"]?.skipUndo) return;
  const base = doc["_inverseOperations"];
  const changes = doc["_undoChanges"];
  if (!changes)
    return hasChanges(doc["_diff"], doc["_operations"][1]) ? base : undefined;
  let state = base[1];
  changes?.nodes?.forEach((node, id) => {
    if (!node.state) return;
    if (state === base[1]) state = { ...state };
    const patch = { ...state[id] };
    node.state.forEach((value, key) => {
      if (value === undefined) delete patch[key];
      else patch[key] = value;
    });
    if (isObjectEmpty(patch)) delete state[id];
    else state[id] = patch;
  });
  // Excluded writes can cancel the final undo effect too. Preserve state for
  // nodes whose inverse recreates them, even when their current value matches.
  for (const id in state) {
    const node = doc.getNodeById(id);
    if (!node || undoHas(doc, "moved", id)) continue;
    for (const key in state[id]) {
      if (stringifyStateKey(node, key) !== state[id][key]) continue;
      if (state === base[1]) state = { ...state };
      if (state[id] === base[1][id]) state[id] = { ...state[id] };
      delete state[id]![key];
    }
    if (isObjectEmpty(state[id]!)) delete state[id];
  }
  let structuralCount =
    doc["_diff"].inserted.size +
    doc["_diff"].deleted.size +
    doc["_diff"].moved.size;
  changes?.nodes?.forEach((node, id) => {
    for (const kind of ["inserted", "deleted", "moved"] as const) {
      if (node[kind] !== undefined)
        structuralCount +=
          Number(node[kind]) - Number(doc["_diff"][kind].has(id));
    }
  });
  if (!structuralCount && isObjectEmpty(state)) return;
  let ordered = base[0];
  if (changes?.ordered) {
    ordered = [];
    for (let at = 0; at <= base[0].length; at++) {
      const change = changes.ordered.get(at);
      if (change?.before) ordered.push(...change.before);
      const operation = base[0][at];
      if (operation && !change?.omit) ordered.push(operation);
    }
  }
  if (ordered === base[0] && state === base[1]) return base;
  const inverse: Operations = [ordered, state];
  return inverse;
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
