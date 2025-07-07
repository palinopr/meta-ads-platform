export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <p className="text-sm text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing and using the Meta Ads Analytics Platform, you accept and agree to be bound by the terms 
            and provision of this agreement.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">2. Use License</h2>
          <p>
            Permission is granted to use the Meta Ads Analytics Platform for personal and commercial use. 
            This license shall automatically terminate if you violate any of these restrictions.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">3. Account Responsibilities</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>You are responsible for maintaining the confidentiality of your account</li>
            <li>You are responsible for all activities that occur under your account</li>
            <li>You must provide accurate and complete information</li>
            <li>You must be authorized to access the Facebook/Meta ad accounts you connect</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">4. Facebook/Meta Integration</h2>
          <p>
            By connecting your Facebook/Meta account, you authorize us to access your advertising data on your behalf. 
            You must comply with Facebook's Terms of Service and Advertising Policies.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">5. Prohibited Uses</h2>
          <p className="mb-2">You may not use the service to:</p>
          <ul className="list-disc ml-6 space-y-1">
            <li>Violate any laws or regulations</li>
            <li>Access unauthorized accounts or data</li>
            <li>Transmit viruses or malicious code</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Resell or redistribute the service without permission</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">6. Service Availability</h2>
          <p>
            We strive to provide reliable service but do not guarantee uninterrupted access. The service is provided 
            "as is" without warranties of any kind.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">7. Limitation of Liability</h2>
          <p>
            In no event shall Meta Ads Analytics Platform be liable for any indirect, incidental, special, 
            consequential, or punitive damages resulting from your use of the service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">8. Data Accuracy</h2>
          <p>
            While we strive to provide accurate data, we rely on the Facebook Marketing API for metrics. 
            We are not responsible for discrepancies in data provided by Facebook/Meta.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">9. Termination</h2>
          <p>
            We may terminate or suspend your account immediately, without prior notice or liability, 
            for any reason whatsoever, including without limitation if you breach the Terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">10. Changes to Terms</h2>
          <p>
            We reserve the right to modify or replace these Terms at any time. If a revision is material, 
            we will try to provide at least 30 days notice prior to any new terms taking effect.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">11. Contact Information</h2>
          <p>
            Questions about the Terms of Service should be sent to us at legal@outletmediamethod.com
          </p>
        </section>
      </div>
    </div>
  )
}