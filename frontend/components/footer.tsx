import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-600 text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} Meta Ads Analytics Platform. All rights reserved.
          </div>
          <nav className="flex space-x-6">
            <Link href="/privacy" className="text-gray-600 hover:text-gray-900 text-sm">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-600 hover:text-gray-900 text-sm">
              Terms of Service
            </Link>
            <Link href="/settings" className="text-gray-600 hover:text-gray-900 text-sm">
              Settings
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}