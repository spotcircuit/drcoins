'use client';

import React from 'react';

const SectionCard: React.FC<{children?: React.ReactNode, className?: string}> = ({ children, className = "" }) => (
  <div className={`bg-teal-50/90 backdrop-blur supports-[backdrop-filter]:bg-teal-50/80 ring-2 ring-orange-400 rounded-2xl p-6 shadow-lg ${className}`}>
    {children}
  </div>
);

const RefundPolicy: React.FC<{onClose: () => void}> = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="relative bg-gradient-to-br from-slate-900 to-purple-950 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-gradient-to-r from-purple-900 to-slate-900 p-4 flex justify-between items-center rounded-t-2xl">
        <h1 className="text-2xl font-bold text-white">REFUND POLICY</h1>
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
              <h2 className="text-lg font-semibold mb-2">1. Refund Eligibility Criteria</h2>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Refund requests must be submitted within 24 hours of transaction completion</li>
                <li>Refunds are only available if coins have not been delivered to the user&apos;s account</li>
                <li>All sales are final once coins are successfully delivered and confirmed</li>
                <li>No refunds for incorrect user IDs or account information provided by the buyer</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">2. Non-Refundable Situations</h2>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Coins already delivered to user accounts</li>
                <li>Buyer&apos;s remorse or change of mind post-delivery</li>
                <li>Delays caused by third-party platforms or app-related issues beyond our control</li>
                <li>User error in account information or order details</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">3. Refund Request Process</h2>
              <p className="text-sm mb-2">To request a refund, email drcoins73@gmail.com with:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>LiveMe ID Number</li>
                <li>Order number and purchase date</li>
                <li>Detailed reason for refund request</li>
                <li>Transaction proof or screenshots (if applicable)</li>
              </ul>
              <p className="text-sm mt-2"><strong>Processing Time:</strong> 2-3 business days for review and determination</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">4. Chargeback Policy</h2>
              <p className="text-sm mb-2">Initiating chargebacks without contacting us first may result in:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Suspension of purchasing privileges</li>
                <li>Freezing of LiveMe account for disputed amounts plus fees</li>
              </ul>
              <p className="text-sm mt-2">We encourage direct communication for prompt, professional resolution</p>
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

export default RefundPolicy;