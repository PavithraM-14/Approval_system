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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-200/30 rounded-full blur-[120px]"></div>
        <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] bg-indigo-200/30 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-gray-200 backdrop-blur-sm bg-white/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 text-gray-700 hover:text-indigo-600 transition-colors">
                <ArrowLeftIcon className="h-5 w-5" />
                <span className="font-semibold">Back to Home</span>
              </Link>
              <Link
                href="/login"
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
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
            <span className="inline-block px-4 py-2 text-xs font-semibold tracking-wider text-indigo-700 uppercase bg-indigo-100 rounded-full border border-indigo-200 backdrop-blur-sm mb-6">
              About S.E.A.D.
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6">
              Learn More About Our
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600 mt-2">
                Approval System
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Transform your organization&apos;s document management and approval workflows with our comprehensive digital solution.
            </p>
          </div>

          {/* Essential Features */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Essential Features</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Feature 1 */}
              <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-xl p-8 hover:shadow-lg transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center border border-blue-200">
                      <FolderIcon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Centralized Storage & Search</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Structured folders/workspaces for departments and projects</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Metadata and full-text indexing for quick retrieval by keyword, tag, or status</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Version control with access to document history</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-xl p-8 hover:shadow-lg transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center border border-blue-200">
                      <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Secure Access & Sharing</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Role and group-based permissions (view, edit, approve, share)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Complete audit trails of access and changes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Secure sharing links with expiry, watermarks, and e-signature integration</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-xl p-8 hover:shadow-lg transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center border border-blue-200">
                      <ArrowPathIcon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Workflow Automation & Reminders</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Configurable approval workflows (single or multi-level)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Smart routing based on type, department, or value</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Automated reminders and escalations with tracking dashboards</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-xl p-8 hover:shadow-lg transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center border border-blue-200">
                      <ChartBarIcon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Integration & Governance</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Integrations with email, office suites, and business systems (ERP/CRM/HR)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Defined retention policies and automated backups</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
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
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Key Benefits</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: MagnifyingGlassIcon, title: 'Fast Search', desc: 'Find any document in seconds' },
                { icon: ShieldCheckIcon, title: 'Secure', desc: 'Enterprise-grade security' },
                { icon: BellAlertIcon, title: 'Notifications', desc: 'Stay informed automatically' },
                { icon: ChartBarIcon, title: 'Analytics', desc: 'Track performance metrics' }
              ].map((benefit, index) => (
                <div key={index} className="bg-white backdrop-blur-sm border border-gray-200 rounded-xl p-6 text-center hover:shadow-lg transition-all">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full border border-blue-200 mb-4">
                    <benefit.icon className="h-7 w-7 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-sm text-gray-600">{benefit.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-white backdrop-blur-sm border border-gray-200 rounded-2xl p-12 shadow-lg">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Get Started?</h2>
            <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto">
              Transform your organization&apos;s approval workflows today with S.E.A.D.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="px-8 py-3.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold hover:shadow-xl min-w-[200px]"
              >
                Access Portal
              </Link>
              <Link
                href="/"
                className="px-8 py-3.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors font-semibold min-w-[200px]"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 py-8 text-center text-gray-600 text-sm">
          &copy; {new Date().getFullYear()} S.E.A.D. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
