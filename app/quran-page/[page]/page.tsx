import { notFound } from "next/navigation";
import QuranReader from "@/components/QuranReader";
import {
  getPageCount,
  getQuranPage,
  getSearchIndex,
  getSurahSummaries,
} from "@/lib/quran";

type QuranPageProps = {
  params: Promise<{ page: string }>;
};

// IMPORTANT:
// Do NOT statically generate all 1251 pages.
// This prevents huge Vercel output size.
export const dynamicParams = true;

// Optional ISR caching
export const revalidate = 86400;

export async function generateMetadata({
  params,
}: QuranPageProps) {
  const resolvedParams = await params;
  const pageNumber = Number(resolvedParams.page);

  if (
    !Number.isInteger(pageNumber) ||
    pageNumber < 1 ||
    pageNumber > getPageCount()
  ) {
    return {
      title: "Page Not Found",
    };
  }

  const page = getQuranPage(pageNumber);

  return {
    title: `${page.title} - Quran Reader`,
    description: `Read ${page.title}: ${page.subtitle}`,
  };
}

export default async function PageReader({
  params,
}: QuranPageProps) {
  const resolvedParams = await params;
  const pageNumber = Number(resolvedParams.page);

  if (
    !Number.isInteger(pageNumber) ||
    pageNumber < 1 ||
    pageNumber > getPageCount()
  ) {
    notFound();
  }

  return (
    <QuranReader
      pageData={getQuranPage(pageNumber)}
      surahs={getSurahSummaries()}
      searchIndex={getSearchIndex()}
    />
  );
}