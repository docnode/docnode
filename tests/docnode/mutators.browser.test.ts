import { expect, test, describe } from "vitest";

// these are tests for the DOM API with behaviors that need more thought
// about how should behave in DocNode.

// Helper function to create elements with text content
function createElement(tag: string, text: string): HTMLElement {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}

// Helper function to get text content of all children in order
function getChildrenText(parent: Element): string[] {
  return Array.from(parent.children).map((child) => child.textContent ?? "");
}

test("append element that is already attached should move it", () => {
  const parent1 = document.createElement("div");
  const parent2 = document.createElement("div");
  const child = createElement("span", "child");

  parent1.append(child);
  expect(parent1.children.length).toBe(1);
  expect(parent2.children.length).toBe(0);

  parent2.append(child);
  expect(parent1.children.length).toBe(0);
  expect(parent2.children.length).toBe(1);
  expect(parent2.firstElementChild).toBe(child);
});

test("insertBefore with reference from different parent should move", () => {
  const parent1 = document.createElement("div");
  const parent2 = document.createElement("div");
  const child1 = createElement("span", "1");
  const child2 = createElement("span", "2");
  const child3 = createElement("span", "3");

  parent1.append(child1, child2);
  parent2.append(child3);

  expect(getChildrenText(parent1)).toStrictEqual(["1", "2"]);
  expect(getChildrenText(parent2)).toStrictEqual(["3"]);

  parent1.insertBefore(child3, child2);
  expect(getChildrenText(parent1)).toStrictEqual(["1", "3", "2"]);
  expect(getChildrenText(parent2)).toStrictEqual([]);
});

test("remove unattached element should not throw", () => {
  const element = createElement("div", "test");
  expect(() => element.remove()).not.toThrow();
});

describe("DOM API mutators - replaceChildren", () => {
  test("replaceChildren with empty arguments should clear all children", () => {
    const parent = document.createElement("div");
    const child1 = createElement("span", "1");
    const child2 = createElement("span", "2");
    const child3 = createElement("span", "3");

    parent.append(child1, child2, child3);
    expect(getChildrenText(parent)).toStrictEqual(["1", "2", "3"]);

    parent.replaceChildren();
    expect(parent.children.length).toBe(0);
  });

  // Maybe: What should happen if the element is not in the Doc in DocNode?
  test("remove element that is not in DOM should not throw", () => {
    const element = createElement("div", "test");
    expect(() => element.remove()).not.toThrow();
  });
});
