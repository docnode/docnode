import { run, summary } from "mitata";

const benchFn = process.env.MITATA
  ? ((await import("mitata").then((m) => m.bench)) as (
      name: string,
      fn: () => void,
    ) => void)
  : await import("vitest").then((m) => m.bench);

export const describe = process.env.MITATA
  ? (name: string, fn: () => void) => {
      summary(fn);
    }
  : await import("vitest").then((m) => m.describe);

let debug = false;
export const assert = (condition: boolean, message: string) => {
  if (!debug) return;
  if (condition) console.log(`✅ ${message}`);
  else console.error(`❌ ${message}`);
};

export function bench(name: string, fn: () => void) {
  debug = true;
  fn(); // run once to make assertions
  debug = false;
  benchFn(name, fn);
}

export async function wrapper(fn: () => void | Promise<void>) {
  if (process.env.MITATA) {
    void fn();
    await run();
  } else {
    void fn();
  }
}
