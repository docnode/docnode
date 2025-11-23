/**
 * The selection will only be of the RangeSelection type
 * Unlike Lexical, it will be deterministic
 * - the only node that can have an offset is "text"
 * - for the above reasons, anchor and focus cannot be of type "text"
 *   or "element". To determine the type, look at the offset
 * - the offset cannot be equal to textLength unless the text node does not have a following sibling
 */
