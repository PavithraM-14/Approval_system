'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="relative overflow-hidden min-h-screen bg-slate-900">
      {/* Premium Background with Glow Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse delay-700"></div>
        <div className="absolute -bottom-[10%] left-[20%] w-[45%] h-[45%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <main className="flex-1 flex items-center justify-center">
          <div className="mx-auto max-w-5xl px-4 w-full text-center">
            <div className="space-y-12">
              {/* Main Title Container */}
              <div className="space-y-4">
                <span className="inline-block px-4 py-1.5 mb-4 text-sm font-semibold tracking-wider text-blue-400 uppercase bg-blue-400/10 rounded-full border border-blue-400/20">
                  Modern Enterprise Workflow
                </span>
                <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white mb-6">
                  <span className="block mb-2">System for Enterprise</span>
                  <span className="block bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                    Approval Digitalization
                  </span>
                </h1>
                <p className="text-xl sm:text-2xl text-slate-400 max-w-2xl mx-auto font-medium">
                  Experience seamless, secure, and intelligent decision-making with <span className="text-white font-bold">S.E.A.D.</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
                <Link
                  href="/login"
                  className="group relative inline-flex items-center justify-center px-10 py-4 font-bold text-white transition-all duration-300 bg-blue-600 rounded-xl hover:bg-blue-700 hover:shadow-[0_0_40px_8px_rgba(37,99,235,0.4)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                  <span className="relative flex items-center gap-2">
                    Access Portal
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </Link>

                <Link
                  href="/docs"
                  className="px-10 py-4 font-bold text-slate-300 transition-all duration-300 border border-slate-700 rounded-xl hover:bg-white/5 hover:text-white hover:border-slate-500"
                >
                  Learn More
                </Link>
              </div>

              {/* Floating Features Hint */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-24 pt-16 border-t border-white/5">
                {[
                  { label: "Secure", desc: "Enterprise-grade encryption" },
                  { label: "Efficient", desc: "Automated routing logic" },
                  { label: "Auditable", desc: "Full compliance tracking" }
                ].map((item, i) => (
                  <div key={i} className="text-center group cursor-default">
                    <div className="text-white font-bold mb-1 transition-colors group-hover:text-blue-400">{item.label}</div>
                    <div className="text-sm text-slate-500">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        <footer className="py-8 text-center text-slate-600 text-sm">
          &copy; {new Date().getFullYear()} S.E.A.D. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
