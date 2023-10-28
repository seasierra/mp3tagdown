import { fetchItems, organizeByHeading, processFiles } from "./parsePage.ts";

await fetchItems();

// await processFiles({
//   tags: {
//     album: "Зиланткон-2009",
//     year: "2009",
//   },
//   file: "[:trackNumber].[:artist]-[:title].mp3",
//   folder: "./dest/",
// });

await organizeByHeading({
  album: "Зиланткон-2009",
  year: "2009",
});

generateCSV();
