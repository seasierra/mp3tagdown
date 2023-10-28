import { resolve as resolveURL } from "https://deno.land/std@0.173.0/node/url.ts";
import { resolve as resolvePath } from "https://deno.land/std@0.204.0/path/resolve.ts";
import { Promise as NodeID3, Tags } from "npm:node-id3";
import { writeCSV, writeCSVObjects } from "https://deno.land/x/csv/mod.ts";

const delayLoop = (fn: (arg0: any) => void, delay: number) => {
  return (x: any, i: number) => {
    setTimeout(() => {
      fn(x);
    }, i * delay);
  };
};

export async function* delayed<T>(list: T[], delay = 1000) {
  for (const item of list) {
    yield item;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

export const delayedEach = <T>(list: T[], fn: (x: any) => any, delay = 1000) =>
  list.forEach(delayLoop(fn, delay));

export class CSVSheet<
  H extends ["Path", "Artist", "Album", "Title"] = [
    "Path",
    "Artist",
    "Album",
    "Title"
  ]
> {
  private headers: H[number][] = ["Path", "Artist", "Album", "Title"];
  private rows: string[][] = [this.headers];

  pushItem(item: {
    [K in Lowercase<H[number]>]: string;
  }) {
    // deno-lint-ignore ban-ts-comment
    //@ts-ignore
    this.rows.push(this.headers.map((key) => item[key.toLowerCase()]));
  }

  async save(fileName: string, folder = "dest") {
    const file = await Deno.create(`./${folder}/${fileName}.csv`);

    console.log(this.rows);

    writeCSV(file, this.rows);
  }
}

export const template =
  <T extends {}>(data: T) =>
  (str: string) =>
    Object.entries(data).reduce(
      (result, [key, value]) => result.replaceAll(`[:${key}]`, value),
      str
    );

export const db = await Deno.openKv("./db");

export function templatePaths(name, folder) {
  const _ = template(itemTags);

  const fileName = _(name);
  const filePath = resolve(_(options.folder), fileName);
}

export const createID3 = (tags: Tags) => NodeID3.create(tags);

export function writeID3(tags: Tags) {
  return async (file: Deno.FsFile) => {
    const buffer = await NodeID3.create(tags);

    return file.write(buffer);
  };
}

export async function catched<T>(
  promise: Promise<T>
): Promise<[Error | null, T | null]> {
  let err = null;
  let resp = null;

  await promise
    .then((res) => {
      resp = res;
    })
    .catch((error) => {
      err = error;
    });

  return [err, resp];
}

export const resolve = {
  url: resolveURL,
  path: resolvePath,
};
