import { notFound } from "next/navigation";
import QuranReader from "@/components/QuranReader";
import { getPageCount, getQuranPage, getSearchIndex, getSurahSummaries } from "@/lib/quran";

type QuranPageProps = {
  params: Promise<{ page: string }>;
};

export function generateStaticParams() {
  return Array.from({ length: getPageCount() }, (_, index) => ({ page: String(index + 1) }));
}

export async function generateMetadata({ params }: QuranPageProps) {
  const resolvedParams = await params;
  const page = getQuranPage(Number(resolvedParams.page));

  return {
    title: `${page.title} - Quran Reader`,
    description: `Read ${page.title}: ${page.subtitle}`,
  };
}

export default async function PageReader({ params }: QuranPageProps) {
  const resolvedParams = await params;
  const pageNumber = Number(resolvedParams.page);

  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > getPageCount()) {
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
