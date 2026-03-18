import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { assessmentSchema } from "./schema.js";

async function collectJsonFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return collectJsonFiles(fullPath);
      }
      return entry.name.endsWith(".json") ? [fullPath] : [];
    }),
  );

  return files.flat();
}

async function main() {
  const contentRoot = path.resolve(
    import.meta.dirname,
    "../../../content/normalized",
  );
  const files = await collectJsonFiles(contentRoot);

  if (files.length === 0) {
    console.log("No normalized assessment JSON files found.");
    return;
  }

  for (const file of files) {
    const raw = await readFile(file, "utf8");
    const parsed = assessmentSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      console.error(`Invalid assessment file: ${file}`);
      console.error(parsed.error.format());
      process.exit(1);
    }
  }

  console.log(`Validated ${files.length} normalized assessment files.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
