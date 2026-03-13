'use client';

import Link from 'next/link';
import Image from 'next/image';
import SeadLogo from '../components/SeadLogo';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">

      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">

            <SeadLogo className="w-35 h-16" />

            <div className="flex items-center gap-4">
              <Link href="/login" className="text-gray-700 hover:text-gray-900 font-medium">
                Login
              </Link>

              <Link
                href="/signup"
                className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 shadow-sm"
              >
                Get Started
              </Link>
            </div>

          </div>
        </div>
      </nav>


      {/* Hero Section */}
      <main className="relative overflow-hidden">

        <div className="max-w-7xl mx-auto px-6 pt-2 pb-10">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left Column */}
            <div className="space-y-6">

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight">
                Digital Approval & Document
                <span className="block text-gray-400 mt-2">
                  Management Platform
                </span>
              </h1>

              <p className="text-xl text-gray-600 leading-relaxed">
                Simplify request approvals, securely store documents, and
                improve workflow efficiency across your organization.
              </p>

              <p className="text-sm text-gray-500 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Faster approvals • Complete transparency • Automated routing
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">

                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 shadow-lg"
                >
                  Access Portal
                </Link>

                <Link
                  href="/learn-more"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:border-indigo-600"
                >
                  Learn More
                </Link>

              </div>

            </div>


            {/* Right Column */}
            <div className="relative h-[620px] flex items-center justify-center">

              {/* Background Shape */}
<div className="absolute w-[480px] h-[480px] bg-indigo-100 rounded-[120px] rotate-12"></div>

                {/* Top Left Card */}
              <div className="absolute left-0 top-10 bg-black text-white rounded-2xl p-5 shadow-xl w-64 animate-float">

                <p className="text-sm font-semibold mb-2">Material Request</p>

                <div className="text-xs text-gray-300 mb-2">Manager Review</div>

                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="bg-gray-700 px-2 py-1 rounded text-xs">Document</span>
                  <span className="bg-gray-700 px-2 py-1 rounded text-xs">Approve</span>
                  <span className="bg-gray-700 px-2 py-1 rounded text-xs">Notification</span>
                </div>

                <p className="text-xs text-gray-400">
                  March 14, 10:30 am – 7:30 pm
                </p>

              </div>


              {/* Bottom Left Card */}
              <div className="absolute left-6 top-60 bg-white rounded-2xl shadow-xl p-6 w-72 animate-float delay-200">

                <div className="flex items-center gap-3 mb-4">

                  {/* Initial-based Avatar */}
                  <div className="w-[68px] h-[68px] bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-2xl font-bold">RK</span>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900">
                      Rajesh Kumar
                      [Leave Request] 
                    </p>
                    <p className="text-xs text-gray-500">
                      July 14, 10:30 am - 7:30 pm
                    </p>
                  </div>

                </div>

                <button className="bg-orange-300 hover:bg-orange-400 text-gray-800 font-semibold px-4 py-2 rounded-lg w-full">
                  Create Request
                </button>

              </div>

              {/* Request Status Card */}
<div className="absolute right-6 top-[460px] bg-white rounded-2xl shadow-xl p-5 w-72 animate-float delay-300">

  {/* Top Row */}
  <div className="flex items-center justify-between mb-3">

    <div className="flex items-center gap-3">

      {/* Document Icon */}
      <div className="w-9 h-9 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>

      <div>
        <p className="font-semibold text-gray-900 text-sm">
          Request #A10234
        </p>
        <p className="text-xs text-gray-500">
          Finance Department
        </p>
      </div>

    </div>

    {/* Status Badge */}
    <span className="bg-yellow-100 text-yellow-700 text-xs px-3 py-1 rounded-full font-medium">
      Pending
    </span>

  </div>

  {/* Request Title */}
  <p className="text-gray-700 text-sm mb-2">
    Equipment Purchase Request
  </p>

  {/* Approval Status */}
  <div className="flex items-center gap-2 text-gray-500 text-sm">
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span>Awaiting Manager Approval</span>
  </div>

</div>


              {/* Status Badge */}
              <div className="absolute right-36 top-20 bg-gray-900 text-white px-4 py-2 rounded-xl shadow-lg text-sm animate-float delay-300">
                Automated Workflow
              </div>


              {/* Image Card */}
              <div className="absolute -right-5 top-32 bg-white rounded-3xl shadow-2xl overflow-hidden animate-float delay-500">

                {/* Notification */}
                <div className="absolute top-1 left-6 bg-white shadow-lg px-4 py-2 rounded-xl flex items-center gap-2 text-sm">

                  <div className="w-8 h-8 bg-black rounded-full"></div>

                  <span className="text-gray-700 font medium">
                    Request Approved!!
                  </span>

                </div>

                <Image
  src="/person1.png"
  alt="person"
  width={280}
  height={360}
  className="w-[280px] h-[260px] object-cover"
/>

                <div className="p-3 flex gap-2 justify-center">
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                </div>

              </div>

            </div>

          </div>
        </div>


        {/* Features Section */}
        <div className="max-w-7xl mx-auto px-6 py-16">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Secure
              </h3>
              <p className="text-gray-600 text-sm">
                Enterprise-grade encryption
              </p>
            </div>

            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Efficient
              </h3>
              <p className="text-gray-600 text-sm">
                Automated routing logic
              </p>
            </div>

            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Auditable
              </h3>
              <p className="text-gray-600 text-sm">
                Full compliance tracking
              </p>
            </div>

          </div>

        </div>

      </main>


      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-gray-600 text-sm">
            © {new Date().getFullYear()} S.E.A.D. All rights reserved.
          </p>
        </div>
      </footer>


      {/* Floating Animation */}
      <style jsx global>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-18px); }
          100% { transform: translateY(0px); }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .delay-200 {
          animation-delay: .2s;
        }

        .delay-300 {
          animation-delay: .3s;
        }

        .delay-500 {
          animation-delay: .5s;
        }
      `}</style>

    </div>
  );
}