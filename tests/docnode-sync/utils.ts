import { expect, type BrowserContext, type Page } from "@playwright/test";

export async function initTest(
  page: Page,
  context: BrowserContext,
): Promise<[Page, Page]> {
  await page.goto("");
  const newPage = await context.newPage();
  await newPage.goto("");
  return [page, newPage];
}

/**
 * If pages is an array of two pages, it will test the state of the main doc (should be the same in both pages).
 * If pages is a single page, it will test the state of the secondary doc.
 */
export async function assertDoc(pages: [Page, Page] | Page, state: string[]) {
  state.unshift("root");
  const testPage = async (page: Page, doc: "main" | "secondary") => {
    const docNodes = page.locator(`.${doc}-doc .docnode span`);
    const count = await docNodes.count();

    // note the / 2!
    for (let i = 0; i < count / 2; i++) {
      const text = await docNodes.nth(i).textContent();
      if (!text) {
        throw new Error("Text is null");
      }
      const textBeforeDash = text.split("-")[0]?.trim();
      expect(textBeforeDash).toBe(state[i]?.replace(/__/g, ""));

      // TODO for secondary
      if (doc === "main") {
        const rect = await docNodes
          .nth(i)
          .evaluate((el) => el.getBoundingClientRect());
        const indent = i === 0 ? 0 : (state[i]?.match(/__/g)?.length ?? 0) + 1;
        expect(rect.left).toBe(indent * 40);
      }
    }
    // expect the first .docnode-doc to be equal to the second one
    const docLocator = page.locator(
      doc === "main" ? ".main-doc" : ".secondary-doc",
    );
    const html1 = await docLocator.nth(0).innerHTML();
    const html2 = await docLocator.nth(1).innerHTML();
    expect(html1).toEqual(html2);
  };
  if (Array.isArray(pages)) {
    for (const page of pages) {
      await testPage(page, "main");
    }
  } else {
    await testPage(pages, "secondary");
  }
}

export async function createDocNode(
  pages: [Page, Page],
  name: string,
  doc: "main" | "secondary" = "main",
) {
  const page = pages[0];
  const createButton = page
    .locator(`.${doc}-doc .docnode`)
    .filter({ hasText: new RegExp(`^${name} - `) })
    .locator("button.create");
  await expect(createButton).toHaveCount(2);
  await createButton.nth(1).click();
}

export async function deleteDocNode(
  pages: [Page, Page],
  name: string,
  doc: "main" | "secondary" = "main",
) {
  const page = pages[0];
  const deleteButton = page
    .locator(`.${doc}-doc .docnode`)
    .filter({ hasText: new RegExp(`^${name} - `) })
    .locator("button.delete");
  await expect(deleteButton).toHaveCount(2);
  await deleteButton.nth(1).click();
}

export async function openDoc(page: Page, name: string) {
  const docLocator = page
    .locator(".main-doc .docnode span")
    .filter({ hasText: new RegExp(`^${name} - `) });
  await expect(docLocator).toHaveCount(2);
  await docLocator.nth(0).click();
  await docLocator.nth(1).click();
}
