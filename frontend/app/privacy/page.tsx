export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-2xl font-semibold mb-3">1. Information We Collect</h2>
          <p className="mb-2">We collect information you provide directly to us, such as:</p>
          <ul className="list-disc ml-6 space-y-1">
            <li>Name and email address when you create an account</li>
            <li>Company information</li>
            <li>Facebook/Meta advertising account data when you connect your account</li>
            <li>Campaign performance metrics and analytics data</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">2. How We Use Your Information</h2>
          <p className="mb-2">We use the information we collect to:</p>
          <ul className="list-disc ml-6 space-y-1">
            <li>Provide, maintain, and improve our services</li>
            <li>Display your advertising analytics and metrics</li>
            <li>Send you technical notices and support messages</li>
            <li>Communicate with you about products, services, and events</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">3. Facebook/Meta Data</h2>
          <p>
            When you connect your Facebook/Meta account, we access your advertising data through the Facebook Marketing API. 
            We only request permissions necessary to display your advertising metrics and do not store your Facebook 
            credentials. You can revoke access at any time through your Facebook settings or our platform settings.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">4. Data Security</h2>
          <p>
            We use industry-standard security measures to protect your information. Your data is encrypted in transit 
            and at rest. We use Supabase for secure data storage with row-level security policies.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">5. Data Sharing</h2>
          <p>
            We do not sell, trade, or otherwise transfer your personal information to third parties. Your advertising 
            data is only accessible to you and authorized users within your organization.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">6. Data Retention</h2>
          <p>
            We retain your information for as long as your account is active. You may request deletion of your data 
            at any time by contacting us.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">7. Your Rights</h2>
          <p className="mb-2">You have the right to:</p>
          <ul className="list-disc ml-6 space-y-1">
            <li>Access your personal information</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Disconnect your Facebook/Meta account</li>
            <li>Export your data</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">8. Cookies</h2>
          <p>
            We use cookies and similar tracking technologies to track activity on our service and hold certain 
            information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">9. Changes to This Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new 
            Privacy Policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">10. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at privacy@outletmediamethod.com
          </p>
        </section>
      </div>
    </div>
  )
}