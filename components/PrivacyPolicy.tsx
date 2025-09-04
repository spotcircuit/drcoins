'use client';

import React from 'react';

const SectionCard: React.FC<{children?: React.ReactNode, className?: string}> = ({ children, className = "" }) => (
  <div className={`bg-teal-50/90 backdrop-blur supports-[backdrop-filter]:bg-teal-50/80 ring-2 ring-orange-400 rounded-2xl p-6 shadow-lg ${className}`}>
    {children}
  </div>
);

const PrivacyPolicy: React.FC<{onClose: () => void}> = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="relative bg-gradient-to-br from-slate-900 to-purple-950 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-gradient-to-r from-purple-900 to-slate-900 p-4 flex justify-between items-center rounded-t-2xl">
        <h1 className="text-2xl font-bold text-white">PRIVACY POLICY</h1>
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
              <h2 className="text-lg font-semibold mb-2">1. Our Commitment to Privacy</h2>
              <p className="text-sm">Drcoins.shop is committed to protecting your personal information and maintaining transparency about our data practices in compliance with applicable U.S. privacy laws.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">2. Information Collection</h2>
              <ul className="text-sm space-y-2">
                <li><strong>Personal Information:</strong> Name, email, phone number, billing/shipping addresses, payment details</li>
                <li><strong>Technical Information:</strong> IP address, browser type, device information, usage analytics</li>
                <li><strong>Tracking Technologies:</strong> Cookies and similar technologies for enhanced user experience</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">3. Information Usage</h2>
              <p className="text-sm mb-2">We use collected information to:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Process transactions and fulfill orders</li>
                <li>Provide customer support and technical assistance</li>
                <li>Improve website functionality and user experience</li>
                <li>Send promotional communications (opt-in basis)</li>
                <li>Ensure legal compliance and fraud prevention</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">4. Legal Compliance</h2>
              <p className="text-sm mb-2">This Privacy Policy complies with:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Federal Trade Commission (FTC) Act</li>
                <li>Children&apos;s Online Privacy Protection Act (COPPA)</li>
                <li>California Consumer Privacy Act (CCPA)</li>
                <li>Payment Card Industry Data Security Standard (PCI DSS)</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">5. Consumer Rights</h2>
              <p className="text-sm mb-2">You have the right to:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Access your personal data</li>
                <li>Correct or delete your information</li>
                <li>Opt-out of marketing communications and data sharing</li>
                <li>Request data portability where applicable</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">6. Information Sharing</h2>
              <p className="text-sm mb-2">We do not sell personal information. Limited sharing occurs with:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li><strong>Service Providers:</strong> Payment processors, shipping companies, IT support</li>
                <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> During mergers, acquisitions, or asset sales</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">7. Data Security</h2>
              <p className="text-sm">We implement industry-standard security measures including encryption, secure servers, and regular security audits. However, no internet transmission is 100% secure.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">8. Data Retention</h2>
              <p className="text-sm">Personal data is retained only as long as necessary for service provision and legal compliance. Data deletion requests are honored unless legal retention is required.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">9. Breach Notification</h2>
              <p className="text-sm">In compliance with U.S. data breach laws, affected users will be promptly notified of any security incidents involving personal information.</p>
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

export default PrivacyPolicy;