import React, { useMemo, useState } from "react";

// ------------------------------------------------------------
// Oh Deer Coins – Quick Mockups (React + Tailwind CSS)
// ------------------------------------------------------------
// Updates:
// - New black / purple / white gradient theme
// - Placeholder image support (upload & pass URL)
// - Pop flex grids
// ------------------------------------------------------------

// Color tokens (dark purple theme)
const brand = {
  bg: "from-black via-purple-900 to-purple-700",
  card: "bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-white/10",
  ring: "ring-1 ring-purple-700/40",
  textMuted: "text-purple-200",
  accent: "text-purple-300",
  accentBg: "bg-purple-600",
  accentBgHover: "hover:bg-purple-700",
  danger: "text-rose-400",
};

// Shared UI bits
const Container: React.FC<{className?: string, children: React.ReactNode}> = ({ className = "", children }) => (
  <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
);

const SectionCard: React.FC<{title?: string, subtitle?: string, children: React.ReactNode, className?: string}> = ({ title, subtitle, children, className = "" }) => (
  <div className={`${brand.card} ${brand.ring} rounded-2xl p-6 shadow-lg ${className}`}>
    {(title || subtitle) && (
      <div className="mb-5">
        {title && <h3 className="text-lg font-semibold tracking-tight text-white">{title}</h3>}
        {subtitle && <p className={`mt-1 text-sm ${brand.textMuted}`}>{subtitle}</p>}
      </div>
    )}
    {children}
  </div>
);

const Pill: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-700/30 px-3 py-1 text-xs font-medium text-purple-200">
    {children}
  </span>
);

const CTA: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = "", children, ...props }) => (
  <button
    className={`inline-flex items-center justify-center rounded-xl ${brand.accentBg} ${brand.accentBgHover} px-4 py-2 text-sm font-semibold text-white shadow-md transition active:scale-[.99] ${className}`}
    {...props}
  >
    {children}
  </button>
);

// NAV + PAGE SHELL -----------------------------------------------------------
const PAGES = ["Home", "Shop Coins", "Shop Points", "Product", "About/FAQ"] as const;

type Page = typeof PAGES[number];

