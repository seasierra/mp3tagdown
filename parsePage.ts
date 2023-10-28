import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import ProgressBar from "https://deno.land/x/progress@v1.3.9/mod.ts";
import { downloadFile } from "./downloadFile.ts";
import { CSVSheet, db, template, createID3, catched } from "./utils.ts";
import { Promise as ID3, Tags } from "npm:node-id3";
import { parse } from "https://deno.land/std@0.202.0/flags/mod.ts";

import { PAGE_URL } from "./const.js";

export type DBItem = {
  id: string;
  url: string;
  tags: Tags;
};

export async function fetchItems() {
  try {
    const res = await fetch(PAGE_URL);
    const buffer = await res.arrayBuffer();

    const decoder = new TextDecoder("koi8-r");

    const html = decoder.decode(buffer);

    const document = new DOMParser().parseFromString(html, "text/html");

    const links = document?.querySelectorAll("hr ~ a[href]");

    db.set(["size"], links?.length);

    links?.forEach((link) => {
      if (!link) return;

      const match = link?.previousSibling?.textContent.match(/(\d+) (\W+)/);

      if (!match) return;

      const [, trackNumber, artist] = match;

      const url = link.getAttribute("href") || "";

      db.set(["items", url], {
        id: url,
        url,
        resolved: null,
        tags: {
          trackNumber,
          artist: artist.trim().replaceAll('"', ""),
          title: link.textContent
            .replaceAll("\n", " ")
            .replaceAll('"', "")
            .trim(),
        },
      });
    });
  } catch (error) {
    console.log(error);
  }
}

export async function processFiles(options: {
  tags: Tags;
  folder: string;
  file: string;
}) {
  const progress = new ProgressBar({
    total: (await db.get(["size"])).value as number,
    complete: "=",
    incomplete: "-",
    display: ":completed/:total :text :time [:bar] :percent",
  });
  let index = 1;

  const sheet = new CSVSheet();

  for await (const item of db.list<DBItem>({ prefix: ["items"] })) {
    const itemTags = {
      ...item.value.tags,
      ...options.tags,
    } as Required<Tags>;

    const _ = template(itemTags);

    progress.render(index++, {
      text: _("[:artist] - [:title]"),
    });

    const [err, resolved] = await catched(
      downloadFile(item.value.url, [createID3(itemTags)])
    );

    db.set(["status", item.value.url], {
      status: resolved || err?.message,
    });
  }

  sheet.save("~index");
}
export async function organizeByHeading(addTags) {
  const res = await fetch(PAGE_URL);
  const buffer = await res.arrayBuffer();

  const decoder = new TextDecoder("koi8-r");

  const html = decoder.decode(buffer);

  const document = new DOMParser().parseFromString(html, "text/html");

  let lists = {};
  let lastName = "";

  document.querySelectorAll("h3, a").forEach((el) => {
    if (el.tagName === "H3") {
      lastName = el.textContent;
    }

    if (!lists[lastName]) {
      lists[lastName] = [];
    }

    if (Object.keys(lists).length === 2) return;

    const [idx] = el.previousSibling?.textContent.match(/\d+/) || [];

    lists[lastName].push({
      title: el.textContent.replaceAll("\n", " ").replaceAll('"', "").trim(),
      url: el.getAttribute("href"),
      idx,
    });
  });

  const progress = new ProgressBar({
    total: (await db.get(["size"])).value as number,
    complete: "=",
    incomplete: "-",
    display: ":completed/:total :text :time [:bar] :percent",
  });
  let index = 1;

  const sheet = new CSVSheet();

  const { new: newFolder } = parse(Deno.args, {
    boolean: ["new"],
  });

  if (newFolder) {
    await Deno.remove("./dest", { recursive: true });
  }

  for (const [artist, tracks] of Object.entries(lists)) {
    for await (const track of tracks.values()) {
      if (!track.idx) continue;

      const itemTags = {
        artist,
        title: track.title,
        trackNumber: track.idx,
        ...addTags,
      };

      const _ = template(itemTags);

      progress.render(index++, {
        text: _("[:artist] - [:title]"),
      });

      // await new Promise((res) => setTimeout(res, 1000));

      const [err, resolved] = await catched(
        downloadFile(track.url, itemTags, (t) => sheet.pushItem(t))
      );

      // if (err) console.error(err);
    }
  }

  sheet.save("~index");
}
