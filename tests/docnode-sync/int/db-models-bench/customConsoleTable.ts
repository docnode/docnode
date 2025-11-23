// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/* eslint-disable */

export function customConsoleTable(data: object[] | object): void {
  if (!Array.isArray(data)) {
    data = [data];
  }

  const keys = Array.from(new Set(data.flatMap((item) => Object.keys(item))));

  const columnWidths = keys.map((key) =>
    Math.max(
      key.length,
      ...data.map((row) => String((row as any)[key] || "").length),
    ),
  );

  const createRow = (values: string[], isHeader = false) => {
    const row = values
      .map((value, i) => value.padEnd(columnWidths[i]))
      .join(" │ ");
    return isHeader ? `│ ${row} │` : `│ ${row} │`;
  };

  const createBorder = (char: string) =>
    `┌${columnWidths.map((width) => char.repeat(width + 2)).join("┬")}┐`;

  const createDivider = () =>
    `├${columnWidths.map((width) => "─".repeat(width + 2)).join("┼")}┤`;

  const topBorder = createBorder("─");
  const headerRow = createRow(keys, true);
  const divider = createDivider();
  const bodyRows = data.map((row) =>
    createRow(keys.map((key) => String(key in row ? (row as any)[key] : ""))),
  );
  const bottomBorder = createBorder("─");

  console.log(
    [topBorder, headerRow, divider, ...bodyRows, bottomBorder].join("\n"),
  );
}
