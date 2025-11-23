import {
  type StateDefinition,
  type DefaultStateMethods,
  type Json,
  type DefaultJ,
} from "./types.js";

export const string = (defaultValue: string) =>
  defineState({
    fromJSON: (json) => (typeof json === "string" ? json : defaultValue),
  });

export const number = (defaultValue: number) =>
  defineState({
    fromJSON: (json) => (typeof json === "number" ? json : defaultValue),
  });

export const boolean = (defaultValue: boolean) =>
  defineState({
    fromJSON: (json) => (json === 0 ? false : json === 1 ? true : defaultValue),
    toJSON: (value) => (!value ? 0 : 1),
  });

/**
 * **Important**: Due to {@link https://www.totaltypescript.com/property-order-matters a limitation in TypeScript},
 * The order of the properties in this function's parameter matters. **`fromJSON`
 * must come first**, otherwise the inference won't work correctly..
 *
 *
 * @param definition.fromJSON - This function must return a default value when called with `undefined`,
 * otherwise it should parse the given JSON value to your type V. Note
 * that it is not required to copy or clone the given value, you can
 * pass it directly through if it matches the expected type.
 *
 * When you encounter an invalid value, it's up to you to decide
 * as to whether to ignore it and return the default value,
 * return some non-default error value, or throw an error.
 *
 * It is possible for V to include undefined, but if it does, then
 * it should also be considered the default value since undefined
 * can not be serialized to JSON so it is indistinguishable from the
 * default.
 *
 * Similarly, if your V is a function, then usage of set method
 * must use an updater function because your type will be indistinguishable
 * from an updater function.
 *
 * @param definition.toJSON - This is optional and for advanced use cases only.
 * Specifically, you only need to define a `toJSON` if the `fromJSON` can return
 * a non-JSON serializable value (your V type is not Json).
 *
 * @param definition.methods - This is optional and for advanced use cases only.
 * Optional function to extend the default state methods with custom functionality.
 * Returns an object that typically spreads the default methods and adds custom ones.
 * The default methods are: `get`, `getPrev`, `set`.
 * - `get` returns the current value of the state property. You should not mutate the value directly.
 * - `getPrev` returns should be used only inside transactions (`doc.update` or `doc.onNormalize`). It
 * returns the value of the state property the node had at the beginning of the transaction.
 * You should not mutate the value directly.
 * - `set` sets the value of the state property. You can either set it directly or use an updater function.
 * Example: `node.state.foo.set(value)` or `node.state.foo.set((current) => current + 1)`.
 *
 *
 *
 * @example
 * You can customize the methods.
 * ```ts
 * const counterState = defineState<number, number>({
 *   fromJSON: (json) => typeof json === "number" ? json : 0,
 *   methods: (defaultMethods) => ({
 *     ...defaultMethods,
 *     increment: () => defaultMethods.set(prev => prev + 1)
 *   })
 * });
 * // Type of counterState.methods is inferred as { get, getPrev, set, increment }
 * ```
 */

// Overload: toJSON provided, methods provided
export function defineState<V, J extends Json, M>(definition: {
  fromJSON: (json: unknown) => V;
  toJSON: (value: V) => J;
  methods: (methods: DefaultStateMethods<V>) => M;
}): StateDefinition<V, J, M>;

// Overload: toJSON provided, methods omitted
export function defineState<V, J extends Json>(definition: {
  fromJSON: (json: unknown) => V;
  toJSON: (value: V) => J;
}): StateDefinition<V, J, DefaultStateMethods<V>>;

// Overload: toJSON omitted, methods provided
export function defineState<V, M>(definition: {
  fromJSON: (json: unknown) => V;
  methods: (methods: DefaultStateMethods<V>) => M;
}): StateDefinition<V, DefaultJ<V>, M>;

// Overload: toJSON omitted, methods omitted
export function defineState<V>(definition: {
  fromJSON: (json: unknown) => V;
}): StateDefinition<V, DefaultJ<V>, DefaultStateMethods<V>>;

// Implementation
export function defineState<
  V,
  J extends Json = DefaultJ<V>,
  M = DefaultStateMethods<V>,
>(definition: StateDefinition<V, J, M>): StateDefinition<V, J, M> {
  return definition;
}
