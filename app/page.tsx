'use client'

import React, { useState } from "react";
import StripeCheckoutButton from "@/components/StripeCheckoutButton";
import BuyNowButton from "@/components/BuyNowButton";
import { useCart } from "@/contexts/CartContext";
import CartIcon from "@/components/CartIcon";
import CartDrawer from "@/components/CartDrawer";
import TermsOfService from "@/components/TermsOfService";
import PrivacyPolicy from "@/components/PrivacyPolicy";
import RefundPolicy from "@/components/RefundPolicy";

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

// Shop Pages
const ShopCoinsMock: React.FC<{ initialCoins?: number | null }> = ({ initialCoins }) => {
  const { addToCart } = useCart();
  const [selectedCoins, setSelectedCoins] = React.useState(initialCoins || 1740);
  const coinsPerDollar = 87;
  const totalPrice = (selectedCoins / coinsPerDollar).toFixed(2);
  
  React.useEffect(() => {
    if (initialCoins) {
      setSelectedCoins(initialCoins);
    }
  }, [initialCoins]);
  
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
              min="87" 
              max="26100" 
              step="87"
              value={selectedCoins}
              onChange={(e) => setSelectedCoins(Number(e.target.value))}
              className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>87 coins ($1)</span>
              <span>26,100 coins ($300)</span>
            </div>
          </div>
          <div className="text-center py-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">${totalPrice}</div>
            <div className="text-sm text-slate-600">for {selectedCoins.toLocaleString()} coins</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => addToCart({
                name: `LiveMe Coins - ${selectedCoins} coins`,
                description: "Instant delivery to your LiveMe account",
                price: parseFloat(totalPrice),
                quantity: 1,
                type: 'coins',
                amount: selectedCoins
              })}
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Add to Cart
            </button>
            <BuyNowButton 
              item={{
                name: `LiveMe Coins - ${selectedCoins} coins`,
                description: "Instant delivery to your LiveMe account",
                price: parseFloat(totalPrice),
                quantity: 1
              }}
              buttonText="Buy Now"
              className="flex-1"
            />
          </div>
          <p className="text-xs text-center text-slate-600">
            ⚠️ Failure to enter the correct ID will result in a 10% fee
          </p>
        </div>
      </SectionCard>
      
      {/* Popular Packages */}
      <h3 className="mb-4 text-lg font-semibold text-white">Popular Packages</h3>
      <div className="grid gap-6 md:grid-cols-3">
        {[
          {name: "Quick Top-up", coins: 1740, price: 20.00, image: "/drcoins.png"},
          {name: "Standard Pack", coins: 4350, price: 50.00, image: "/Dr,11.png"},
          {name: "Premium Bundle", coins: 8700, price: 100.00, image: "/Dr 15.png"},
        ].map((pack) => (
          <SectionCard key={pack.name} className="flex flex-col h-full">
            <div className="flex-1">
              <div className="flex justify-center mb-4">
                <img 
                  src={pack.image} 
                  alt={`${pack.coins} Coins`} 
                  className={`h-32 w-auto object-contain ${pack.name === 'Premium Bundle' ? 'scale-75' : ''}`}
                />
              </div>
              <h3 className="text-xl font-bold text-center mb-2">{pack.name}</h3>
              <div className="text-2xl font-bold text-purple-600 text-center">{pack.coins.toLocaleString()} Coins</div>
              <div className="mt-2 text-lg font-semibold text-center">${pack.price.toFixed(2)}</div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setSelectedCoins(pack.coins);
                  addToCart({
                    name: `${pack.name} - ${pack.coins} coins`,
                    description: "Instant delivery to your LiveMe account",
                    price: pack.price,
                    quantity: 1,
                    type: 'coins',
                    amount: pack.coins,
                    image: pack.image
                  });
                }}
                className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                Add to Cart
              </button>
              <button
                onClick={() => setSelectedCoins(pack.coins)}
                className="flex-1 px-3 py-2 border-2 border-purple-600 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors text-sm"
              >
                Select Amount
              </button>
            </div>
          </SectionCard>
        ))}
      </div>
    </Container>
  );
};

