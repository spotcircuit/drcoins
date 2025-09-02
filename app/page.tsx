'use client'

import React, { useState } from "react";

// Color tokens (purple theme with teal/cyan cards)
const brand = {
  bg: "from-black via-slate-950 to-purple-950",
  card: "bg-teal-50/90 backdrop-blur supports-[backdrop-filter]:bg-teal-50/80",
  ring: "ring-2 ring-orange-400",
  textMuted: "text-slate-800",
  accent: "text-purple-700",
  accentBg: "bg-purple-600",
  accentBgHover: "hover:bg-purple-700",
  danger: "text-rose-600",
  featuredCard: "bg-purple-50/90",
  featuredBorder: "border-purple-400",
};

// Shared UI components
const Container: React.FC<{className?: string, children: React.ReactNode}> = ({ className = "", children }) => (
  <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
);

const SectionCard: React.FC<{title?: string, subtitle?: string, children?: React.ReactNode, className?: string}> = ({ title, subtitle, children, className = "" }) => (
  <div className={`${brand.card} ${brand.ring} rounded-2xl p-6 shadow-lg ${className}`}>
    {(title || subtitle) && (
      <div className="mb-5">
        {title && <h3 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h3>}
        {subtitle && <p className={`mt-1 text-sm ${brand.textMuted}`}>{subtitle}</p>}
      </div>
    )}
    {children}
  </div>
);

const Pill: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <span className="inline-flex items-center gap-2 rounded-full border-2 border-orange-400 bg-teal-50 px-3 py-1 text-xs font-medium text-purple-700">
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

// GALLERY (upload preview)
const uploadedImages: string[] = [
  "/Dr coins 1.png",
  "/Dr,11.png",
  "/dr 12.png",
  "/dr 13.png",
  "/dr 14.png",
  "/Dr 15.png",
];

const GalleryMock: React.FC = () => (
  <Container className="py-10 lg:py-12">
    <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">Gallery</h2>
    {uploadedImages.length === 0 ? (
      <p className="text-sm text-slate-300">
        No images yet — add URLs to <code>uploadedImages</code>.
      </p>
    ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {uploadedImages.map((src, i) => (
          <div
            key={src}
            className="group relative overflow-hidden rounded-2xl border-2 border-orange-400 bg-teal-50/90 shadow-sm"
          >
            <div className="aspect-[4/3] w-full overflow-hidden">
              <img
                src={src}
                alt={`upload-${i}`}
                className="h-full w-full object-contain p-4 transition group-hover:scale-105"
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-3 text-sm font-medium text-white">
              Image {i + 1}
            </div>
          </div>
        ))}
      </div>
    )}
  </Container>
);

// Shop Pages
const ShopCoinsMock: React.FC = () => {
  const [selectedCoins, setSelectedCoins] = React.useState(1740);
  const pricePerCoin = 0.0115; // Approximately $20 for 1740 coins
  const totalPrice = (selectedCoins * pricePerCoin).toFixed(2);
  
  return (
    <Container className="py-10 lg:py-12">
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">Shop Coins</h2>
      
      {/* Custom Coin Calculator */}
      <SectionCard className="mb-8">
        <div className="relative h-48 mb-6 overflow-hidden rounded-lg">
          <img src="/dr 12.png" alt="LiveMe Coins" className="h-full w-full object-contain p-4" />
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Coin Amount: {selectedCoins.toLocaleString()} coins
            </label>
            <input 
              type="range" 
              min="20" 
              max="2000" 
              value={selectedCoins}
              onChange={(e) => setSelectedCoins(Number(e.target.value))}
              className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>20</span>
              <span>2000</span>
            </div>
          </div>
          <div className="text-center py-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">${totalPrice}</div>
            <div className="text-sm text-slate-600">for {selectedCoins.toLocaleString()} coins</div>
          </div>
          <CTA className="w-full">Purchase Coins</CTA>
          <p className="text-xs text-center text-slate-600">
            ⚠️ Failure to enter the correct ID will result in a 10% fee
          </p>
        </div>
      </SectionCard>
      
      {/* Popular Packages */}
      <h3 className="mb-4 text-lg font-semibold text-white">Popular Packages</h3>
      <div className="grid gap-6 md:grid-cols-3">
        {[
          {name: "Quick Top-up", coins: 348, price: 4.00, image: "/Dr,11.png"},
          {name: "Standard Pack", coins: 1740, price: 20.00, image: "/dr 12.png"},
          {name: "Premium Bundle", coins: 2000, price: 23.00, image: "/Dr 15.png"},
        ].map((pack) => (
          <SectionCard key={pack.name} title={pack.name}>
            <div className="relative h-32 mb-4 overflow-hidden rounded-lg">
              <img src={pack.image} alt={pack.name} className="h-full w-full object-contain p-4" />
            </div>
            <div className="text-2xl font-bold text-purple-600">{pack.coins.toLocaleString()} Coins</div>
            <div className="mt-2 text-lg font-semibold">${pack.price.toFixed(2)}</div>
            <CTA className="mt-4 w-full">Quick Buy</CTA>
          </SectionCard>
        ))}
      </div>
    </Container>
  );
};

