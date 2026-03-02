'use client';

import Link from 'next/link';
import { 
  FolderIcon, 
  MagnifyingGlassIcon, 
  ShieldCheckIcon, 
  BellAlertIcon,
  ArrowPathIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

export default function LearnMorePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-sm bg-slate-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 text-white hover:text-blue-400 transition-colors">
                <ArrowLeftIcon className="h-5 w-5" />
                <span className="font-semibold">Back to Home</span>
              </Link>
              <Link
                href="/login"
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Access Portal
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 text-xs font-semibold tracking-wider text-blue-300 uppercase bg-blue-500/10 rounded-full border border-blue-400/30 backdrop-blur-sm mb-6">
              About S.E.A.D.
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6">
              Learn More About Our
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 mt-2">
                Approval System
              </span>
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Transform your organization's document management and approval workflows with our comprehensive digital solution.
            </p>
          </div>

          {/* Essential Features */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Essential Features</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Feature 1 */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 hover:bg-white/10 transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-400/30">
                      <FolderIcon className="h-6 w-6 text-blue-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">Centralized Storage & Search</h3>
                    <ul className="space-y-2 text-slate-300">
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Structured folders/workspaces for departments and projects</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Metadata and full-text indexing for quick retrieval by keyword, tag, or status</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Version control with access to document history</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 hover:bg-white/10 transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-400/30">
                      <ShieldCheckIcon className="h-6 w-6 text-blue-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">Secure Access & Sharing</h3>
                    <ul className="space-y-2 text-slate-300">
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Role and group-based permissions (view, edit, approve, share)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Complete audit trails of access and changes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Secure sharing links with expiry, watermarks, and e-signature integration</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 hover:bg-white/10 transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-400/30">
                      <ArrowPathIcon className="h-6 w-6 text-blue-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">Workflow Automation & Reminders</h3>
                    <ul className="space-y-2 text-slate-300">
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Configurable approval workflows (single or multi-level)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Smart routing based on type, department, or value</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Automated reminders and escalations with tracking dashboards</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8 hover:bg-white/10 transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-400/30">
                      <ChartBarIcon className="h-6 w-6 text-blue-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">Integration & Governance</h3>
                    <ul className="space-y-2 text-slate-300">
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Integrations with email, office suites, and business systems (ERP/CRM/HR)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Defined retention policies and automated backups</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Compliance controls (GDPR, sector regulations) for audits</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Key Benefits</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: MagnifyingGlassIcon, title: 'Fast Search', desc: 'Find any document in seconds' },
                { icon: ShieldCheckIcon, title: 'Secure', desc: 'Enterprise-grade security' },
                { icon: BellAlertIcon, title: 'Notifications', desc: 'Stay informed automatically' },
                { icon: ChartBarIcon, title: 'Analytics', desc: 'Track performance metrics' }
              ].map((benefit, index) => (
                <div key={index} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center hover:bg-white/10 transition-all">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-500/20 rounded-full border border-blue-400/30 mb-4">
                    <benefit.icon className="h-7 w-7 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{benefit.title}</h3>
                  <p className="text-sm text-slate-400">{benefit.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
            <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
              Transform your organization's approval workflows today with S.E.A.D.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="px-8 py-3.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold hover:shadow-[0_0_30px_5px_rgba(59,130,246,0.5)] min-w-[200px]"
              >
                Access Portal
              </Link>
              <Link
                href="/"
                className="px-8 py-3.5 border-2 border-slate-600 text-slate-200 rounded-lg hover:bg-white/5 hover:border-slate-400 transition-colors font-semibold min-w-[200px]"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 py-8 text-center text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} S.E.A.D. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
