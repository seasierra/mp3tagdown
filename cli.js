import { parse } from "https://deno.land/std@0.202.0/flags/mod.ts";

const { csv } = parse(Deno.args, {
  boolean: ["csv"],
});
