import { describe, expect, test } from "vitest";
import { Doc, defineNode, string, type ChangeEvent } from "@docukit/docnode";
import {
  assertDoc,
  createTextDocWithUndo,
  text,
  TextExtension,
  Text,
} from "./utils.js";

describe("skipUndo", () => {
  test("keeps one observable transaction and a different inverse for user undo", () => {
    const doc = createTextDocWithUndo();
    const [trash, projects] = text(doc, "Trash", "Projects");
    doc.undoManager.skipUndo(() => doc.root.append(trash!, projects!));
    doc.forceCommit();
    const events: ChangeEvent[] = [];
    doc.onChange((event) => events.push(event));
    const page = doc.undoManager.skipUndo(() => {
      const [page] = text(doc, "Page");
      trash!.append(page!);
      return page!;
    });
    page.move(projects!, "append");
    expect(events).toHaveLength(0);
    doc.forceCommit();
    expect(events).toHaveLength(1);
    doc.undoManager.undo();
    expect(doc.getNodeById(page.id)).toBe(page);
    expect(page.parent).toBe(trash);
    doc.undoManager.redo();
    expect(page.parent).toBe(projects);
    expect(page.state.value.get()).toBe("Page");
    const replica = Doc.fromJSON(
      { type: "root", extensions: [TextExtension] },
      doc.toJSON(),
    );
    replica.forceCommit();
    replica.applyOperations(events[0]!.inverseOperations);
    expect(replica.getNodeById(page.id)).toBeUndefined();
    replica.dispose();
  });

  test("captures the value immediately before the undoable portion", () => {
    const doc = createTextDocWithUndo();
    const [node] = text(doc, "Original");
    doc.undoManager.skipUndo(() => doc.root.append(node!));
    doc.forceCommit();
    doc.undoManager.skipUndo(() => node!.state.value.set("Automatic"));
    node!.state.value.set("Manual");
    doc.forceCommit();
    doc.undoManager.undo();
    expect(node!.state.value.get()).toBe("Automatic");
    doc.undoManager.redo();
    expect(node!.state.value.get()).toBe("Manual");
  });

  test("excluded changes preserve redo and nesting is local to the document", () => {
    const doc = createTextDocWithUndo();
    const other = createTextDocWithUndo();
    doc.root.append(...text(doc, "undoable"));
    doc.forceCommit();
    doc.undoManager.undo();
    const result = doc.undoManager.skipUndo(() =>
      doc.undoManager.skipUndo(() => {
        doc.root.append(...text(doc, "excluded"));
        other.root.append(...text(other, "other"));
        return 42;
      }),
    );
    expect(result).toBe(42);
    doc.forceCommit();
    other.forceCommit();
    expect(doc.undoManager.canRedo()).toBe(true);
    expect(other.undoManager.canUndo()).toBe(true);
    doc.undoManager.redo();
    assertDoc(doc, ["excluded", "undoable"]);
  });

  test("an exception rolls back normal and excluded mutations", () => {
    const doc = createTextDocWithUndo();
    doc.root.append(...text(doc, "normal"));
    expect(() =>
      doc.undoManager.skipUndo(() => {
        doc.root.append(...text(doc, "excluded"));
        throw new Error("failure");
      }),
    ).toThrow("failure");
    assertDoc(doc, []);
    doc.root.append(...text(doc, "next"));
    doc.forceCommit();
    doc.undoManager.undo();
    assertDoc(doc, []);
  });
});

