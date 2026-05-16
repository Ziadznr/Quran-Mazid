import quranEn from "quran-json/dist/quran_en.json";
import quranBn from "quran-json/dist/quran_bn.json";

export type Verse = {
  id: number;
  text: string;
  translation: string;
  bnTranslation?: string;
};

export type Surah = {
  id: number;
  name: string;
  transliteration: string;
  translation: string;
  type: "meccan" | "medinan";
  total_verses: number;
  verses: Verse[];
};

export type SearchVerse = Verse & {
  surahId: number;
  surahName: string;
  surahEnglish: string;
};

export type PageVerse = Verse & {
  surahId: number;
  surahName: string;
  surahEnglish: string;
  revelationType: Surah["type"];
};

export type QuranPage = {
  page: number;
  title: string;
  subtitle: string;
  verses: PageVerse[];
};

export const surahs = quranEn as Surah[];
const banglaSurahs = quranBn as Surah[];

function withBanglaTranslation(surah: Surah): Surah {
  const banglaSurah = banglaSurahs.find((item) => item.id === surah.id);

  return {
    ...surah,
    verses: surah.verses.map((verse) => ({
      ...verse,
      bnTranslation: banglaSurah?.verses.find((item) => item.id === verse.id)?.translation,
    })),
  };
}

export function getSurah(id: number) {
  return withBanglaTranslation(surahs.find((surah) => surah.id === id) ?? surahs[0]);
}

export function getSurahSummaries() {
  return surahs.map(({ id, name, transliteration, translation, type, total_verses }) => ({
    id,
    name,
    transliteration,
    translation,
    type,
    total_verses,
  }));
}

export function getSearchIndex(): SearchVerse[] {
  return surahs.flatMap((surah) =>
    surah.verses.map((verse) => ({
      ...verse,
      bnTranslation: banglaSurahs[surah.id - 1]?.verses[verse.id - 1]?.translation,
      surahId: surah.id,
      surahName: surah.name,
      surahEnglish: surah.transliteration,
    })),
  );
}

export function getPageCount() {
  const versesAfterFatihah = surahs.slice(1).reduce((total, surah) => total + surah.verses.length, 0);
  return 1 + Math.ceil(versesAfterFatihah / 5);
}

export function getPageForAyah(surahId: number, verseId: number) {
  if (surahId <= 1) {
    return 1;
  }

  const versesBeforeSurah = surahs
    .slice(1, surahId - 1)
    .reduce((total, surah) => total + surah.verses.length, 0);
  const zeroBasedAfterFatihah = versesBeforeSurah + Math.max(verseId - 1, 0);

  return 2 + Math.floor(zeroBasedAfterFatihah / 5);
}

export function getQuranPage(page: number): QuranPage {
  const pageCount = getPageCount();
  const safePage = Math.min(Math.max(page, 1), pageCount);

  if (safePage === 1) {
    const fatihah = surahs[0];
    return {
      page: 1,
      title: "Page 01",
      subtitle: `${fatihah.transliteration}, Ayah-${fatihah.total_verses}, Makkah`,
      verses: fatihah.verses.map((verse) => ({
        ...verse,
        bnTranslation: banglaSurahs[0]?.verses[verse.id - 1]?.translation,
        surahId: fatihah.id,
        surahName: fatihah.name,
        surahEnglish: fatihah.transliteration,
        revelationType: fatihah.type,
      })),
    };
  }

  const offset = (safePage - 2) * 5;
  const verses = surahs
    .slice(1)
    .flatMap((surah) =>
      surah.verses.map((verse) => ({
        ...verse,
        bnTranslation: banglaSurahs[surah.id - 1]?.verses[verse.id - 1]?.translation,
        surahId: surah.id,
        surahName: surah.name,
        surahEnglish: surah.transliteration,
        revelationType: surah.type,
      })),
    )
    .slice(offset, offset + 5);
  const first = verses[0];
  const last = verses[verses.length - 1];
  const pageLabel = safePage.toString().padStart(2, "0");

  return {
    page: safePage,
    title: `Page ${pageLabel}`,
    subtitle: first
      ? `${first.surahEnglish} ${first.surahId}:${first.id} - ${last.surahEnglish} ${last.surahId}:${last.id}`
      : "Quran page",
    verses,
  };
}

export function formatSurahNumber(id: number) {
  return id.toString().padStart(3, "0");
}

export function audioUrl(surahId: number, verseId: number) {
  return `https://everyayah.com/data/Alafasy_128kbps/${formatSurahNumber(surahId)}${verseId
    .toString()
    .padStart(3, "0")}.mp3`;
}