const ShopPointsMock: React.FC = () => (
  <Container className="py-10 lg:py-12">
    <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">Shop Nobility Points</h2>
    
    {/* Points Features List */}
    <div className="mb-8">
      <h3 className="mb-4 text-lg font-semibold text-white">What can you do with Nobility Points?</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[
          {name: "Pin your Moment", points: 20, icon: "📌"},
          {name: "Remove Muting", points: 30, icon: "🔊"},
          {name: "Unban Broadcasting", points: 50, icon: "📡"},
          {name: "Feature Pin (15 min)", points: 60, icon: "⭐"},
          {name: "Diamond Hiding Card (30 days)", points: 80, icon: "💎"},
          {name: "Unban Account", points: 100, icon: "🔓"},
          {name: "Ghost Comment Card (7 days)", points: 200, icon: "👻"},
          {name: "Send Official System Message", points: 300, icon: "📢"},
          {name: "Remove Game Tab (30 days)", points: 300, icon: "🎮"},
        ].map((feature) => (
          <div key={feature.name} className="bg-purple-50/90 rounded-lg p-3 border border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{feature.icon}</span>
                <div>
                  <div className="text-sm font-medium text-slate-900">{feature.name}</div>
                  <div className="text-xs text-purple-600 font-semibold">{feature.points} points</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    
    {/* Points Packages */}
    <h3 className="mb-4 text-lg font-semibold text-white">Buy Points Packages</h3>
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {[
        {name: "Starter", points: 100, price: 9.99, popular: false},
        {name: "Essential", points: 300, price: 24.99, popular: true},
        {name: "Premium", points: 600, price: 44.99, popular: false},
        {name: "Ultimate", points: 1200, price: 79.99, popular: false},
      ].map((pack) => (
        <SectionCard key={pack.name} className={pack.popular ? "ring-4 ring-purple-400" : ""}>
          {pack.popular && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-purple-600 text-white text-xs px-3 py-1 rounded-full">Most Popular</span>
            </div>
          )}
          <div className="text-center">
            <h4 className="text-lg font-semibold text-slate-900">{pack.name}</h4>
            <div className="text-3xl font-bold text-purple-600 my-3">{pack.points}</div>
            <div className="text-sm text-slate-600 mb-3">Nobility Points</div>
            <div className="text-2xl font-bold mb-4">${pack.price}</div>
            <CTA className="w-full">Buy Now</CTA>
          </div>
        </SectionCard>
      ))}
    </div>
  </Container>
);

const ProductMock: React.FC = () => (
  <Container className="py-10 lg:py-12">
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-teal-50/90 border-2 border-orange-400">
        <img 
          src="/dr 14.png" 
          alt="LiveMe Coins Bundle" 
          className="h-full w-full object-contain p-4"
        />
      </div>
      <div>
        <Pill>Official Reseller</Pill>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">LiveMe Coins Bundle</h1>
        <p className="mt-3 text-lg text-slate-300">Get instant delivery of LiveMe coins to your account. Secure, fast, and reliable.</p>
        <div className="mt-6 text-3xl font-bold text-white">$69.99</div>
        <CTA className="mt-6">Add to Cart</CTA>
      </div>
    </div>
  </Container>
);

const PurchaseMock: React.FC = () => (
  <Container className="py-10 lg:py-12">
    <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">Complete Purchase</h2>
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <SectionCard title="Billing Information">
          <div className="space-y-4">
            <input type="text" placeholder="Full Name" className="w-full rounded-lg border-2 border-orange-400 px-3 py-2" />
            <input type="email" placeholder="Email" className="w-full rounded-lg border-2 border-orange-400 px-3 py-2" />
            <input type="text" placeholder="Card Number" className="w-full rounded-lg border-2 border-orange-400 px-3 py-2" />
          </div>
        </SectionCard>
      </div>
      <div>
        <SectionCard title="Order Summary">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>$69.99</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>$69.99</span>
            </div>
          </div>
          <CTA className="mt-4 w-full">Complete Order</CTA>
        </SectionCard>
      </div>
    </div>
  </Container>
);

const AdminMock: React.FC = () => (
  <Container className="py-10 lg:py-12">
    <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">Admin Dashboard</h2>
    <div className="grid gap-6 md:grid-cols-3">
      {["Orders", "Users", "Products"].map((section) => (
        <SectionCard key={section} title={section}>
          <div className="text-2xl font-bold text-purple-600">{Math.floor(Math.random() * 1000)}</div>
          <div className="text-sm text-slate-800">Total {section.toLowerCase()}</div>
        </SectionCard>
      ))}
    </div>
  </Container>
);

const AboutFAQMock: React.FC = () => (
  <Container className="py-10 lg:py-12">
    <div className="flex flex-col lg:flex-row items-center gap-8 mb-8">
      <div className="lg:w-1/3">
        <img 
          src="/drcoins2.png" 
          alt="Dr. Coins Mascot" 
          className="w-full max-w-xs mx-auto"
        />
      </div>
      <div className="lg:w-2/3">
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-white">About Dr. Coins</h2>
        <p className="text-lg text-purple-300">
          Your trusted prescription for streaming growth! Dr. Coins is your official LiveMe reseller, 
          providing instant coin and nobility point delivery 24/7. With transparent pricing, 
          secure transactions, and real human support, we&apos;re here to power up your LiveMe experience.
        </p>
      </div>
    </div>
    <h3 className="mb-6 text-2xl font-bold tracking-tight text-white">Frequently Asked Questions</h3>
    <div className="space-y-4">
      {[
        {q: "How fast is delivery?", a: "Most orders complete within minutes after ID verification."},
        {q: "Are you official?", a: "Yes, we&apos;re an approved LiveMe reseller."},
        {q: "What payment methods?", a: "Card, Klarna, Zelle, Apple Cash, Venmo, and more."},
      ].map((faq) => (
        <SectionCard key={faq.q}>
          <h3 className="font-semibold">{faq.q}</h3>
          <p className="mt-2 text-sm text-slate-800">{faq.a}</p>
        </SectionCard>
      ))}
    </div>
  </Container>
);

// NAV + PAGE SHELL
const PAGES = ["Home", "Shop Coins", "Shop Points", "Product", "Purchase", "Admin", "Gallery", "About/FAQ"] as const;
type Page = typeof PAGES[number];

const Shell: React.FC<{ page: Page; setPage: (p: Page) => void }>= ({ page, setPage }) => (
  <header className="sticky top-0 z-20 border-b border-purple-800/50 bg-black/80 backdrop-blur">
    <Container className="flex h-16 items-center justify-between">
      <div className="text-lg font-bold tracking-tight text-white">Dr. Coins</div>
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

// HOME
const HomeMock: React.FC<{ setPage: (p: Page)=>void }>= ({ setPage }) => (
  <div className={`relative bg-gradient-to-b ${brand.bg}`}>
    {/* Hero Section with Logo */}
    <Container className=" py-12 sm:py-16 lg:py-20">
      <div className="text-center">
        <img 
          src="/drcoins.png" 
          alt="Dr. Coins" 
          className="mx-auto h-64 w-64 sm:h-72 sm:w-72 lg:h-80 lg:w-80 rounded-xl object-contain mb-6"
        />
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Dr. Coins
        </h1>
        <p className="mt-4 text-xl text-purple-300">
          Your Trusted Official LiveMe Reseller • 24/7 Instant Fulfillment
        </p>
      </div>
    </Container>
    
    <Container className=" py-10 sm:py-14 lg:py-16">
      <div className={`${brand.card} ${brand.ring} relative overflow-hidden rounded-3xl px-6 py-10 shadow-xl sm:px-10` }>
        <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-purple-500/30 blur-3xl" />
        {/* Background Image inside the card */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/dr 13.png" 
            alt="Background" 
            className="h-full w-full object-cover opacity-20 rounded-3xl"
          />
        </div>
        <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-purple-800/30 blur-3xl" />
        <div className="relative grid gap-10 md:grid-cols-2">
          <div>
            <Pill>Fast • Safe • Official</Pill>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Buy LiveMe Coins & Nobility Points in seconds.
            </h2>
            <p className={`mt-3 text-base ${brand.textMuted}`}>
              Power up your LiveMe account with instant coins and privileges. Orders are fulfilled around the clock with friendly human support when you need it.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <CTA onClick={()=>setPage("Shop Coins")}>Shop Coins</CTA>
              <button onClick={()=>setPage("Shop Points")} className="inline-flex items-center justify-center rounded-xl border-2 border-purple-600 bg-white px-4 py-2 text-sm font-semibold text-purple-700 shadow-sm hover:bg-purple-50">
                Shop Points
              </button>
            </div>
            <ul className="mt-6 grid gap-2 text-sm text-slate-800 sm:grid-cols-2">
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-purple-400"/> Official reseller</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-purple-400"/> 24/7 order completion</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-purple-400"/> Multiple payment methods</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-purple-400"/> Real human support</li>
            </ul>
          </div>
          <div className="">
            <div className="relative isolate overflow-hidden rounded-2xl border-2 border-purple-400 bg-purple-50/90 p-6 shadow-md">
              <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full overflow-hidden opacity-30">
                <img src="/dr 12.png" alt="Coins" className="h-full w-full object-cover" />
              </div>
              <div className="mb-4 text-sm font-semibold text-slate-900 relative z-10">Featured bundles</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[{name:"348 Coins", price:4.00},{name:"1,740 Coins", price:20.00},{name:"300 Points", price:24.99},{name:"600 Points", price:44.99}].map((p)=> (
                  <div key={p.name} className="rounded-xl border-2 border-purple-400 bg-white/90 p-4 shadow-sm">
                    <div className="text-sm font-medium text-slate-900">{p.name}</div>
                    <div className="mt-1 text-xs text-slate-700">Instant delivery after ID match</div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-lg font-semibold text-slate-900">${p.price.toFixed(2)}</div>
                      <button onClick={()=>setPage(p.name.includes("Coins")?"Shop Coins":"Shop Points")} className="rounded-lg border-2 border-purple-400 bg-purple-50/90 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100">View</button>
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

// MAIN APP
export default function OhDeerCoinsMockups() {
  const [page, setPage] = useState<Page>("Home");

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-purple-950">
      <Shell page={page} setPage={setPage} />
      {page === "Home" && <HomeMock setPage={setPage} />}
      {page === "Shop Coins" && <ShopCoinsMock />}
      {page === "Shop Points" && <ShopPointsMock />}
      {page === "Product" && <ProductMock />}
      {page === "Purchase" && <PurchaseMock />}
      {page === "Admin" && <AdminMock />}
      {page === "Gallery" && <GalleryMock />}
      {page === "About/FAQ" && <AboutFAQMock />}
      <footer className="mt-16 border-t border-white/10">
        <Container className="flex flex-col items-center justify-between gap-4 py-8 text-center text-white/80 sm:flex-row sm:text-left">
          <p className="text-xs">© {new Date().getFullYear()} Dr. Coins. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <a className="rounded-md border border-purple-700 bg-black/50 px-2 py-1 text-purple-200 hover:bg-purple-700/30" href="#">Terms</a>
            <a className="rounded-md border border-purple-700 bg-black/50 px-2 py-1 text-purple-200 hover:bg-purple-700/30" href="#">Privacy</a>
            <a className="rounded-md border border-purple-700 bg-black/50 px-2 py-1 text-purple-200 hover:bg-purple-700/30" href="#">Refunds</a>
          </div>
        </Container>
      </footer>
    </div>
  );
}