describe("mixed history boundaries", () => {
  test("a state updater returning the current value leaves history unchanged", () => {
    const doc = createTextDocWithUndo();
    const [node] = text(doc, "0");
    doc.undoManager.skipUndo(() => doc.root.append(node!));
    doc.forceCommit();
    let changes = 0;
    doc.onChange(() => changes++);
    node!.state.value.set((value) => value);
    doc.forceCommit();
    expect(doc.undoManager.canUndo()).toBe(false);
    expect(changes).toBe(0);
  });

  test("cancelled undoable writes do not create history for an unrelated excluded edit", () => {
    const doc = createTextDocWithUndo();
    const [node, other] = text(doc, "0", "other");
    doc.undoManager.skipUndo(() => doc.root.append(node!, other!));
    doc.forceCommit();
    const events: ChangeEvent[] = [];
    doc.onChange((event) => events.push(event));
    node!.state.value.set("1");
    doc.undoManager.skipUndo(() => other!.state.value.set("automatic"));
    node!.state.value.set("0");
    doc.forceCommit();
    expect(doc.undoManager.canUndo()).toBe(false);
    expect(events).toHaveLength(1);
    expect(events[0]!.operations).toStrictEqual([
      [],
      { [other!.id]: { value: JSON.stringify("automatic") } },
    ]);
    expect(events[0]!.flags).toStrictEqual({ skipUndo: true });
  });

  for (const callbackChanges of [false, true]) {
    test(`cancelled writes preserve redo with ${callbackChanges ? "cancelled" : "empty"} excluded mutations`, () => {
      const doc = createTextDocWithUndo();
      const [node] = text(doc, "0");
      doc.undoManager.skipUndo(() => doc.root.append(node!));
      doc.forceCommit();
      node!.state.value.set("previous edit");
      doc.forceCommit();
      doc.undoManager.undo();
      const history = doc.undoManager.exportHistory();
      const events: ChangeEvent[] = [];
      doc.onChange((event) => events.push(event));

      node!.state.value.set("1");
      doc.undoManager.skipUndo(() => {
        if (callbackChanges) {
          node!.state.value.set("2");
          node!.state.value.set("1");
        }
      });
      node!.state.value.set("0");
      doc.forceCommit();

      expect(node!.state.value.get()).toBe("0");
      expect(doc.undoManager.canUndo()).toBe(false);
      expect(doc.undoManager.exportHistory()).toStrictEqual(history);
      expect(events).toHaveLength(0);
      doc.undoManager.redo();
      expect(node!.state.value.get()).toBe("previous edit");
    });
  }

  test("history-only changes emit an empty change after updating undo and redo", () => {
    const doc = createTextDocWithUndo();
    doc.root.append(...text(doc, "previous edit"));
    doc.forceCommit();
    doc.undoManager.undo();
    const events: ChangeEvent[] = [];
    doc.onChange((event) => {
      events.push(event);
      expect(doc.undoManager.canUndo()).toBe(true);
      expect(doc.undoManager.canRedo()).toBe(false);
    });
    const [node] = text(doc, "temporary");
    doc.undoManager.skipUndo(() => doc.root.append(node!));
    node!.delete();
    doc.forceCommit();
    expect(events).toHaveLength(1);
    expect(events[0]).toStrictEqual({
      operations: [[], {}],
      inverseOperations: [[], {}],
      diff: {
        inserted: new Set(),
        deleted: new Map(),
        moved: new Set(),
        updated: new Set(),
      },
      flags: {},
    });
    doc.forceCommit();
    expect(events).toHaveLength(1);
  });

  test("normal, excluded and normal writes share one undo step", () => {
    const doc = createTextDocWithUndo();
    const [node] = text(doc, "0");
    doc.undoManager.skipUndo(() => doc.root.append(node!));
    doc.forceCommit();
    node!.state.value.set("1");
    doc.undoManager.skipUndo(() => node!.state.value.set("2"));
    node!.state.value.set("3");
    doc.forceCommit();
    expect(doc.undoManager.exportHistory().undoStack).toHaveLength(1);
    doc.undoManager.undo();
    expect(node!.state.value.get()).toBe("0");
    doc.undoManager.redo();
    expect(node!.state.value.get()).toBe("3");
  });

  test("skipped state on an inserted node survives undo of a later state change", () => {
    const doc = createTextDocWithUndo();
    const [node] = text(doc, "seed");
    doc.undoManager.skipUndo(() => doc.root.append(node!));
    node!.state.value.set("edited");
    doc.forceCommit();
    doc.undoManager.undo();
    expect(doc.getNodeById(node!.id)).toBe(node);
    expect(node!.state.value.get()).toBe("seed");
    doc.undoManager.redo();
    expect(node!.state.value.get()).toBe("edited");
  });

  test("a skipped deletion is not resurrected by unrelated undo", () => {
    const doc = createTextDocWithUndo();
    const [removed, kept] = text(doc, "removed", "kept");
    doc.undoManager.skipUndo(() => doc.root.append(removed!, kept!));
    doc.forceCommit();
    doc.undoManager.skipUndo(() => removed!.delete());
    kept!.state.value.set("changed");
    doc.forceCommit();
    doc.undoManager.undo();
    assertDoc(doc, ["kept"]);
    doc.undoManager.redo();
    assertDoc(doc, ["changed"]);
  });

  test("deleting a skipped insertion restores its ID, descendants and latest state", () => {
    const doc = createTextDocWithUndo();
    const [parent, child] = text(doc, "parent", "child");
    doc.undoManager.skipUndo(() => {
      doc.root.append(parent!);
      parent!.append(child!);
    });
    const ids = [parent!.id, child!.id];
    parent!.delete();
    doc.forceCommit();
    doc.undoManager.undo();
    assertDoc(doc, ["parent", "__child"]);
    expect(doc.root.first!.id).toBe(ids[0]);
    expect(doc.root.first!.first!.id).toBe(ids[1]);
    doc.undoManager.redo();
    assertDoc(doc, []);
  });

  test("rollback restores both portions after a move and a deletion", () => {
    const doc = createTextDocWithUndo();
    const [a, b, c] = text(doc, "A", "B", "C");
    doc.undoManager.skipUndo(() => doc.root.append(a!, b!, c!));
    doc.forceCommit();
    expect(() =>
      doc.undoManager.skipUndo(() => {
        a!.move(b!, "append");
        c!.delete();
        throw new Error("cancel");
      }),
    ).toThrow("cancel");
    assertDoc(doc, ["A", "B", "C"]);
    expect(doc.undoManager.canUndo()).toBe(false);
  });

  test("empty portions do not create history or emit changes", () => {
    const doc = createTextDocWithUndo();
    let changes = 0;
    doc.onChange(() => changes++);
    expect(doc.undoManager.skipUndo(() => undefined)).toBeUndefined();
    expect(doc.undoManager.skipUndo(() => null)).toBeNull();
    expect(doc.undoManager.skipUndo(() => ({ then: false }))).toStrictEqual({
      then: false,
    });
    doc.root.append(...text(doc, "temporary"));
    doc.root.deleteChildren();
    doc.undoManager.skipUndo(() => undefined);
    doc.forceCommit();
    expect(changes).toBe(0);
    expect(doc.undoManager.canUndo()).toBe(false);
  });

  test("thenable results are rejected and pending mutations are rolled back", () => {
    const doc = createTextDocWithUndo();
    expect(() => {
      // @ts-expect-error Async results cannot be used with a synchronous scope.
      void doc.undoManager.skipUndo(() => {
        doc.root.append(...text(doc, "discard"));
        return Promise.resolve();
      });
    }).toThrow("synchronous");
    assertDoc(doc, []);
    expect(() =>
      doc.undoManager.skipUndo(() => {
        throw new Error("empty");
      }),
    ).toThrow("empty");
  });
});

