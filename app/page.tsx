import Link from 'next/link';
import Image from 'next/image';
import srmLogo from './assets/SRMRMP_LOGO.png';


export default function HomePage() {
  return (
    <div className="bg-white">
      
      {/* Header */}
<header className="bg-gradient-to-r from-blue-700 to-blue-600 shadow-lg w-full">
  <div className="w-full">
    <div className="flex items-center py-6 pl-6 gap-4">

      {/* SRM Logo */}
      <Image
        src={srmLogo}
        alt="SRM Logo"
        className="h-16 w-auto"
        priority
      />

      {/* Title */}
      <h1 className="text-4xl font-bold text-white tracking-wide drop-shadow-sm">
        SRM-RMP Approval System
      </h1>

    </div>
  </div>
</header>

      {/* Hero Section */}
      <div className="relative bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:pb-28 xl:pb-32">
            <main className="mt-16 mx-auto max-w-3xl px-4 sm:mt-20">
              <div className="text-center">

                <h1 className="text-5xl tracking-tight font-extrabold text-gray-900 sm:text-6xl">
                  <span className="block">Digital Institutional</span>
                  <span className="block text-blue-700">Approval System</span>
                </h1>

                <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
                  Streamline your institutional approval process with our comprehensive digital workflow system.
                  From request submission to final approval, manage every step efficiently.
                </p>

                <div className="mt-10 flex justify-center">
                  <Link
                    href="/login"
                    className="bg-blue-700 hover:bg-blue-800 text-white text-lg px-10 py-3 rounded-lg shadow-md transition"
                  >
                    Login
                  </Link>
                </div>

              </div>
            </main>
          </div>
        </div>
      </div>

    </div>
  );
}
