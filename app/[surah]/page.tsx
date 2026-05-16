import { notFound } from "next/navigation";
import QuranReader from "@/components/QuranReader";
import { getSearchIndex, getSurah, getSurahSummaries, surahs } from "@/lib/quran";

export function generateStaticParams() {
  return surahs.map((surah) => ({ surah: String(surah.id) }));
}

type SurahPageProps = {
  params: Promise<{ surah: string }>;
};

export async function generateMetadata({ params }: SurahPageProps) {
  const resolvedParams = await params;
  const surah = getSurah(Number(resolvedParams.surah));
  return {
    title: `${surah.transliteration} - Quran Reader`,
    description: `Read Surah ${surah.transliteration} with Arabic text, English translation, and recitation.`,
  };
}

export default async function SurahPage({ params }: SurahPageProps) {
  const resolvedParams = await params;
  const surahId = Number(resolvedParams.surah);

  if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) {
    notFound();
  }

  return (
    <QuranReader
      currentSurah={getSurah(surahId)}
      surahs={getSurahSummaries()}
      searchIndex={getSearchIndex()}
    />
  );
}
