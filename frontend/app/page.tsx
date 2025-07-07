import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Meta Ads Analytics Platform
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Powerful analytics for your Meta advertising campaigns
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="bg-primary text-white px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/login"
            className="border border-gray-300 px-6 py-3 rounded-md font-medium hover:bg-gray-50 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    </main>
  )
}