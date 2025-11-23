import {
  boolean,
  number,
  type NodeDefinition,
  type StateRecord,
  defineState,
} from "docnode";
import * as v from "valibot";

const sharedWithSchema = v.record(
  // The key is the clientId or "anyone" if the doc is public
  v.string(),
  v.object({
    isInMemory: v.boolean(),
    accessType: v.union([v.literal("view"), v.literal("edit")]),
  }),
);

export type SharedWith = v.InferOutput<typeof sharedWithSchema>;

const sharedWith = defineState({
  fromJSON: (json) => {
    const parsed = v.parse(sharedWithSchema, json);
    return { ...parsed };
  },
  toJSON: (value) => {
    return v.parse(sharedWithSchema, value);
  },
});

const partialIndexStateRecord: StateRecord = {
  isInMemory: boolean(false),
  localVersion: number(0),
  serverVersion: number(0),
  sharedWith,
};

export type IndexNodeDefinition<ND extends NodeDefinition> = NodeDefinition<
  ND["type"],
  ND["state"] & typeof partialIndexStateRecord
>;

export function createIndexNode<
  T extends string = string,
  S extends StateRecord = StateRecord,
>(nodeDefinition: NodeDefinition<T, S>) {
  const state = nodeDefinition.state;
  if (
    "isInMemory" in state ||
    "localVersion" in state ||
    "serverVersion" in state ||
    "sharedWith" in state
  ) {
    throw new Error(
      "isInMemory, localVersion, serverVersion, and sharedWith are reserved state keys and cannot be used",
    );
  }
  nodeDefinition.state = {
    ...state,
    ...partialIndexStateRecord,
  };
  return nodeDefinition as IndexNodeDefinition<typeof nodeDefinition>;
}