const Shell: React.FC<{ page: Page; setPage: (p: Page) => void }>= ({ page, setPage }) => (
  <header className="sticky top-0 z-20 border-b border-purple-800/50 bg-black/80 backdrop-blur">
    <Container className="flex h-16 items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-purple-700/40 text-purple-300">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M6 7c1.5 0 2.5-1.5 2-3M18 7c-1.5 0-2.5-1.5-2-3M4 11c2 0 4-1 4-3M20 11c-2 0-4-1-4-3M12 13v7M8 20c0-2 1.5-3 4-3s4 1 4 3"/>
          </svg>
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight text-white">Oh Deer Coins</div>
          <div className="text-[11px] leading-4 text-purple-300">Official LiveMe reseller • 24/7 fulfillment</div>
        </div>
      </div>
      <nav className="hidden items-center gap-1 md:flex">
        {PAGES.map((label) => (
          <button
            key={label}
            onClick={() => setPage(label)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${page===label?"bg-purple-700/40 text-white":"text-purple-300 hover:bg-purple-700/30"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="md:hidden">
        <select
          className="rounded-lg border border-purple-600 bg-black px-2 py-2 text-sm text-white"
          value={page}
          onChange={(e)=>setPage(e.target.value as Page)}
        >
          {PAGES.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>
    </Container>
  </header>
);

// HOME ----------------------------------------------------------------------
const HomeMock: React.FC<{ setPage: (p: Page)=>void }>= ({ setPage }) => (
  <div className={`relative bg-gradient-to-b ${brand.bg}`}>
    <Container className="py-10 sm:py-14 lg:py-16">
      <div className={`${brand.card} ${brand.ring} relative overflow-hidden rounded-3xl px-6 py-10 shadow-xl sm:px-10` }>
        <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-purple-500/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-purple-800/30 blur-3xl" />
        <div className="relative grid gap-10 md:grid-cols-2">
          <div>
            <Pill>Fast • Safe • Official</Pill>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Buy LiveMe Coins & Nobility Points in seconds.
            </h1>
            <p className={`mt-3 text-base ${brand.textMuted}`}>
              Power up your LiveMe account with instant coins and privileges. Orders are fulfilled around the clock with friendly human support when you need it.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <CTA onClick={()=>setPage("Shop Coins")}>Shop Coins</CTA>
              <button onClick={()=>setPage("Shop Points")} className="inline-flex items-center justify-center rounded-xl border border-purple-600 bg-black px-4 py-2 text-sm font-semibold text-purple-200 shadow-sm hover:bg-purple-700/30">
                Shop Points
              </button>
            </div>
            <ul className="mt-6 grid gap-2 text-sm text-purple-200 sm:grid-cols-2">
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-purple-400"/> Official reseller</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-purple-400"/> 24/7 order completion</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-purple-400"/> Multiple payment methods</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-purple-400"/> Real human support</li>
            </ul>
          </div>
          <div className="">
            <div className="relative isolate overflow-hidden rounded-2xl border border-purple-800 bg-gradient-to-br from-purple-900 to-black p-6 shadow-md">
              <div className="mb-4 text-sm font-semibold text-white">Featured bundles</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[{name:"5,460 Coins", price:69.99, img:"/placeholder1.png"},{name:"36,400 Coins", price:399.99, img:"/placeholder2.png"},{name:"Nobility: Duke", price:149.99, img:"/placeholder3.png"},{name:"Nobility: King", price:599.99, img:"/placeholder4.png"}].map((p)=> (
                  <div key={p.name} className="rounded-xl border border-purple-700 bg-black/60 p-4 shadow-md flex flex-col">
                    <img src={p.img} alt={p.name} className="h-24 w-full object-cover rounded-lg mb-3" />
                    <div className="text-sm font-medium text-white">{p.name}</div>
                    <div className="mt-1 text-xs text-purple-300">Instant delivery after ID match</div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-lg font-semibold text-white">${p.price.toFixed(2)}</div>
                      <button onClick={()=>setPage(p.name.includes("Coins")?"Shop Coins":"Shop Points")} className="rounded-lg border border-purple-700 bg-black px-3 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-700/30">View</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {[
          {title:"Official & transparent", body:"We operate as an approved LiveMe reseller with clear pricing and receipts."},
          {title:"Fast fulfillment", body:"Orders are processed 24/7—most complete within minutes after ID verification."},
          {title:"Flexible payments", body:"Pay by card, Klarna, or message support for Zelle, Apple Cash, Venmo, and more."},
        ].map((f) => (
          <SectionCard key={f.title} title={f.title} subtitle={f.body} />
        ))}
      </div>
    </Container>
  </div>
);

// ROOT ---------------------------------------------------------------------
export default function OhDeerCoinsMockups() {
  const [page, setPage] = useState<Page>("Home");

  return (
    <div className="min-h-screen bg-black text-white">
      <Shell page={page} setPage={setPage} />
      {page === "Home" && <HomeMock setPage={setPage} />}
      <footer className="mt-16 border-t border-purple-800/70">
        <Container className="flex flex-col items-center justify-between gap-4 py-8 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-purple-300">© {new Date().getFullYear()} Oh Deer Coins. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <a className="rounded-md border border-purple-700 bg-black px-2 py-1 text-purple-200 hover:bg-purple-700/30" href="#">Terms</a>
            <a className="rounded-md border border-purple-700 bg-black px-2 py-1 text-purple-200 hover:bg-purple-700/30" href="#">Privacy</a>
            <a className="rounded-md border border-purple-700 bg-black px-2 py-1 text-purple-200 hover:bg-purple-700/30" href="#">Refunds</a>
          </div>
        </Container>
      </footer>
    </div>
  );
}
