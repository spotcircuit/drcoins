'use client';

import React from 'react';

const SectionCard: React.FC<{children?: React.ReactNode, className?: string}> = ({ children, className = "" }) => (
  <div className={`bg-teal-50/90 backdrop-blur supports-[backdrop-filter]:bg-teal-50/80 ring-2 ring-orange-400 rounded-2xl p-6 shadow-lg ${className}`}>
    {children}
  </div>
);

const TermsOfService: React.FC<{onClose: () => void}> = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="relative bg-gradient-to-br from-slate-900 to-purple-950 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-gradient-to-r from-purple-900 to-slate-900 p-4 flex justify-between items-center rounded-t-2xl">
        <h1 className="text-2xl font-bold text-white">TERMS OF SERVICE</h1>
        <button
          onClick={onClose}
          className="text-white hover:text-purple-300 transition-colors p-2 -mr-2"
          title="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-6">
        <SectionCard>
          <div className="space-y-6 text-slate-800">
            <div>
              <p className="font-semibold mb-2">Effective Date: February 21, 2025</p>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold mb-2">1. Acceptance of Terms</h2>
              <p className="text-sm">By accessing or using drcoins.shop, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree with any provision of these Terms, please discontinue use of our website immediately.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">2. Eligibility and Account Requirements</h2>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Users must be at least 18 years of age or have explicit parental/guardian consent</li>
                <li>You agree to provide accurate, current, and complete information during registration</li>
                <li>You are solely responsible for maintaining the confidentiality of your account credentials</li>
                <li>You accept full responsibility for all activities conducted under your account</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">3. Purchases and Payment Terms</h2>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>All transactions require accurate payment and billing information</li>
                <li>Sales are final unless explicitly covered under our Refund Policy</li>
                <li>We reserve the right to cancel, refuse, or modify orders at our sole discretion</li>
                <li>Pricing is subject to change without prior notice</li>
                <li>Payment processing is handled through secure, encrypted channels</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">4. Intellectual Property Rights</h2>
              <p className="text-sm">All website content, including but not limited to text, graphics, logos, images, and trademarks, is the exclusive property of drcoins.shop and its licensors. This content is protected under U.S. intellectual property laws. Unauthorized reproduction, distribution, or modification is strictly prohibited.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">5. Prohibited Activities</h2>
              <p className="text-sm mb-2">Users are expressly prohibited from:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Engaging in fraudulent, deceptive, or illegal activities</li>
                <li>Attempting unauthorized access to our systems or databases</li>
                <li>Using automated tools (bots, scrapers, etc.) without prior written authorization</li>
                <li>Interfering with website operations or compromising security measures</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">6. Account Termination</h2>
              <p className="text-sm mb-2">We reserve the right to terminate accounts for:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Violation of these Terms of Service</li>
                <li>Suspected fraudulent or illegal activity</li>
                <li>Actions that pose risks to our website, users, or business operations</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">7. Disclaimers and Limitations</h2>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Our website and services are provided &quot;as is&quot; without warranties of any kind</li>
                <li>We do not guarantee uninterrupted, error-free, or completely secure service</li>
                <li>Our liability is limited to the amount paid for services within the preceding 6 months</li>
                <li>Users agree to indemnify drcoins.shop against claims arising from Terms violations</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">8. Dispute Resolution</h2>
              <p className="text-sm">These Terms are governed by United States law. Disputes will be resolved through binding arbitration under American Arbitration Association rules. Class-action participation rights are waived.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">9. Policy Updates</h2>
              <p className="text-sm">We may modify these Terms at any time. Changes become effective immediately upon posting. Continued website use constitutes acceptance of revised Terms.</p>
            </div>

            <div className="mt-8 pt-4 border-t border-purple-200">
              <p className="text-sm font-semibold">Contact: drcoins73@gmail.com</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  </div>
);

export default TermsOfService;