for (const skipNormalization of [false, true]) {
  test(`normalization is ${skipNormalization ? "explicitly excluded" : "undoable after excluded mutations"}`, () => {
    let normalize = false;
    const doc = new Doc({
      type: "root",
      extensions: [
        {
          nodes: [Text],
          register(doc) {
            doc.onNormalize(() => {
              const first = doc.root.first;
              if (
                !normalize ||
                !first?.is(Text) ||
                first.state.value.get() === "normalized"
              )
                return;
              const update = () => first.state.value.set("normalized");
              if (skipNormalization) doc.undoManager.skipUndo(update);
              else update();
            });
          },
        },
      ],
      undoManager: { maxUndoSteps: 10, mergeInterval: 0 },
    });
    doc.forceCommit();
    const [node] = text(doc, "original");
    doc.undoManager.skipUndo(() => doc.root.append(node!));
    doc.forceCommit();
    normalize = true;
    doc.undoManager.skipUndo(() => {
      node!.state.value.set("excluded");
      // Explicit commit inside the scope must not suppress the normalizer.
      doc.forceCommit();
    });
    expect(node!.state.value.get()).toBe("normalized");
    expect(doc.undoManager.canUndo()).toBe(!skipNormalization);
    normalize = false;
    if (!skipNormalization) {
      doc.undoManager.undo();
      expect(node!.state.value.get()).toBe("excluded");
      doc.undoManager.redo();
      expect(node!.state.value.get()).toBe("normalized");
    }
  });
}