const ShopPointsMock: React.FC = () => {
  const { addToCart } = useCart();
  
  return (
    <Container className="py-10 lg:py-12">
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">Shop Nobility Points</h2>
      
      {/* Points Features List with Pricing */}
      <div className="mb-8">
        <h3 className="mb-4 text-lg font-semibold text-white">What can you do with Nobility Points?</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            {name: "Pin your Moment", points: 20, price: 20.00, icon: "📌"},
            {name: "Remove Muting", points: 30, price: 30.00, icon: "🔊"},
            {name: "Unban Broadcasting", points: 50, price: 50.00, icon: "📡"},
            {name: "Feature Pin (15 min)", points: 60, price: 60.00, icon: "⭐"},
            {name: "Diamond Hiding Card (30 days)", points: 80, price: 80.00, icon: "💎"},
            {name: "Unban Account", points: 100, price: 100.00, icon: "🔓"},
            {name: "Ghost Comment Card (7 days)", points: 200, price: 200.00, icon: "👻"},
            {name: "Send Official System Message", points: 300, price: 300.00, icon: "📢"},
            {name: "Remove Game Tab (30 days)", points: 300, price: 300.00, icon: "🎮"},
          ].map((feature) => (
            <div key={feature.name} className="bg-purple-50/90 rounded-lg p-4 border-2 border-purple-300">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{feature.icon}</span>
                  <div className="text-sm font-medium text-slate-900">{feature.name}</div>
                </div>
                <div className="mt-auto">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-lg font-bold text-purple-700">{feature.points} Points</span>
                    <span className="text-sm text-slate-500">•</span>
                    <span className="text-xl font-bold text-purple-800">${feature.price.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => addToCart({
                        name: feature.name,
                        description: `Nobility Points Service: ${feature.name}`,
                        price: feature.price,
                        quantity: 1,
                        type: 'points'
                      })}
                      className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                    >
                      Add to Cart
                    </button>
                    <BuyNowButton 
                      item={{
                        name: feature.name,
                        description: `Nobility Points Service: ${feature.name}`,
                        price: feature.price,
                        quantity: 1
                      }}
                      buttonText="Buy Now"
                      className="flex-1 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
};

const AdminMock: React.FC = () => (
  <Container className="py-10 lg:py-12">
    <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">Admin Dashboard</h2>
    
    {/* Stats Overview */}
    <div className="grid gap-6 md:grid-cols-4 mb-8">
      {[
        {title: "Total Orders", value: "1,234", change: "+12%"},
        {title: "Revenue", value: "$45,678", change: "+8%"},
        {title: "Active Users", value: "892", change: "+5%"},
        {title: "Conversion Rate", value: "3.4%", change: "+0.2%"},
      ].map((stat) => (
        <SectionCard key={stat.title}>
          <div className="text-sm text-slate-600">{stat.title}</div>
          <div className="text-2xl font-bold text-purple-600 mt-1">{stat.value}</div>
          <div className="text-xs text-green-600 mt-2">{stat.change} from last month</div>
        </SectionCard>
      ))}
    </div>

    {/* Recent Stripe Orders */}
    <SectionCard title="Recent Stripe Orders" className="mb-8">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-purple-200">
              <th className="text-left py-2">Order ID</th>
              <th className="text-left py-2">Customer</th>
              <th className="text-left py-2">Product</th>
              <th className="text-left py-2">Amount</th>
              <th className="text-left py-2">Status</th>
              <th className="text-left py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {[
              {id: "ch_3Q2x4...", customer: "user@example.com", product: "1740 Coins", amount: "$20.00", status: "completed", date: "2024-03-15"},
            ].map((order) => (
              <tr key={order.id} className="border-b border-purple-100 hover:bg-purple-50">
                <td className="py-3 text-purple-700">{order.id}</td>
                <td className="py-3">{order.customer}</td>
                <td className="py-3">{order.product}</td>
                <td className="py-3">{order.amount}</td>
                <td className="py-3">
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                    {order.status}
                  </span>
                </td>
                <td className="py-3 text-sm text-gray-500">{order.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  </Container>
);

const AboutFAQMock: React.FC = () => (
  <Container className="py-10 lg:py-12">
    {/* About Us Section */}
    <div className="flex flex-col lg:flex-row items-center gap-8 mb-12">
      <div className="lg:w-1/3">
        <img 
          src="/drcoins2.png" 
          alt="Dr. Coins Mascot" 
          className="w-full max-w-xs mx-auto"
        />
      </div>
      <div className="lg:w-2/3">
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-white">About Us</h2>
        <p className="text-lg text-purple-300">
          At <strong>Dr. Coins</strong>, transparency, speed, and customer happiness are at the heart of everything we do. 
          Our diverse team—made up of passionate individuals from all walks of life—knows the LiveMe community inside and out. 
          That&apos;s why we can offer unbeatable deals and exclusive promos you won&apos;t find anywhere else.
        </p>
        <p className="mt-4 text-lg text-purple-300">
          Whether you want to boost engagement with more diamonds, buy coins to cheer on your favorite creators, 
          or unlock special nobility privileges, Dr. Coins has you covered. Join our ever-growing community of savvy 
          LiveMe users and experience the difference of shopping with a team that truly puts you first!
        </p>
      </div>
    </div>

    {/* What is a LiveMe Reseller Section */}
    <div className="mb-12">
      <h3 className="mb-6 text-2xl font-bold tracking-tight text-white">What is a LiveMe Reseller?</h3>
      <SectionCard>
        <p className="mb-4 text-slate-800">
          A <strong>LiveMe reseller</strong> is generally a third-party individual or business that sells products, 
          services, or virtual goods related to the LiveMe platform—usually at a markup for profit or as part of a bundle. 
          <strong> LiveMe</strong> is a popular live-streaming social platform where users can broadcast themselves, 
          interact with viewers, and receive virtual gifts (which can sometimes be exchanged for real money).
        </p>
        
        <h4 className="mt-6 mb-3 font-semibold text-slate-900">What Do LiveMe Resellers Typically Offer?</h4>
        <ul className="space-y-2 text-sm text-slate-800">
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-1">•</span>
            <div><strong>Virtual Gifts & Coins</strong>: Resellers might sell LiveMe coins (the in-app currency) at a discount, bulk price, or with added value such as bonuses.</div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-1">•</span>
            <div><strong>Account Services</strong>: Some resellers offer upgraded or higher-ranked LiveMe accounts, often with more followers or in-app perks.</div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-1">•</span>
            <div><strong>Promotion Services</strong>: Certain resellers help promote a broadcaster&apos;s content, drive followers, or boost engagement.</div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-1">•</span>
            <div><strong>Gift Card Codes</strong>: Resellers sometimes distribute prepaid codes that users redeem for in-app purchases.</div>
          </li>
        </ul>

        <h4 className="mt-6 mb-3 font-semibold text-slate-900">How Do They Work?</h4>
        <ul className="space-y-2 text-sm text-slate-800">
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-1">•</span>
            <span>Users buy coins or services from the reseller (not directly through the LiveMe app).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-1">•</span>
            <span>Payment is usually made through third-party platforms (like PayPal, Venmo, or crypto).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-1">•</span>
            <span>The reseller delivers the virtual goods or services, often instantly, but sometimes after a short wait.</span>
          </li>
        </ul>

        <h4 className="mt-6 mb-3 font-semibold text-slate-900">Is It Safe?</h4>
        <ul className="space-y-2 text-sm text-slate-800">
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-1">•</span>
            <div><strong>Risks</strong>: Buying from unauthorized resellers can violate LiveMe&apos;s terms of service, possibly resulting in account suspension or bans.</div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-1">•</span>
            <div><strong>Official vs. Unofficial</strong>: Only buy from official, authorized sources to avoid scams or losing access to your account.</div>
          </li>
        </ul>

        <h4 className="mt-6 mb-3 font-semibold text-slate-900">Why Do People Use Them?</h4>
        <ul className="space-y-2 text-sm text-slate-800">
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-1">•</span>
            <span>Lower prices than buying directly from the app.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-1">•</span>
            <span>Special bundles or exclusive offers.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-1">•</span>
            <span>Convenience.</span>
          </li>
        </ul>
      </SectionCard>
    </div>

    {/* Frequently Asked Questions Section */}
    <h3 className="mb-6 text-2xl font-bold tracking-tight text-white">Frequently Asked Questions</h3>
    <div className="space-y-4">
      {[
        {q: "How fast is delivery?", a: "Most orders complete within minutes after ID verification."},
        {q: "Are you official?", a: "Yes, we&apos;re an approved LiveMe reseller with authorization to provide coins and nobility points."},
        {q: "What payment methods do you accept?", a: "We accept all major credit/debit cards through Stripe, as well as Klarna, Zelle, Apple Cash, Venmo, and more through our support team."},
        {q: "Is my payment information secure?", a: "Absolutely! We use Stripe for payment processing, which is PCI-compliant and uses industry-standard encryption to protect your data."},
        {q: "What if I enter the wrong LiveMe ID?", a: "Please double-check your ID before purchase. Incorrect IDs may result in a 10% processing fee for order corrections."},
        {q: "Can I get a refund?", a: "Due to the digital nature of our products, all sales are final once delivered. However, we&apos;ll work with you if there&apos;s an issue with your order."},
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
const PAGES = ["Home", "Shop Coins", "Shop Points", "About/FAQ"] as const;
type Page = typeof PAGES[number] | "Admin" | "Terms" | "Privacy" | "Refunds";

const Shell: React.FC<{ page: Page; setPage: (p: Page) => void }>= ({ page, setPage }) => {
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");

  const handleAdminClick = () => {
    setShowAdminPrompt(true);
  };

  const checkAdminPassword = () => {
    if (adminPassword === "drcoins2024") {
      setPage("Admin");
      setShowAdminPrompt(false);
      setAdminPassword("");
    } else {
      alert("Incorrect password");
    }
  };

  return (
    <>
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
          <div className="flex items-center gap-2">
            <CartIcon />
            <button
              onClick={handleAdminClick}
              className="p-2 text-white hover:text-purple-300 transition-colors"
              title="Admin"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <div className="md:hidden">
              <select
                className="rounded-lg border border-purple-600 bg-black px-2 py-2 text-sm text-white"
                value={page === "Admin" ? "Home" : page}
                onChange={(e)=>setPage(e.target.value as Page)}
              >
                {PAGES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </Container>
      </header>

      {/* Admin Password Modal */}
      {showAdminPrompt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Enter Admin Password</h3>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && checkAdminPassword()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
              placeholder="Password"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={checkAdminPassword}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Submit
              </button>
              <button
                onClick={() => {
                  setShowAdminPrompt(false);
                  setAdminPassword("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// HOME
const HomeMock: React.FC<{ setPage: (p: Page)=>void, setInitialCoins: (coins: number) => void }>= ({ setPage, setInitialCoins }) => (
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
              <div className="grid gap-3 sm:grid-cols-2 relative z-10">
                {[{name:"1,740 Coins", price:20.00, coins:1740},{name:"4,350 Coins", price:50.00, coins:4350},{name:"8,700 Coins", price:100.00, coins:8700},{name:"26,100 Coins", price:300.00, coins:26100}].map((p)=> (
                  <div key={p.name} className="rounded-xl border-2 border-purple-400 bg-white/90 p-4 shadow-sm relative">
                    <div className="text-sm font-medium text-slate-900">{p.name}</div>
                    <div className="mt-1 text-xs text-slate-700">Instant delivery after ID match</div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-lg font-semibold text-slate-900">${p.price.toFixed(2)}</div>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if(p.name.includes("Coins")) {
                            setInitialCoins(p.coins);
                            setPage("Shop Coins");
                          } else {
                            setPage("Shop Points");
                          }
                        }} 
                        className="relative z-20 rounded-lg border-2 border-purple-400 bg-purple-50/90 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer"
                      >
                        View
                      </button>
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
export default function DrCoinsMockups() {
  const [page, setPage] = useState<Page>("Home");
  const [initialCoins, setInitialCoins] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-purple-950">
      <Shell page={page} setPage={setPage} />
      <CartDrawer />
      {page === "Home" && <HomeMock setPage={setPage} setInitialCoins={setInitialCoins} />}
      {page === "Shop Coins" && <ShopCoinsMock initialCoins={initialCoins} />}
      {page === "Shop Points" && <ShopPointsMock />}
      {page === "Admin" && <AdminMock />}
      {page === "About/FAQ" && <AboutFAQMock />}
      {page === "Terms" && <TermsOfService onClose={() => setPage("Home")} />}
      {page === "Privacy" && <PrivacyPolicy onClose={() => setPage("Home")} />}
      {page === "Refunds" && <RefundPolicy onClose={() => setPage("Home")} />}
      <footer className="mt-16 border-t border-white/10">
        <Container className="flex flex-col items-center justify-between gap-4 py-8 text-center text-white/80 sm:flex-row sm:text-left">
          <p className="text-xs">© {new Date().getFullYear()} Dr. Coins. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <button 
              onClick={() => setPage("Terms")}
              className="rounded-md border border-purple-700 bg-black/50 px-2 py-1 text-purple-200 hover:bg-purple-700/30"
            >
              Terms
            </button>
            <button 
              onClick={() => setPage("Privacy")}
              className="rounded-md border border-purple-700 bg-black/50 px-2 py-1 text-purple-200 hover:bg-purple-700/30"
            >
              Privacy
            </button>
            <button 
              onClick={() => setPage("Refunds")}
              className="rounded-md border border-purple-700 bg-black/50 px-2 py-1 text-purple-200 hover:bg-purple-700/30"
            >
              Refunds
            </button>
          </div>
        </Container>
      </footer>
    </div>
  );
}