import { pathToFileURL } from "node:url";

export function isCliMain(metaUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }

  return metaUrl === pathToFileURL(entry).href;
}