test("mixed history and metadata survive export/import without recreating IDs", () => {
  const source = createTextDocWithUndo();
  const [node] = text(source, "seed");
  source.undoManager.skipUndo(() => source.root.append(node!));
  node!.state.value.set("edited");
  const off = source.undoManager.onPush(({ meta }) =>
    meta.set("focusedId", node!.id),
  );
  source.forceCommit();
  const history = source.undoManager.exportHistory();
  off();
  const replacement = Doc.fromJSON(
    {
      type: "root",
      extensions: [TextExtension],
      undoManager: { maxUndoSteps: 10, mergeInterval: 0 },
    },
    source.toJSON(),
  );
  replacement.forceCommit();
  replacement.undoManager.importHistory(history);
  let restoredId: unknown;
  replacement.undoManager.onPop(({ meta }) => {
    restoredId = meta.get("focusedId");
  });
  replacement.undoManager.undo();
  expect(restoredId).toBe(node!.id);
  assertDoc(replacement, ["seed"]);
  expect(replacement.root.first!.id).toBe(node!.id);
  replacement.undoManager.redo();
  assertDoc(replacement, ["edited"]);
});

describe("shared inverse storage", () => {
  test("ordinary mutations reuse the transaction inverse without undo differences", () => {
    const doc = createTextDocWithUndo();
    const [node] = text(doc, "0");
    doc.undoManager.skipUndo(() => doc.root.append(node!));
    doc.forceCommit();
    node!.state.value.set("1");
    const inverse = doc["_inverseOperations"];
    expect(doc).not.toHaveProperty("_undoCapture");
    expect(doc["_undoChanges"]).toBeUndefined();
    doc.forceCommit();
    expect(doc.undoManager["_undoStack"].at(-1)!.operations).toBe(inverse);
  });

  test("the manager owns the skip scope and Doc has no public skipUndo method", () => {
    const doc = createTextDocWithUndo();
    expect(doc).not.toHaveProperty("skipUndo");
    expect(doc.undoManager).toHaveProperty("skipUndo", expect.any(Function));
  });
});

describe("sparse undo differences", () => {
  test("only the field with a different inverse is overridden; other patches are shared", () => {
    const doc = createTextDocWithUndo();
    const [node, other] = text(doc, "0", "other");
    doc.undoManager.skipUndo(() => doc.root.append(node!, other!));
    doc.forceCommit();
    doc.undoManager.skipUndo(() => node!.state.value.set("1"));
    node!.state.value.set("2");
    other!.state.value.set("edited");
    const inverse = doc["_inverseOperations"];
    expect(doc["_undoChanges"]!.nodes!.get(node!.id)!.state).toStrictEqual(
      new Map([["value", JSON.stringify("1")]]),
    );
    expect(doc["_undoChanges"]!.nodes!.has(other!.id)).toBe(false);
    doc.forceCommit();
    const undo = doc.undoManager["_undoStack"].at(-1)!.operations;
    expect(undo[0]).toBe(inverse[0]);
    expect(undo[1][other!.id]).toBe(inverse[1][other!.id]);
    expect(inverse[1][node!.id]!.value).toBe(JSON.stringify("0"));
    doc.undoManager.undo();
    assertDoc(doc, ["1", "other"]);
    doc.undoManager.redo();
    assertDoc(doc, ["2", "edited"]);
  });

  test("a normal child of an excluded folder needs an undo-only inverse", () => {
    const doc = createTextDocWithUndo();
    const [folder, child, sibling] = text(doc, "folder", "child", "sibling");
    doc.undoManager.skipUndo(() => doc.root.append(folder!));
    folder!.append(child!);
    folder!.append(sibling!);
    child!.move(doc.root, "append");
    const inverse = doc["_inverseOperations"];
    const move = inverse[0].at(-1)!;
    doc.forceCommit();
    const undo = doc.undoManager["_undoStack"].at(-1)!.operations;
    expect(undo[0][0]).toBe(move);
    doc.undoManager.undo();
    assertDoc(doc, ["folder"]);
    expect(doc.getNodeById(folder!.id)).toBe(folder);
    doc.undoManager.redo();
    assertDoc(doc, ["folder", "__sibling", "child"]);
    expect(doc.root.last!.id).toBe(child!.id);
  });

  test("deleting a normal child of an excluded parent leaves no history", () => {
    const doc = createTextDocWithUndo();
    const [folder, child] = text(doc, "folder", "child");
    doc.undoManager.skipUndo(() => doc.root.append(folder!));
    folder!.append(child!);
    child!.delete();
    doc.forceCommit();
    expect(doc.undoManager.canUndo()).toBe(false);
    assertDoc(doc, ["folder"]);
  });

  test("excluded writes that undo themselves release their state differences", () => {
    const doc = createTextDocWithUndo();
    const [node] = text(doc, "0");
    doc.undoManager.skipUndo(() => doc.root.append(node!));
    doc.forceCommit();
    doc.undoManager.skipUndo(() => {
      node!.state.value.set("1");
      expect(doc["_undoChanges"]).toBeDefined();
      node!.state.value.set("0");
      expect(doc["_undoChanges"]).toBeUndefined();
    });
    node!.state.value.set("2");
    const inverse = doc["_inverseOperations"];
    doc.forceCommit();
    expect(doc.undoManager["_undoStack"].at(-1)!.operations).toBe(inverse);
    doc.undoManager.undo();
    assertDoc(doc, ["0"]);
  });
});

