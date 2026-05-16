import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { getSearchIndex, getSurah, getSurahSummaries } from "@/lib/quran";

const app = new Hono();

app.use("*", cors());

app.get("/", (context) =>
  context.json({
    name: "Quran Mazid Clone API",
    endpoints: ["/surahs", "/surahs/:id", "/search?q=mercy"],
  }),
);

app.get("/surahs", (context) => context.json(getSurahSummaries()));

app.get("/surahs/:id", (context) => {
  const id = Number(context.req.param("id"));
  if (!Number.isInteger(id) || id < 1 || id > 114) {
    return context.json({ error: "Surah not found" }, 404);
  }

  return context.json(getSurah(id));
});

app.get("/search", (context) => {
  const query = (context.req.query("q") ?? "").trim().toLowerCase();
  if (query.length < 2) {
    return context.json([]);
  }

  const results = getSearchIndex()
    .filter((verse) => {
      return (
        verse.translation.toLowerCase().includes(query) ||
        verse.text.includes(query) ||
        verse.surahEnglish.toLowerCase().includes(query)
      );
    })
    .slice(0, 50);

  return context.json(results);
});

serve(
  {
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 8787),
  },
  (info) => {
    console.log(`Hono API listening on http://localhost:${info.port}`);
  },
);
