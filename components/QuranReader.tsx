"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Copy,
  Grid2X2,
  Heart,
  Home,
  LayoutGrid,
  Link as LinkIcon,
  Menu,
  Moon,
  MoreHorizontal,
  Pause,
  Play,
  Search,
  Send,
  Settings,
  Share2,
  Sparkles,
  SunMedium,
  SunMoon,
  X,
} from "lucide-react";
import { audioUrl, getPageCount, getPageForAyah, PageVerse, QuranPage, SearchVerse, Surah } from "@/lib/quran";

type SurahSummary = Omit<Surah, "verses">;
type SidebarMode = "surah" | "juz" | "page";
type ThemeMode = "light" | "dark" | "sepia" | "system";

type ReaderSettings = {
  arabicFont: "kfgq" | "amiri" | "scheherazade";
  arabicSize: number;
  translationSize: number;
};

const defaultSettings: ReaderSettings = { arabicFont: "kfgq", arabicSize: 32, translationSize: 17 };
const fontClass: Record<ReaderSettings["arabicFont"], string> = {
  kfgq: "font-arabicKfgq",
  amiri: "font-arabicAmiri",
  scheherazade: "[font-family:'Scheherazade_New','Amiri',serif]",
};

export default function QuranReader({
  currentSurah,
  pageData,
  surahs,
  searchIndex,
}: {
  currentSurah?: Surah;
  pageData?: QuranPage;
  surahs: SurahSummary[];
  searchIndex: SearchVerse[];
}) {
  const [settings, setSettings] = useState(defaultSettings);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [query, setQuery] = useState("");
  const [openActions, setOpenActions] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [showNavbars, setShowNavbars] = useState(true);
  const lastScrollRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("quran-reader-settings");
    if (saved) setSettings({ ...defaultSettings, ...JSON.parse(saved) });
    const savedTheme = window.localStorage.getItem("quran-reader-theme");
    if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "sepia" || savedTheme === "system") setTheme(savedTheme);
  }, []);

  useEffect(() => window.localStorage.setItem("quran-reader-settings", JSON.stringify(settings)), [settings]);
  useEffect(() => window.localStorage.setItem("quran-reader-theme", theme), [theme]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      if (currentScroll > lastScrollRef.current) {
        // Scrolling DOWN - hide navbars
        setShowNavbars(false);
      } else if (currentScroll < lastScrollRef.current - 10) {
        // Scrolling UP - show navbars (with 10px threshold)
        setShowNavbars(true);
      }
      lastScrollRef.current = currentScroll;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSheetTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!sheetRef.current) return;
    const touch = e.touches[0];
    (sheetRef.current as any).startY = touch.clientY;
    (sheetRef.current as any).startHeight = sheetHeight;
  };

  const handleSheetTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!sheetRef.current || !(sheetRef.current as any).startY) return;
    const touch = e.touches[0];
    const diff = (sheetRef.current as any).startY - touch.clientY;
    const maxHeight = window.innerHeight * 0.9;
    const newHeight = Math.max(0, Math.min(maxHeight, (sheetRef.current as any).startHeight + diff));
    setSheetHeight(newHeight);
  };

  const handleSheetTouchEnd = () => {
    if (!sheetRef.current) return;
    const threshold = window.innerHeight * 0.3;
    if (sheetHeight < threshold) {
      setSheetHeight(0);
      setDrawerOpen(false);
    } else {
      setSheetHeight(window.innerHeight * 0.9);
    }
    (sheetRef.current as any).startY = null;
    (sheetRef.current as any).startHeight = 0;
  };

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    return searchIndex
      .filter((verse) => verse.translation.toLowerCase().includes(term) || verse.text.includes(query.trim()) || verse.surahEnglish.toLowerCase().includes(term))
      .slice(0, 24);
  }, [query, searchIndex]);

  const readingVerses: PageVerse[] =
    pageData?.verses ??
    currentSurah?.verses.map((verse) => ({
      ...verse,
      surahId: currentSurah.id,
      surahName: currentSurah.name,
      surahEnglish: currentSurah.transliteration,
      revelationType: currentSurah.type,
    })) ??
    [];

  const activeSurahId = currentSurah?.id ?? pageData?.verses[0]?.surahId ?? 1;
  const activeSidebarPage = pageData?.page ?? (currentSurah ? getPageForAyah(currentSurah.id, 1) : 1);
  const initialSidebarMode: SidebarMode = pageData ? "page" : "surah";
  const totalPages = getPageCount();
  const previousHref = pageData ? `/quran-page/${pageData.page === 1 ? totalPages : pageData.page - 1}` : `/${activeSurahId === 1 ? 114 : activeSurahId - 1}`;
  const nextHref = pageData ? `/quran-page/${pageData.page === totalPages ? 1 : pageData.page + 1}` : `/${activeSurahId === 114 ? 1 : activeSurahId + 1}`;

  function playAyah(surahId: number, verseId: number) {
    const key = `${surahId}:${verseId}`;
    if (playing === key) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener("ended", () => setPlaying(null));
    }
    audioRef.current.src = audioUrl(surahId, verseId);
    audioRef.current.play();
    setPlaying(key);
  }

  async function playVisibleAyahs() {
    for (const verse of readingVerses) {
      const key = `${verse.surahId}:${verse.id}`;
      if (!audioRef.current) audioRef.current = new Audio();
      setPlaying(key);
      audioRef.current.src = audioUrl(verse.surahId, verse.id);
      await audioRef.current.play();
      await new Promise((resolve) => audioRef.current?.addEventListener("ended", resolve, { once: true }));
    }
    setPlaying(null);
  }

  return (
    <main className={`reader-shell min-h-screen ${themeClass(theme)}`}>
      <div className="flex min-h-screen">
        <IconRail onMenu={() => setDrawerOpen(true)} onSearchFocus={() => window.dispatchEvent(new Event("open-quran-search"))} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNav query={query} results={results} onQueryChange={setQuery} onSettings={() => setSettingsOpen(true)} theme={theme} onTheme={setTheme} onMenu={() => { setDrawerOpen(true); setSheetHeight(window.innerHeight * 0.7); }} visible={showNavbars} />
          <div className="flex min-h-0 flex-1">
            <aside className="hidden h-[calc(100vh-65px)] w-[300px] shrink-0 border-r border-line bg-panel lg:block">
              <ReferenceList surahs={surahs} currentId={activeSurahId} activePage={activeSidebarPage} initialMode={initialSidebarMode} />
            </aside>
            <section className="min-w-0 flex-1 bg-canvas pb-16 lg:pb-0">
              <ReaderHeader currentSurah={currentSurah} pageData={pageData} onPlayFull={playVisibleAyahs} />
              <div className="divide-y divide-line">
                {readingVerses.map((verse) => {
                  const key = `${verse.surahId}:${verse.id}`;
                  return (
                    <article id={`ayah-${verse.id}`} key={key} className="grid scroll-mt-24 grid-cols-1 gap-4 px-5 py-8 transition hover:bg-hover md:grid-cols-[56px_1fr] md:px-8 lg:px-8 xl:px-10">
                      <div className="flex items-center justify-between md:block">
                        <span className="text-base font-bold text-green">{verse.surahId}:{verse.id}</span>
                        <div className="mt-0 flex items-center gap-4 text-muted md:mt-6 md:flex-col md:items-start md:gap-5">
                          <button className="reader-control" aria-label={`Play ayah ${verse.surahId}:${verse.id}`} onClick={() => playAyah(verse.surahId, verse.id)}>
                            {playing === key ? <Pause size={18} /> : <Play size={18} />}
                          </button>
                          <button className="reader-control" aria-label="Open translation"><BookOpen size={18} /></button>
                          <button className="reader-control" aria-label="Bookmark ayah"><Bookmark size={18} /></button>
                          <AyahActions verse={verse} isOpen={openActions === key} onToggle={() => setOpenActions((current) => (current === key ? null : key))} onClose={() => setOpenActions(null)} />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="mb-8 flex justify-end">
                          <p dir="rtl" className={`ayah-arabic max-w-[780px] text-right text-ayah ${fontClass[settings.arabicFont]}`} style={{ fontSize: settings.arabicSize }}>
                            <ArabicWords text={verse.text} banglaTranslation={verse.bnTranslation} />
                            <span className="ayah-stop-number">{toArabicNumber(verse.id)}</span>
                          </p>
                        </div>
                        <div className="max-w-[760px]">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Saheeh International</p>
                          <p className="leading-8 text-body" style={{ fontSize: settings.translationSize }}>{verse.translation}.</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              <nav className="flex items-center justify-between border-t border-line px-5 py-5 md:px-8 xl:px-10">
                <Link className="nav-button" href={previousHref}><ChevronLeft size={18} />Previous</Link>
                <Link className="nav-button" href={nextHref}>Next<ChevronRight size={18} /></Link>
              </nav>
            </section>
          </div>
        </div>
      </div>

      {drawerOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/30 lg:hidden transition-opacity duration-200" 
            style={{ opacity: sheetHeight > 0 ? 1 : 0 }}
            onClick={() => { setDrawerOpen(false); setSheetHeight(0); }}
          />
          <div
            ref={sheetRef}
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl border-t border-line bg-panel shadow-float lg:hidden transition-all duration-300 ease-out"
            style={{ height: Math.max(60, sheetHeight), touchAction: "none" }}
            onTouchStart={handleSheetTouchStart}
            onTouchMove={handleSheetTouchMove}
            onTouchEnd={handleSheetTouchEnd}
          >
            <div 
              className="flex h-14 shrink-0 cursor-grab active:cursor-grabbing items-center justify-center border-b border-line"
              onMouseDown={(e) => {
                const startY = e.clientY;
                const startHeight = sheetHeight;
                
                const handleMouseMove = (moveEvent: MouseEvent) => {
                  const diff = startY - moveEvent.clientY;
                  const maxHeight = window.innerHeight * 0.9;
                  const newHeight = Math.max(0, Math.min(maxHeight, startHeight + diff));
                  setSheetHeight(newHeight);
                };
                
                const handleMouseUp = () => {
                  document.removeEventListener("mousemove", handleMouseMove);
                  document.removeEventListener("mouseup", handleMouseUp);
                  
                  const threshold = window.innerHeight * 0.3;
                  if (sheetHeight < threshold) {
                    setSheetHeight(0);
                    setDrawerOpen(false);
                  } else {
                    setSheetHeight(window.innerHeight * 0.9);
                  }
                };
                
                document.addEventListener("mousemove", handleMouseMove);
                document.addEventListener("mouseup", handleMouseUp);
              }}
            >
              <div className="h-1 w-12 rounded-full bg-muted opacity-40" />
            </div>
            
            <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
              <div className="flex h-12 items-center justify-between border-b border-line px-5 shrink-0">
                <span className="text-sm font-bold text-heading">Surah List</span>
                <button 
                  className="icon-button" 
                  aria-label="Close surah menu" 
                  onClick={() => { setDrawerOpen(false); setSheetHeight(0); }}
                >
                  <X size={19} />
                </button>
              </div>
              
              <div className="overflow-auto flex-1">
                <ReferenceList surahs={surahs} currentId={activeSurahId} activePage={activeSidebarPage} initialMode={initialSidebarMode} compact />
              </div>
            </div>
          </div>
        </>
      )}

      <MobileBottomNav onSearchFocus={() => window.dispatchEvent(new Event("open-quran-search"))} visible={showNavbars} />

      <SettingsPanel open={settingsOpen} settings={settings} onClose={() => setSettingsOpen(false)} onChange={setSettings} />
    </main>
  );
}

function TopNav({ query, results, onQueryChange, onSettings, theme, onTheme, onMenu, visible }: { query: string; results: SearchVerse[]; onQueryChange: (value: string) => void; onSettings: () => void; theme: ThemeMode; onTheme: (theme: ThemeMode) => void; onMenu: () => void; visible: boolean }) {
  const [themeOpen, setThemeOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const openSearch = () => setSearchOpen(true);
    window.addEventListener("open-quran-search", openSearch);
    return () => window.removeEventListener("open-quran-search", openSearch);
  }, []);

  return (
    <header className={`sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-header px-4 md:px-6 transition-transform duration-300 md:translate-y-0 ${visible ? "translate-y-0" : "-translate-y-full"}`}>
      <div className="flex min-w-0 items-center gap-4">
        <button className="icon-button lg:hidden" aria-label="Open surah drawer" onClick={onMenu}><Menu size={19} /></button>
        <Link href="/1" className="hidden items-center gap-3 sm:flex">
          <span>
            <span className="block text-[22px] font-extrabold leading-5 text-heading">Quran Mazid</span>
            <span className="mt-1 block text-[10px] font-medium text-muted">Read, Study, and Learn The Quran</span>
          </span>
        </Link>
      </div>
      <button className="top-icon ml-auto" aria-label="Open search modal" onClick={() => setSearchOpen(true)}><Search size={19} /></button>
      <div className="ml-4 flex items-center gap-3">
        <div className="relative">
          <button className="top-icon" aria-label="Open theme menu" onClick={() => setThemeOpen((open) => !open)}><ThemeIcon theme={theme} size={18} /></button>
          {themeOpen && (
            <>
              <button className="fixed inset-0 z-40 cursor-default" aria-label="Close theme menu" onClick={() => setThemeOpen(false)} />
              <div className="theme-menu">
                {(["light", "dark", "sepia", "system"] as ThemeMode[]).map((item) => (
                  <button className={theme === item ? "is-active" : ""} key={item} onClick={() => { onTheme(item); setThemeOpen(false); }}>
                    <ThemeIcon theme={item} size={17} /><span>{capitalize(item)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button
  className="top-icon"
  aria-label="Open settings"
  onClick={onSettings}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="19"
    height="18"
    viewBox="0 0 19 18"
    fill="none"
    className="text-primary"
  >
    <path
      d="M15.3953 6.91501C14.0378 6.91501 13.4828 5.95501 14.1578 4.77751C14.5478 4.09501 14.3153 3.22501 13.6328 2.83501L12.3353 2.09251C11.7428 1.74001 10.9778 1.95001 10.6253 2.54251L10.5428 2.68501C9.86781 3.86251 8.75781 3.86251 8.07531 2.68501L7.99281 2.54251C7.65531 1.95001 6.89031 1.74001 6.29781 2.09251L5.00031 2.83501C4.31781 3.22501 4.08531 4.10251 4.47531 4.78501C5.15781 5.95501 4.60281 6.91501 3.24531 6.91501C2.46531 6.91501 1.82031 7.55251 1.82031 8.34001V9.66001C1.82031 10.44 2.45781 11.085 3.24531 11.085C4.60281 11.085 5.15781 12.045 4.47531 13.2225C4.08531 13.905 4.31781 14.775 5.00031 15.165L6.29781 15.9075C6.89031 16.26 7.65531 16.05 8.00781 15.4575L8.09031 15.315C8.76531 14.1375 9.87531 14.1375 10.5578 15.315L10.6403 15.4575C10.9928 16.05 11.7578 16.26 12.3503 15.9075L13.6478 15.165C14.3303 14.775 14.5628 13.8975 14.1728 13.2225C13.4903 12.045 14.0453 11.085 15.4028 11.085C16.1828 11.085 16.8278 10.4475 16.8278 9.66001V8.34001C16.8203 7.56001 16.1828 6.91501 15.3953 6.91501ZM9.32031 11.4375C7.97781 11.4375 6.88281 10.3425 6.88281 9.00001C6.88281 7.65751 7.97781 6.56251 9.32031 6.56251C10.6628 6.56251 11.7578 7.65751 11.7578 9.00001C11.7578 10.3425 10.6628 11.4375 9.32031 11.4375Z"
      fill="currentColor"
    />
  </svg>
</button>
        <a className="support-button" href="https://irdfoundation.com" target="_blank">Support Us<svg
  xmlns="http://www.w3.org/2000/svg"
  width="19"
  height="18"
  viewBox="0 0 19 18"
  fill="none"
>
  <path
    opacity="0.4"
    d="M15.2153 6.0675C15.2153 6.18 15.2153 6.29251 15.2078 6.39751C14.0603 5.97001 12.7103 6.23251 11.8103 7.04251C11.2028 6.49501 10.4153 6.18751 9.57531 6.18751C7.73031 6.18751 6.23032 7.69501 6.23032 9.55501C6.23032 11.6775 7.29532 13.23 8.31532 14.235C8.23282 14.2275 8.16532 14.2125 8.10532 14.19C6.16282 13.5225 1.82031 10.7625 1.82031 6.0675C1.82031 3.9975 3.48531 2.32501 5.54031 2.32501C6.76281 2.32501 7.84281 2.91 8.51781 3.8175C9.20031 2.91 10.2803 2.32501 11.4953 2.32501C13.5503 2.32501 15.2153 3.9975 15.2153 6.0675Z"
    fill="currentColor"
  />
  <path
    d="M13.8217 7.1925C13.0192 7.1925 12.2917 7.58251 11.8417 8.18251C11.3917 7.58251 10.6717 7.1925 9.86171 7.1925C8.49671 7.1925 7.38672 8.30251 7.38672 9.68251C7.38672 10.215 7.46922 10.7025 7.61922 11.1525C8.32422 13.38 10.4917 14.7075 11.5642 15.075C11.7142 15.1275 11.9617 15.1275 12.1192 15.075C13.1917 14.7075 15.3592 13.38 16.0642 11.1525C16.2142 10.695 16.2967 10.2075 16.2967 9.68251C16.2967 8.30251 15.1867 7.1925 13.8217 7.1925Z"
    fill="currentColor"
  />
</svg></a>
      </div>
      <SearchModal open={searchOpen} query={query} results={results} onQueryChange={onQueryChange} onClose={() => setSearchOpen(false)} />
    </header>
  );
}

function SearchModal({ open, query, results, onQueryChange, onClose }: { open: boolean; query: string; results: SearchVerse[]; onQueryChange: (value: string) => void; onClose: () => void }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hasQuery = query.trim().length > 1;
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => document.getElementById("modal-search")?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [open]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center bg-black/46 px-3 pt-14 md:pt-20" onClick={onClose}>
      <div className={`search-modal ${settingsOpen ? "is-settings" : ""}`} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-6 py-5">
          <svg
  className="size-[18px] shrink-0 text-green"
  width="34"
  height="31"
  viewBox="0 0 34 31"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <path
    opacity="0.35"
    d="M28.3948 24.064V29.2499C28.3949 29.4152 28.3527 29.5778 28.2721 29.7221C28.1915 29.8664 28.0752 29.9876 27.9343 30.0741C27.7935 30.1606 27.6328 30.2095 27.4676 30.2161C27.3025 30.2228 27.1384 30.187 26.991 30.1121L16.999 25.0444"
    stroke="currentColor"
    strokeWidth="1.1053"
  />
  <path
    opacity="0.35"
    d="M5.60547 24.064V29.2499C5.60531 29.4152 5.64756 29.5778 5.72818 29.7221C5.8088 29.8664 5.92509 29.9876 6.06593 30.0741C6.20678 30.1606 6.36746 30.2095 6.53262 30.2161C6.69777 30.2228 6.86187 30.187 7.00922 30.1121L17.0001 25.0444"
    stroke="currentColor"
    strokeWidth="1.1053"
  />
  <path
    opacity="0.35"
    d="M15.8577 23.4689C15.8577 23.9006 16.0984 24.2715 16.4479 24.4647V24.7631L3.8391 22.1748L3.83578 22.1742L2.20766 21.8503L2.20747 21.8503C1.82666 21.7747 1.48387 21.5694 1.2375 21.2693C0.991147 20.9693 0.856452 20.5932 0.856359 20.205V4.72554C0.856359 3.69507 1.77917 2.90746 2.79774 3.0696L16.4468 5.23928V5.74402C16.3552 5.79474 16.2702 5.85824 16.1947 5.93337C15.9811 6.14579 15.8599 6.43397 15.8577 6.73523V23.4689Z"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="1.1053"
  />
  <path
    opacity="0.35"
    d="M17.5526 24.7631V24.4649C17.9025 24.2714 18.1418 23.8997 18.1418 23.4689V6.73826C18.1418 6.30731 17.902 5.93606 17.5526 5.74258V5.23822L31.2027 3.06962C32.2214 2.90746 33.1442 3.69507 33.1442 4.72554V20.2049C33.1442 20.5932 33.0094 20.9693 32.7631 21.2693C32.5167 21.5694 32.1739 21.7747 31.7931 21.8503L30.1648 22.1742L17.5526 24.7631Z"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="1.1053"
  />
  <path
    d="M16.4086 23.4683C16.4086 23.7922 16.6761 24.0541 16.9988 24.0541V25.4401L5.60305 20.494L3.72623 19.6805C3.29864 19.4951 2.9346 19.1888 2.6789 18.7992C2.42321 18.4095 2.28702 17.9537 2.28711 17.4876V2.60834C2.28688 2.22061 2.381 1.83865 2.56134 1.49542C2.74169 1.15219 3.00285 0.857997 3.32229 0.638228C3.64172 0.41846 4.00984 0.279717 4.39486 0.233974C4.77989 0.188231 5.17027 0.236861 5.53231 0.375668L16.9988 4.76695V6.15297C16.843 6.15297 16.6936 6.21455 16.583 6.32428C16.4724 6.43401 16.4097 6.583 16.4086 6.73877V23.4683Z"
    fill="currentColor"
    opacity="0.6"
  />
  <path
    d="M31.7107 2.60895V17.4883C31.7107 18.4399 31.1448 19.3009 30.2716 19.6811L28.3948 20.4946L16.999 25.4408V24.0547C17.076 24.0549 17.1523 24.0398 17.2235 24.0105C17.2947 23.9811 17.3595 23.938 17.414 23.8836C17.4685 23.8291 17.5117 23.7645 17.5412 23.6934C17.5708 23.6222 17.5859 23.546 17.5859 23.4689V6.73939C17.5859 6.58403 17.5242 6.43503 17.4144 6.32517C17.3045 6.21531 17.1555 6.15359 17.0001 6.15359V4.76646L28.4655 0.37518C28.8276 0.236373 29.2179 0.187743 29.603 0.233486C29.988 0.279229 30.3561 0.417972 30.6755 0.63774C30.995 0.857509 31.2561 1.1517 31.4365 1.49493C31.6168 1.83816 31.711 2.22123 31.7107 2.60895Z"
    fill="currentColor"
  />
</svg>
          <input id="modal-search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Find wisdom in the Quran" className="min-w-0 flex-1 bg-transparent text-base text-body outline-none placeholder:text-muted" />
          {settingsOpen ? (
            <button className="modal-filter-button" aria-label="Close search filters" onClick={() => setSettingsOpen(false)}><Settings size={20} /></button>
          ) : (
            <>
              <button className="modal-scope-button">Quran</button>
              <button
  className="modal-filter-button"
  aria-label="Open search filters"
  onClick={() => setSettingsOpen(true)}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="21"
    height="21"
    viewBox="0 0 21 21"
    fill="none"
    className="text-icon-color"
  >
    <path
      d="M18.6279 7.18864H13.9779C13.6529 7.18864 13.3945 6.93031 13.3945 6.60531C13.3945 6.28031 13.6529 6.02197 13.9779 6.02197H18.6279C18.9529 6.02197 19.2112 6.28031 19.2112 6.60531C19.2112 6.93031 18.9529 7.18864 18.6279 7.18864Z"
      fill="currentColor"
    />
    <path
      d="M6.23021 7.18864H3.13021C2.80521 7.18864 2.54688 6.93031 2.54688 6.60531C2.54688 6.28031 2.80521 6.02197 3.13021 6.02197H6.23021C6.55521 6.02197 6.81354 6.28031 6.81354 6.60531C6.81354 6.93031 6.54688 7.18864 6.23021 7.18864Z"
      fill="currentColor"
    />
    <path
      d="M9.33073 9.89705C11.1487 9.89705 12.6224 8.42332 12.6224 6.60539C12.6224 4.78745 11.1487 3.31372 9.33073 3.31372C7.51279 3.31372 6.03906 4.78745 6.03906 6.60539C6.03906 8.42332 7.51279 9.89705 9.33073 9.89705Z"
      fill="currentColor"
    />
    <path
      d="M18.6286 15.7138H15.5286C15.2036 15.7138 14.9453 15.4555 14.9453 15.1305C14.9453 14.8055 15.2036 14.5471 15.5286 14.5471H18.6286C18.9536 14.5471 19.212 14.8055 19.212 15.1305C19.212 15.4555 18.9536 15.7138 18.6286 15.7138Z"
      fill="currentColor"
    />
    <path
      d="M7.78021 15.7138H3.13021C2.80521 15.7138 2.54688 15.4555 2.54688 15.1305C2.54688 14.8055 2.80521 14.5471 3.13021 14.5471H7.78021C8.10521 14.5471 8.36354 14.8055 8.36354 15.1305C8.36354 15.4555 8.09688 15.7138 7.78021 15.7138Z"
      fill="currentColor"
    />
    <path
      d="M12.4284 18.4305C14.2463 18.4305 15.7201 16.9568 15.7201 15.1388C15.7201 13.3209 14.2463 11.8472 12.4284 11.8472C10.6104 11.8472 9.13672 13.3209 9.13672 15.1388C9.13672 16.9568 10.6104 18.4305 12.4284 18.4305Z"
      fill="currentColor"
    />
  </svg>
</button>
            </>
          )}
        </div>
        {settingsOpen ? <SearchSettingsView onDone={() => setSettingsOpen(false)} onCancel={() => setSettingsOpen(false)} /> : (
          <div className="px-6 pb-9 pt-4">
            {!hasQuery && (
              <>
                <p className="mb-3 text-sm font-semibold text-muted">Try to navigate</p>
                <div className="mb-7 flex flex-wrap gap-3">
                  <Link className="quick-chip" href="/1" onClick={onClose}>Al Fatihah</Link>
                  <Link className="quick-chip" href="/quran-page/237" onClick={onClose}>Juz 30</Link>
                  <Link className="quick-chip" href="/36" onClick={onClose}>Yasin</Link>
                  <Link className="quick-chip" href="/quran-page/1" onClick={onClose}>Page 1</Link>
                </div>
                <p className="mb-8 text-sm font-semibold text-muted">Recent Navigation</p>
                <p className="text-center text-sm font-medium text-muted">No recent navigation</p>
              </>
            )}
            {hasQuery && (
              <div className="max-h-[430px] overflow-auto">
                {results.length === 0 ? <p className="py-12 text-center text-sm font-medium text-muted">No result found</p> : results.map((result) => (
                  <Link href={`/${result.surahId}#ayah-${result.id}`} key={`${result.surahId}:${result.id}`} onClick={onClose} className="block border-b border-line px-1 py-3 transition last:border-b-0 hover:bg-hover">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted"><span>{result.surahEnglish} {result.surahId}:{result.id}</span><span className="font-arabicAmiri text-base text-green">{result.surahName}</span></div>
                    <p className="line-clamp-2 text-sm text-body">{result.translation}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchSettingsView({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  return (
    <div className="grid gap-6 px-6 pb-12 pt-4 md:grid-cols-[230px_1fr]">
      <div className="border-line md:border-r md:pr-8">
        <p className="mb-4 text-sm font-semibold text-heading">Search In</p>
        <RadioRow label="Translation Match" checked /><RadioRow label="Tafsir Match" /><RadioRow label="Arabic Match" />
        <p className="mb-4 mt-8 text-sm font-semibold text-heading">Select Search Type</p>
        <RadioRow label="Exact Match" checked /><RadioRow label="Partial Match" />
      </div>
      <div>
        <label className="relative mb-3 block"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} /><input className="sidebar-search" placeholder="Search Translator" /></label>
        {["Albanian", "Amharic", "Assamese", "Azeri"].map((language, index) => (
          <div className="translator-group" key={language}>
            <button><span>{language}</span><ChevronRight className={index === 0 ? "-rotate-90" : "rotate-90"} size={17} /></button>
            {index === 0 && <div className="space-y-3 px-2 pb-4 pt-2"><label className="flex items-center gap-3 text-sm text-body"><input type="checkbox" />Sherif Ahmeti</label><label className="flex items-center gap-3 text-sm text-body"><input type="checkbox" />Hassan Efendi Nahi</label></div>}
          </div>
        ))}
        <div className="mt-6 grid grid-cols-2 gap-3"><button className="modal-cancel" onClick={onCancel}>Cancel</button><button className="modal-done" onClick={onDone}>Done</button></div>
      </div>
    </div>
  );
}

function RadioRow({ label, checked = false }: { label: string; checked?: boolean }) {
  return <label className="mb-5 flex items-center gap-3 text-base font-semibold text-body"><span className={`fake-radio ${checked ? "is-active" : ""}`} />{label}</label>;
}

function ThemeIcon({ theme, size }: { theme: ThemeMode; size: number }) {
  if (theme === "light") {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        fill="currentColor"
        d="M11 4V1h2v3zm0 19v-3h2v3zm9-10v-2h3v2zM1 13v-2h3v2zm17.7-6.3l-1.4-1.4l1.75-1.8l1.45 1.45zM4.95 20.5L3.5 19.05l1.8-1.75l1.4 1.4zm14.1 0l-1.75-1.8l1.4-1.4l1.8 1.75zM5.3 6.7L3.5 4.95L4.95 3.5L6.7 5.3zM12 18q-2.5 0-4.25-1.75T6 12t1.75-4.25T12 6t4.25 1.75T18 12t-1.75 4.25T12 18"
      />
    </svg>
  );
}

  if (theme === "dark") {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        fill="currentColor"
        d="m14.712 7.596l-2.289-2.288l2.289-2.289L17 5.308zm5 3l-1.289-1.288l1.289-1.289L21 9.308zM12.075 21q-1.888 0-3.543-.713T5.64 18.336t-1.951-2.893t-.714-3.543q0-2.92 1.68-5.265t4.436-3.27q-.104 2.34.717 4.501q.82 2.161 2.48 3.82q1.66 1.66 3.82 2.481t4.502.717q-.92 2.754-3.268 4.435T12.075 21"
      />
    </svg>
  );
}

  if (theme === "sepia") {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        fill="currentColor"
        d="M5.662 11a4.481 4.481 0 1 1 8.746 0H17.5a.5.5 0 0 1 0 1h-15a.5.5 0 0 1 0-1zm4.473 7a.5.5 0 0 1-.22 0zM5.076 4.382l-.069-.058a.5.5 0 0 0-.638.765l.858.858l.07.058a.5.5 0 0 0 .638-.765zm10.663.637a.5.5 0 0 0-.765-.637l-.859.858l-.058.07a.5.5 0 0 0 .765.637l.859-.858zM10.52 2.435a.5.5 0 0 0-.992.09v1.213l.008.09a.5.5 0 0 0 .992-.09V2.524zM8.5 16a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1zM5 14a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 5 14"
      />
    </svg>
  );
}

  return (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      fill="currentColor"
      d="M18.364 5.636A9 9 0 0 0 5.636 18.364L12 12"
    />
  </svg>
);
}

function themeClass(theme: ThemeMode) {
  if (theme === "dark") return "theme-dark";
  if (theme === "sepia") return "theme-sepia";
  if (theme === "system") return "theme-system";
  return "theme-light";
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function IconRail({ onMenu, onSearchFocus }: { onMenu: () => void; onSearchFocus: () => void }) {
  return (
    <aside className="sticky top-0 z-[80] hidden h-screen w-[58px] shrink-0 overflow-visible border-r border-line bg-rail py-5 md:flex md:flex-col md:items-center">
      <Link href="/1" className="mb-28 flex size-9 items-center justify-center rounded-md bg-green text-white" aria-label="Quran Mazid home"><BookOpen size={21} /></Link>
      <div className="flex flex-1 flex-col items-center gap-8 text-railIcon">
        <button className="rail-button tooltip-trigger lg:hidden" aria-label="Open menu" data-tooltip="Menu" onClick={onMenu}><Menu size={20} /></button>
        <Link
  className="rail-button tooltip-trigger"
  href="/1"
  aria-label="Home"
  data-tooltip="Home"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 22 22"
    fill="none"
  >
    <path
      d="M20.5992 7.0675L13.0917 1.06583C11.9325 0.134166 10.0584 0.134166 8.91002 1.055L1.40252 7.0675C0.557524 7.73917 0.0158568 9.15833 0.200023 10.22L1.64086 18.8433C1.90086 20.3817 3.37419 21.6275 4.93419 21.6275H17.0675C18.6167 21.6275 20.1009 20.3708 20.3609 18.8433L21.8017 10.22C21.975 9.15833 21.4334 7.73917 20.5992 7.0675ZM11.0009 14.7917C9.50586 14.7917 8.29252 13.5783 8.29252 12.0833C8.29252 10.5883 9.50586 9.375 11.0009 9.375C12.4959 9.375 13.7092 10.5883 13.7092 12.0833C13.7092 13.5783 12.4959 14.7917 11.0009 14.7917Z"
      fill="currentColor"
    />
  </svg>
</Link>
        <button
  className="rail-button tooltip-trigger"
  aria-label="Read Quran"
  data-tooltip="Read Quran"
  onClick={onSearchFocus}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="26"
    height="26"
    viewBox="0 0 26 26"
    fill="none"
  >
    <path
      opacity="0.4"
      d="M20.2264 2.16675H18.168C15.8064 2.16675 14.5605 3.41258 14.5605 5.77425V7.83258C14.5605 10.1942 15.8064 11.4401 18.168 11.4401H20.2264C22.588 11.4401 23.8339 10.1942 23.8339 7.83258V5.77425C23.8339 3.41258 22.588 2.16675 20.2264 2.16675Z"
      fill="currentColor"
    />
    <path
      opacity="0.4"
      d="M7.84268 14.5491H5.78435C3.41185 14.5491 2.16602 15.7949 2.16602 18.1566V20.2149C2.16602 22.5874 3.41185 23.8332 5.77352 23.8332H7.83185C10.1935 23.8332 11.4394 22.5874 11.4394 20.2257V18.1674C11.4502 15.7949 10.2043 14.5491 7.84268 14.5491Z"
      fill="currentColor"
    />
    <path
      d="M6.81352 11.4617C9.38026 11.4617 11.461 9.38099 11.461 6.81425C11.461 4.2475 9.38026 2.16675 6.81352 2.16675C4.24677 2.16675 2.16602 4.2475 2.16602 6.81425C2.16602 9.38099 4.24677 11.4617 6.81352 11.4617Z"
      fill="currentColor"
    />
    <path
      d="M19.1866 23.8333C21.7533 23.8333 23.8341 21.7526 23.8341 19.1858C23.8341 16.6191 21.7533 14.5383 19.1866 14.5383C16.6198 14.5383 14.5391 16.6191 14.5391 19.1858C14.5391 21.7526 16.6198 23.8333 19.1866 23.8333Z"
      fill="currentColor"
    />
  </svg>
</button>
        <button
  className="rail-button tooltip-trigger"
  aria-label="Go to Ayah"
  data-tooltip="Go to Ayah"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 22 22"
    fill="none"
  >
    <path
      d="M6.78305 5.79323L14.5655 3.19906C18.058 2.0349 19.9555 3.94156 18.8005 7.43406L16.2064 15.2166C14.4647 20.4507 11.6047 20.4507 9.86305 15.2166L9.09305 12.9066L6.78305 12.1366C1.54888 10.3949 1.54888 7.54406 6.78305 5.79323Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.26758 12.5125L12.5492 9.22168"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
</button>
        <button
  className="rail-button tooltip-trigger"
  aria-label="Bookmarks"
  data-tooltip="Bookmark"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="22"
    viewBox="0 0 18 22"
    fill="none"
  >
    <path
      opacity="0.4"
      d="M1.48828 16.6148V15.1063C1.48828 11.6948 1.48897 10.6125 1.48828 9.42075C2.74018 9.42073 5.45877 9.42073 8.99967 9.42073C12.5405 9.42073 15.2592 9.41996 16.5111 9.4208C16.5111 10.6727 16.5111 11.6948 16.5111 15.1063V16.6148C16.5111 18.7798 16.5111 19.8623 15.7855 20.2498C14.3802 21.0001 11.7443 18.4967 10.4926 17.743C9.76659 17.3058 9.4036 17.0872 8.99967 17.0872C8.59575 17.0872 8.23276 17.3058 7.50678 17.743C6.25501 18.4967 3.61914 21.0001 2.21393 20.2498C1.48828 19.8623 1.48828 18.7798 1.48828 16.6148Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.38569"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M1.48828 3.45867C1.48828 2.43828 2.31547 1.61108 3.33587 1.61108H14.6635C15.6839 1.61108 16.5111 2.43828 16.5111 3.45867V5.99204H1.48828V3.45867Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.38569"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
</button>
        <button
  className="rail-button tooltip-trigger"
  aria-label="Others"
  data-tooltip="Others"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 22 22"
    fill="none"
  >
    <path
      d="M20.1667 7.58075V3.87742C20.1667 2.41992 19.58 1.83325 18.1225 1.83325H14.4192C12.9617 1.83325 12.375 2.41992 12.375 3.87742V7.58075C12.375 9.03825 12.9617 9.62492 14.4192 9.62492H18.1225C19.58 9.62492 20.1667 9.03825 20.1667 7.58075Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.62565 7.80992V3.64825C9.62565 2.35575 9.03898 1.83325 7.58148 1.83325H3.87815C2.42065 1.83325 1.83398 2.35575 1.83398 3.64825V7.80075C1.83398 9.10242 2.42065 9.61575 3.87815 9.61575H7.58148C9.03898 9.62492 9.62565 9.10242 9.62565 7.80992Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.62565 18.1225V14.4192C9.62565 12.9617 9.03898 12.375 7.58148 12.375H3.87815C2.42065 12.375 1.83398 12.9617 1.83398 14.4192V18.1225C1.83398 19.58 2.42065 20.1667 3.87815 20.1667H7.58148C9.03898 20.1667 9.62565 19.58 9.62565 18.1225Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.75 14.2083H19.25"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M13.75 17.875H19.25"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
</button>
      </div>
    </aside>
  );
}

function ReferenceList({ surahs, currentId, activePage, initialMode, compact = false }: { surahs: SurahSummary[]; currentId: number; activePage?: number; initialMode: SidebarMode; compact?: boolean }) {
  const [mode, setMode] = useState<SidebarMode>(initialMode);
  const [filter, setFilter] = useState("");
  useEffect(() => { setMode(initialMode); setFilter(""); }, [initialMode, currentId, activePage]);
  const placeholder = `Search ${mode[0].toUpperCase()}${mode.slice(1)}`;
  const filteredSurahs = surahs.filter((surah) => {
    const term = filter.trim().toLowerCase();
    return !term || surah.transliteration.toLowerCase().includes(term) || surah.translation.toLowerCase().includes(term) || String(surah.id).includes(term);
  });
  return (
    <div className={`flex h-full flex-col ${compact ? "px-5 py-5" : "px-6 py-6"}`}>
      <div className="grid grid-cols-3 rounded-full bg-tab p-1 text-center text-sm font-semibold text-muted">
        {(["surah", "juz", "page"] as SidebarMode[]).map((item) => <button key={item} className={`rounded-full px-4 py-2 capitalize transition ${mode === item ? "bg-panel text-body shadow-sm" : ""}`} onClick={() => { setMode(item); setFilter(""); }}>{item}</button>)}
      </div>
      <label className="relative mt-5 block"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} /><input className="sidebar-search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder={placeholder} /></label>
      <div className="mt-4 min-h-0 flex-1 overflow-auto pr-1">
        {mode === "surah" && <SurahTab surahs={filteredSurahs} currentId={currentId} />}
        {mode === "juz" && <JuzTab surahs={surahs} />}
        {mode === "page" && <PageTab activePage={activePage} />}
      </div>
    </div>
  );
}

function SurahTab({ surahs, currentId }: { surahs: SurahSummary[]; currentId: number }) {
  return surahs.map((surah) => (
    <Link href={`/${surah.id}`} key={surah.id} className={`sidebar-card grid grid-cols-[44px_1fr] items-center gap-4 ${currentId === surah.id ? "is-active" : ""}`}>
      <span className={`surah-diamond ${currentId === surah.id ? "bg-green text-white" : "bg-tab text-muted"}`}><span>{surah.id}</span></span>
      <span className="min-w-0"><span className="block truncate text-[15px] font-semibold">{surah.transliteration}</span><span className="mt-1 block truncate text-xs text-muted">{surah.translation}</span></span>
    </Link>
  ));
}

function JuzTab({ surahs }: { surahs: SurahSummary[] }) {
  const juzes = [
    { id: 1, title: "Al Fatihah & M...", count: 2, items: surahs.slice(0, 2) },
    { id: 2, title: "Al Baqarah & M...", count: 1, items: [surahs[1]] },
    { id: 3, title: "Al Baqarah & M...", count: 2, items: [surahs[1], surahs[2]] },
  ];
  return <div className="space-y-4">{juzes.map((juz) => <div key={juz.id} className="sidebar-card px-3 py-4"><div className="mb-3 grid grid-cols-[1fr_auto] gap-3 text-sm"><div><p className="font-bold text-green">Juz {juz.id}</p><p className="mt-1 truncate text-xs font-semibold text-muted">{juz.title}</p></div><div className="text-center text-muted"><p className="font-semibold text-body">{juz.count}</p><p className="text-xs">Surah</p></div></div><div className="space-y-2">{juz.items.map((surah, index) => <Link href={`/${surah.id}`} key={`${juz.id}-${surah.id}-${index}`} className={`grid grid-cols-[44px_1fr] items-center gap-4 rounded-xl px-3 py-3 transition ${index === 0 ? "bg-selected" : "hover:bg-hover"}`}><span className={`surah-diamond ${index === 0 ? "bg-green text-white" : "bg-tab text-muted"}`}><span>{surah.id}</span></span><span className="min-w-0"><span className="block truncate text-[15px] font-semibold">{surah.transliteration}</span><span className="mt-1 block truncate text-xs text-muted">{surah.translation}</span></span></Link>)}</div></div>)}</div>;
}

function PageTab({ activePage }: { activePage?: number }) {
  return Array.from({ length: getPageCount() }, (_, index) => index + 1).map((page) => (
    <Link href={`/quran-page/${page}`} key={page} className={`sidebar-card grid grid-cols-[44px_1fr] items-center gap-4 ${activePage === page ? "is-active" : ""}`}>
      <span className={`surah-diamond ${activePage === page ? "bg-green text-white" : "bg-tab text-muted"}`}><span>{page.toString().padStart(2, "0")}</span></span>
      <span className="text-[15px] font-semibold">Page {page.toString().padStart(2, "0")}</span>
    </Link>
  ));
}

function ReaderHeader({ currentSurah, pageData, onPlayFull }: { currentSurah?: Surah; pageData?: QuranPage; onPlayFull: () => void }) {
  const title = pageData?.title ?? `Surah ${currentSurah?.transliteration ?? ""}`;
  const subtitle = pageData?.subtitle ?? `Ayah-${currentSurah?.total_verses ?? 0}, ${currentSurah?.type === "meccan" ? "Makkah" : "Madinah"}`;
  return <section className="relative min-h-[155px] border-b border-line px-5 py-9 md:px-8 xl:px-10"><div className="makkah-watermark" aria-hidden="true" /><div className="relative mx-auto max-w-[520px] text-center"><h1 className="text-2xl font-bold text-heading md:text-[26px]">{title}</h1><p className="mt-4 text-sm font-medium text-muted">{subtitle}</p></div></section>;
}

function SettingsPanel({ open, settings, onClose, onChange }: { open: boolean; settings: ReaderSettings; onClose: () => void; onChange: (settings: ReaderSettings) => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose}>
      <aside className="ml-auto h-full w-full max-w-[390px] border-l border-line bg-panel p-6 shadow-float" onClick={(event) => event.stopPropagation()}>
        <div className="mb-7 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-green">Reading Settings</p><h2 className="mt-1 text-xl font-bold text-heading">Font Settings</h2></div><button className="icon-button" aria-label="Close settings" onClick={onClose}><X size={19} /></button></div>
        <label className="settings-label" htmlFor="arabic-font">Arabic Font Face</label>
        <select id="arabic-font" value={settings.arabicFont} onChange={(event) => onChange({ ...settings, arabicFont: event.target.value as ReaderSettings["arabicFont"] })} className="settings-input"><option value="kfgq">KFGQ</option><option value="amiri">Amiri</option><option value="scheherazade">Scheherazade</option></select>
        <Slider label="Arabic Font Size" value={settings.arabicSize} min={24} max={52} onChange={(arabicSize) => onChange({ ...settings, arabicSize })} />
        <Slider label="Translation Font Size" value={settings.translationSize} min={14} max={24} onChange={(translationSize) => onChange({ ...settings, translationSize })} />
      </aside>
    </div>
  );
}

function Slider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <div className="mt-6"><div className="mb-2 flex items-center justify-between"><label className="settings-label">{label}</label><span className="text-sm font-semibold text-green">{value}</span></div><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-green" /></div>;
}

function AyahActions({ verse, isOpen, onToggle, onClose }: { verse: PageVerse; isOpen: boolean; onToggle: () => void; onClose: () => void }) {
  const ayahText = `${verse.surahId}:${verse.id} ${verse.text}\n${verse.translation}`;
  const ayahUrl = typeof window === "undefined" ? "" : `${window.location.origin}/${verse.surahId}#ayah-${verse.id}`;
  async function copyAyah() { await navigator.clipboard.writeText(ayahText); onClose(); }
  async function copyLink() { await navigator.clipboard.writeText(ayahUrl); onClose(); }
  async function shareAyah() { if (navigator.share) await navigator.share({ title: `Ayah ${verse.surahId}:${verse.id}`, text: ayahText, url: ayahUrl }); else await navigator.clipboard.writeText(`${ayahText}\n${ayahUrl}`); onClose(); }
  return <div className="relative"><button className="reader-control" aria-label="More actions" onClick={onToggle}><MoreHorizontal size={18} /></button>{isOpen && <><button className="fixed inset-0 z-40 cursor-default" aria-label="Close ayah actions" onClick={onClose} /><div className="ayah-action-menu"><button onClick={copyAyah}><Copy size={18} /><span>Ayah Copy</span></button><button onClick={copyLink}><LinkIcon size={18} /><span>Copy Link</span></button><button onClick={shareAyah}><Share2 size={18} /><span>Ayah Share</span></button></div></>}</div>;
}

function ArabicWords({ text, banglaTranslation }: { text: string; banglaTranslation?: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return <>{words.map((word, index) => <span className="arabic-word" key={`${word}-${index}`} tabIndex={0} data-meaning={getBanglaWordMeaning(index, words.length, banglaTranslation)}>{word}</span>)}</>;
}

function getBanglaWordMeaning(index: number, totalWords: number, banglaTranslation?: string) {
  if (!banglaTranslation) return "\u09ac\u09be\u0982\u09b2\u09be \u0985\u09b0\u09cd\u09a5 \u09aa\u09be\u0993\u09df\u09be \u09af\u09be\u09df\u09a8\u09bf";
  const banglaWords = banglaTranslation.replace(/[\u0964,;:!?()[\]{}"\u201c\u201d\u2018\u2019]/g, " ").split(/\s+/).filter(Boolean);
  if (banglaWords.length === 0) return banglaTranslation;
  const start = Math.floor((index / totalWords) * banglaWords.length);
  const end = Math.max(start + 1, Math.floor(((index + 1) / totalWords) * banglaWords.length));
  return banglaWords.slice(start, Math.min(end, banglaWords.length)).join(" ");
}

function MobileBottomNav({ onSearchFocus, visible }: { onSearchFocus: () => void; visible: boolean }) {
  return (
    <nav className={`mobile-bottom-nav lg:hidden ${visible ? "translate-y-0" : "translate-y-full"}`}>
      <Link href="/1" className="mobile-nav-button" aria-label="Home" title="Home">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M20.5992 7.0675L13.0917 1.06583C11.9325 0.134166 10.0584 0.134166 8.91002 1.055L1.40252 7.0675C0.557524 7.73917 0.0158568 9.15833 0.200023 10.22L1.64086 18.8433C1.90086 20.3817 3.37419 21.6275 4.93419 21.6275H17.0675C18.6167 21.6275 20.1009 20.3708 20.3609 18.8433L21.8017 10.22C21.975 9.15833 21.4334 7.73917 20.5992 7.0675ZM11.0009 14.7917C9.50586 14.7917 8.29252 13.5783 8.29252 12.0833C8.29252 10.5883 9.50586 9.375 11.0009 9.375C12.4959 9.375 13.7092 10.5883 13.7092 12.0833C13.7092 13.5783 12.4959 14.7917 11.0009 14.7917Z" fill="currentColor" />
        </svg>
      </Link>
      
      <button className="mobile-nav-button" aria-label="Read Quran" title="Read Quran" onClick={onSearchFocus}>
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 26 26" fill="none">
          <path opacity="0.4" d="M20.2264 2.16675H18.168C15.8064 2.16675 14.5605 3.41258 14.5605 5.77425V7.83258C14.5605 10.1942 15.8064 11.4401 18.168 11.4401H20.2264C22.588 11.4401 23.8339 10.1942 23.8339 7.83258V5.77425C23.8339 3.41258 22.588 2.16675 20.2264 2.16675Z" fill="currentColor" />
          <path opacity="0.4" d="M7.84268 14.5491H5.78435C3.41185 14.5491 2.16602 15.7949 2.16602 18.1566V20.2149C2.16602 22.5874 3.41185 23.8332 5.77352 23.8332H7.83185C10.1935 23.8332 11.4394 22.5874 11.4394 20.2257V18.1674C11.4502 15.7949 10.2043 14.5491 7.84268 14.5491Z" fill="currentColor" />
          <path d="M6.81352 11.4617C9.38026 11.4617 11.461 9.38099 11.461 6.81425C11.461 4.2475 9.38026 2.16675 6.81352 2.16675C4.24677 2.16675 2.16602 4.2475 2.16602 6.81425C2.16602 9.38099 4.24677 11.4617 6.81352 11.4617Z" fill="currentColor" />
          <path d="M19.1866 23.8333C21.7533 23.8333 23.8341 21.7526 23.8341 19.1858C23.8341 16.6191 21.7533 14.5383 19.1866 14.5383C16.6198 14.5383 14.5391 16.6191 14.5391 19.1858C14.5391 21.7526 16.6198 23.8333 19.1866 23.8333Z" fill="currentColor" />
        </svg>
      </button>
      
      <button className="mobile-nav-button" aria-label="Go to Ayah" title="Go to Ayah">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M6.78305 5.79323L14.5655 3.19906C18.058 2.0349 19.9555 3.94156 18.8005 7.43406L16.2064 15.2166C14.4647 20.4507 11.6047 20.4507 9.86305 15.2166L9.09305 12.9066L6.78305 12.1366C1.54888 10.3949 1.54888 7.54406 6.78305 5.79323Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9.26758 12.5125L12.5492 9.22168" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      
      <button className="mobile-nav-button" aria-label="Bookmarks" title="Bookmarks">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="22" viewBox="0 0 18 22" fill="none">
          <path opacity="0.4" d="M1.48828 16.6148V15.1063C1.48828 11.6948 1.48897 10.6125 1.48828 9.42075C2.74018 9.42073 5.45877 9.42073 8.99967 9.42073C12.5405 9.42073 15.2592 9.41996 16.5111 9.4208C16.5111 10.6727 16.5111 11.6948 16.5111 15.1063V16.6148C16.5111 18.7798 16.5111 19.8623 15.7855 20.2498C14.3802 21.0001 11.7443 18.4967 10.4926 17.743C9.76659 17.3058 9.4036 17.0872 8.99967 17.0872C8.59575 17.0872 8.23276 17.3058 7.50678 17.743C6.25501 18.4967 3.61914 21.0001 2.21393 20.2498C1.48828 19.8623 1.48828 18.7798 1.48828 16.6148Z" fill="currentColor" stroke="currentColor" strokeWidth="1.38569" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M1.48828 3.45867C1.48828 2.43828 2.31547 1.61108 3.33587 1.61108H14.6635C15.6839 1.61108 16.5111 2.43828 16.5111 3.45867V5.99204H1.48828V3.45867Z" fill="currentColor" stroke="currentColor" strokeWidth="1.38569" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      
      <button className="mobile-nav-button" aria-label="Others" title="Others">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M20.1667 7.58075V3.87742C20.1667 2.41992 19.58 1.83325 18.1225 1.83325H14.4192C12.9617 1.83325 12.375 2.41992 12.375 3.87742V7.58075C12.375 9.03825 12.9617 9.62492 14.4192 9.62492H18.1225C19.58 9.62492 20.1667 9.03825 20.1667 7.58075Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9.62565 7.80992V3.64825C9.62565 2.35575 9.03898 1.83325 7.58148 1.83325H3.87815C2.42065 1.83325 1.83398 2.35575 1.83398 3.64825V7.80075C1.83398 9.10242 2.42065 9.61575 3.87815 9.61575H7.58148C9.03898 9.62492 9.62565 9.10242 9.62565 7.80992Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9.62565 18.1225V14.4192C9.62565 12.9617 9.03898 12.375 7.58148 12.375H3.87815C2.42065 12.375 1.83398 12.9617 1.83398 14.4192V18.1225C1.83398 19.58 2.42065 20.1667 3.87815 20.1667H7.58148C9.03898 20.1667 9.62565 19.58 9.62565 18.1225Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.75 14.2083H19.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M13.75 17.875H19.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </nav>
  );
}

function toArabicNumber(value: number) {
  return String(value).replace(/\d/g, (digit) => "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669"[Number(digit)]);
}
