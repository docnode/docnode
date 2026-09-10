import { test } from "@playwright/test";

import {
  collapsed,
  INITIAL_BLOCKS,
  ORIGINAL_REFERENCE_SELECTION,
  THIRD_PARAGRAPH,
  createEditorPair,
  EditorHelper,
} from "./utils.js";

test("undo should restore the local selection", async ({ page }) => {
  const dn = await EditorHelper.create({ page });

  await dn.reference.selectRange(THIRD_PARAGRAPH, 2, 7);
  await dn.reference.type("x");
  await dn.assertContent(["Item one.", "Item two.", "Itxree."]);
  await dn.reference.assertSelection(collapsed(3));

  await dn.reference.press("ControlOrMeta+z");
  await dn.assertContent(INITIAL_BLOCKS);
  await dn.reference.assertSelection(ORIGINAL_REFERENCE_SELECTION);

  await dn.reference.type("x");
  await dn.assertContent(["Item one.", "Item two.", "Itxree."]);
  await dn.reference.assertSelection(collapsed(3));
});

test("immediate undo and redo should keep the correct local selections", async ({
  page,
}) => {
  const dn = await EditorHelper.create({ page });

  await dn.reference.selectRange(THIRD_PARAGRAPH, 2, 7);

  // No helper here: we want undo to happen immediately after typing, before
  // any extra wait that could hide a pending-transaction race.
  // This case also explains why UndoManager events expose `type`: the binding
  // needs to avoid attaching a pending selection to the wrong undo/redo push.
  await page.keyboard.insertText("x");
  await page.keyboard.press("ControlOrMeta+z");

  await dn.assertContent(INITIAL_BLOCKS);
  await dn.reference.assertSelection(ORIGINAL_REFERENCE_SELECTION);

  await page.keyboard.press("ControlOrMeta+Shift+z");
  await dn.assertContent(["Item one.", "Item two.", "Itxree."]);
  await dn.reference.assertSelection(collapsed(3));
});

test("should not undo remote operations, including remote rebroadcasts to other tabs", async ({
  page,
  context,
}) => {
  const { reference, remote } = await createEditorPair(page, context);
  const expectedBlocks = ["Item one.", "Item two.", "Itxree."];

  await remote.otherDevice.selectRange(THIRD_PARAGRAPH, 2, 7);
  await remote.otherDevice.type("x");
  await reference.assertContent(expectedBlocks);
  await remote.assertContent(expectedBlocks);

  await reference.reference.pressAndAssertSelectionUnchanged("ControlOrMeta+z");
  await reference.assertContent(expectedBlocks);
  await remote.assertContent(expectedBlocks);

  await reference.otherTab.pressAndAssertSelectionUnchanged("ControlOrMeta+z");
  await reference.assertContent(expectedBlocks);
  await remote.assertContent(expectedBlocks);

  // Just in case, test that local undo works on the originating device
  await remote.otherDevice.press("ControlOrMeta+z");
  await reference.assertContent(INITIAL_BLOCKS);
  await remote.assertContent(INITIAL_BLOCKS);
  await remote.otherDevice.assertSelection(ORIGINAL_REFERENCE_SELECTION);
});

test("another browser tab cannot undo local edits or undo and redo broadcasts", async ({
  page,
  context,
}) => {
  const { reference, remote: otherPage } = await createEditorPair(
    page,
    context,
  );
  const edited = ["Item one.", "Item two.", "Itxree."];

  await reference.reference.selectRange(THIRD_PARAGRAPH, 2, 7);
  await reference.reference.type("x");
  await otherPage.assertContent(edited);

  await otherPage.reference.pressAndAssertSelectionUnchanged("ControlOrMeta+z");
  await otherPage.assertContent(edited);
  await reference.assertContent(edited);

  await reference.reference.press("ControlOrMeta+z");
  await otherPage.assertContent(INITIAL_BLOCKS);
  await otherPage.reference.pressAndAssertSelectionUnchanged("ControlOrMeta+z");
  await otherPage.assertContent(INITIAL_BLOCKS);
  await reference.assertContent(INITIAL_BLOCKS);

  await reference.reference.press("ControlOrMeta+Shift+z");
  await otherPage.assertContent(edited);
  await otherPage.reference.pressAndAssertSelectionUnchanged("ControlOrMeta+z");
  await otherPage.assertContent(edited);
  await reference.assertContent(edited);
});
