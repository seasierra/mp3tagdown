import { ensureFile } from "https://deno.land/std/fs/ensure_file.ts";
import { exists } from "https://deno.land/std/fs/mod.ts";

import { DESTINATION_DIR, PAGE_URL } from "./const.js";
import { resolve, writeID3 } from "./utils.ts";
import { Promise as ID3, Tags } from "npm:node-id3";
import { trace } from "https://deno.land/std@0.173.0/node/internal_binding/constants.ts";

export async function pipeFileStream(fileName: string) {
  const filePath = resolve.path(DESTINATION_DIR, fileName);
}

export async function downloadFile(
  fileName: string,
  tags: any,
  pushTo: (tags: any) => void
) {
  const src = resolve.url(PAGE_URL, fileName);
  const filePath = resolve.path(DESTINATION_DIR, fileName);

  if (await exists(filePath))
    return Deno.open(filePath, {
      truncate: true,
      write: true,
    });

  if (!(src.startsWith("http://") || src.startsWith("https://"))) {
    throw new TypeError("URL must start with be http:// or https://");
  }

  const resp = await fetch(src);
  if (!resp.ok) {
    throw new Deno.errors.BadResource(
      `Request failed with status ${resp.status}`
    );
  } else if (!resp.body) {
    throw new Deno.errors.UnexpectedEof(
      `The download url ${src} doesn't contain a file to download`
    );
  } else if (resp.status === 404) {
    throw new Deno.errors.NotFound(
      `The requested url "${src}" could not be found`
    );
  }

  await ensureFile(filePath);
  const file = await Deno.open(filePath, {
    truncate: true,
    write: true,
  });

  await resp.body.pipeTo(file.writable);

  await ID3.write(tags, filePath);

  pushTo({
    path: fileName,
    ...tags,
  });

  // for await (const buffer of bufferArr.values()) {
  //   file.write(buffer);
  //   file.close();
  // }

  return file;
}
