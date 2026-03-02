'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="relative overflow-hidden min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Premium Background with Glow Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '700ms' }}></div>
        <div className="absolute -bottom-[10%] left-[20%] w-[45%] h-[45%] bg-purple-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1000ms' }}></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="mx-auto max-w-6xl w-full text-center">
            <div className="space-y-12">
              {/* Badge */}
              <div className="inline-block">
                <span className="inline-flex items-center px-4 py-2 text-xs font-semibold tracking-wider text-blue-300 uppercase bg-blue-500/10 rounded-full border border-blue-400/30 backdrop-blur-sm">
                  Modern Enterprise Workflow
                </span>
              </div>

              {/* Main Title */}
              <div className="space-y-6">
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight">
                  <span className="block text-white mb-3">
                    System for Enterprise
                  </span>
                  <span className="block bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500">
                    Approval Digitalization
                  </span>
                </h1>
                
                <p className="text-lg sm:text-xl lg:text-2xl text-slate-300 max-w-3xl mx-auto font-light leading-relaxed">
                  Experience seamless, secure, and intelligent decision-making with{' '}
                  <span className="font-bold text-white">S.E.A.D.</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link
                  href="/login"
                  className="group relative inline-flex items-center justify-center px-8 py-3.5 font-semibold text-white transition-all duration-300 bg-blue-600 rounded-lg hover:bg-blue-700 hover:shadow-[0_0_30px_5px_rgba(59,130,246,0.5)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 min-w-[180px]"
                >
                  <span className="relative flex items-center gap-2">
                    Access Portal
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </Link>

                <Link
                  href="/learn-more"
                  className="px-8 py-3.5 font-semibold text-slate-200 transition-all duration-300 border-2 border-slate-600 rounded-lg hover:bg-white/5 hover:text-white hover:border-slate-400 min-w-[180px]"
                >
                  Learn More
                </Link>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-20 pt-16 border-t border-white/10">
                <div className="text-center group cursor-default">
                  <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-blue-500/10 border border-blue-400/20 group-hover:bg-blue-500/20 transition-colors">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                    Secure
                  </h3>
                  <p className="text-sm text-slate-400">
                    Enterprise-grade encryption
                  </p>
                </div>

                <div className="text-center group cursor-default">
                  <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-blue-500/10 border border-blue-400/20 group-hover:bg-blue-500/20 transition-colors">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                    Efficient
                  </h3>
                  <p className="text-sm text-slate-400">
                    Automated routing logic
                  </p>
                </div>

                <div className="text-center group cursor-default">
                  <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-blue-500/10 border border-blue-400/20 group-hover:bg-blue-500/20 transition-colors">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                    Auditable
                  </h3>
                  <p className="text-sm text-slate-400">
                    Full compliance tracking
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="py-6 text-center text-slate-500 text-sm border-t border-white/5">
          &copy; {new Date().getFullYear()} S.E.A.D. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