describe("undo cancellation at commit", () => {
  test("an excluded write can cancel the only undoable field without clearing redo", () => {
    const doc = createTextDocWithUndo();
    const [node] = text(doc, "0");
    doc.undoManager.skipUndo(() => doc.root.append(node!));
    doc.forceCommit();
    node!.state.value.set("previous");
    doc.forceCommit();
    doc.undoManager.undo();
    const history = doc.undoManager.exportHistory();
    node!.state.value.set("1");
    doc.undoManager.skipUndo(() => node!.state.value.set("0"));
    doc.forceCommit();
    expect(doc.undoManager.exportHistory()).toStrictEqual(history);
    expect(doc.undoManager.canUndo()).toBe(false);
  });

  test("cancelled fields are omitted while unrelated undo state remains shared", () => {
    const doc = createTextDocWithUndo();
    const [node, other] = text(doc, "0", "other");
    doc.undoManager.skipUndo(() => doc.root.append(node!, other!));
    doc.forceCommit();
    node!.state.value.set("1");
    other!.state.value.set("edited");
    doc.undoManager.skipUndo(() => node!.state.value.set("0"));
    const inverse = doc["_inverseOperations"];
    doc.forceCommit();
    const undo = doc.undoManager["_undoStack"].at(-1)!.operations;
    expect(undo[1][node!.id]).toBeUndefined();
    expect(undo[1][other!.id]).toBe(inverse[1][other!.id]);
    doc.undoManager.undo();
    assertDoc(doc, ["0", "other"]);
  });

  test("pruning no-op state preserves the complete inverse when normalization changes structure", () => {
    const Pair = defineNode({
      type: "pair",
      state: { first: string("0"), second: string("0") },
    });
    let addDuringNormalize = false;
    const doc = new Doc({
      type: "root",
      undoManager: { maxUndoSteps: 10 },
      extensions: [
        {
          nodes: [Pair],
          register(doc) {
            doc.onNormalize(() => {
              if (!addDuringNormalize) return;
              addDuringNormalize = false;
              doc.undoManager.skipUndo(() =>
                doc.root.append(doc.createNode(Pair)),
              );
            });
          },
        },
      ],
    });
    const node = doc.createNode(Pair);
    doc.root.append(node);
    doc.forceCommit();
    const events: ChangeEvent[] = [];
    doc.onChange((event) => events.push(event));
    addDuringNormalize = true;
    const unchanged = {
      first: JSON.stringify("0"),
      second: JSON.stringify("0"),
    };
    doc.applyOperations([[], { [node.id]: unchanged }]);
    expect(doc.undoManager.canUndo()).toBe(false);
    expect(events).toHaveLength(1);
    expect(events[0]!.inverseOperations[1][node.id]).toStrictEqual(unchanged);
    expect(doc.root.first!.next).toBe(doc.root.last);
    expect(doc.root.last).not.toBe(node);
  });

  test("undo of a new parent also removes its excluded descendants and shares the inverse", () => {
    const doc = createTextDocWithUndo();
    const [parent, child] = text(doc, "parent", "child");
    doc.root.append(parent!);
    doc.undoManager.skipUndo(() => parent!.append(child!));
    const inverse = doc["_inverseOperations"];
    doc.forceCommit();
    expect(doc.undoManager["_undoStack"].at(-1)!.operations).toBe(inverse);
    doc.undoManager.undo();
    assertDoc(doc, []);
    doc.undoManager.redo();
    assertDoc(doc, ["parent", "__child"]);
  });
});
