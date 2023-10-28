import { Promise as ID3, Tags } from "npm:node-id3";

import jsmediatags from "npm:jsmediatags";
import { recursiveReaddir } from "https://deno.land/x/recursive_readdir/mod.ts";

import { Buffer } from "https://deno.land/std@0.173.0/node/internal/buffer.mjs";
import { resolve } from "https://deno.land/std@0.204.0/path/resolve.ts";
import { CSVSheet, template } from "./utils.ts";
import { ensureFile } from "https://deno.land/std@0.204.0/fs/ensure_file.ts";

export const readTags = (path: string): Promise<Tags> =>
  new Promise((res, rej) =>
    new jsmediatags.Reader(path).read({
      onSuccess: (data: { tags: Tags }) => res(data.tags),
      onError: rej,
    })
  );

const sheet = new CSVSheet();

async function updateFilePaths(templateString: string) {
  const files = await recursiveReaddir("./dest");

  for await (const file of files.values()) {
    if (file.endsWith(".mp3")) {
      const tags = await readTags(file);

      const path = template(tags)(templateString);

      sheet.pushItem({
        ...(tags as any),
        path,
        status: "resolved",
      });

      await ensureFile(path);

      await Deno.rename(file, path);
    }
  }

  sheet.save("~index", "dist");
}

export async function generateCSV() {
  const files = await Deno.readDir("./dest");
  const csv = new CSVSheet();

  for await (const file of files) {
    if (file.name.endsWith(".mp3")) {
      const tags = await readTags(`./dest/${file.name}`);

      csv.pushItem({
        path: file.name,
        ...tags,
      });
    }
  }

  csv.save("~index");
}

generateCSV();

// updateFilePaths("dist/[:artist]/[:album]/[:track].[:artist]-[:title].mp3");
