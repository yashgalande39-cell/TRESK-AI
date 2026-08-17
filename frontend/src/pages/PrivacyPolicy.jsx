import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = 'Privacy Policy — TRESK AI';
    window.scrollTo(0, 0);
  }, []);

  const LAST_UPDATED = 'June 24, 2026';
  const CONTACT_EMAIL = 'privacy@tresk.ai';
  const APP_NAME = 'TRESK AI';
  const COMPANY_NAME = 'TRESK Technologies';

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-300" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="border-b border-white/5 bg-white/[0.02]">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm"
          >
            <ArrowLeft size={15} />
            Back to TRESK AI
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-14">
        {/* Title */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Shield size={18} className="text-indigo-400" />
          </div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">Legal</span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-invert max-w-none space-y-8 text-slate-300 leading-relaxed">

          <section>
            <p>
              {COMPANY_NAME} ("we", "our", or "us") operates {APP_NAME} (the "Service"). This Privacy Policy explains how we collect,
              use, disclose, and safeguard your information when you use our Service. Please read this policy carefully.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
            <h3 className="text-base font-medium text-slate-200 mb-2">1.1 Information You Provide</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Account registration data: name, email address, password (stored as a bcrypt hash)</li>
              <li>Profile information: college name, branch, graduation year, bio, location</li>
              <li>Resume content uploaded for ATS analysis</li>
              <li>Interview session responses and voice audio clips</li>
            </ul>

            <h3 className="text-base font-medium text-slate-200 mt-4 mb-2">1.2 Information Collected Automatically</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Usage data: pages visited, features used, interview session metadata</li>
              <li>Performance data: scores, streaks, XP, badges earned</li>
              <li>Device information: browser type, IP address, operating system</li>
              <li>Session tokens stored as httpOnly cookies (not accessible by JavaScript)</li>
            </ul>

            <h3 className="text-base font-medium text-slate-200 mt-4 mb-2">1.3 Google Sign-In</h3>
            <p>
              If you use Google Sign-In, we receive your name, email address, and profile photo from Google.
              We do not receive your Google password.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>To provide, maintain, and improve the Service</li>
              <li>To personalize your interview preparation experience using AI</li>
              <li>To send transactional emails (email verification, password reset)</li>
              <li>To detect and prevent fraud, abuse, and security threats</li>
              <li>To comply with legal obligations</li>
              <li>To analyze usage patterns and improve our AI models</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. AI Processing of Your Data</h2>
            <p>
              {APP_NAME} uses AI language models (via OpenRouter and Google Gemini) to generate interview questions,
              evaluate your answers, and analyze your resume. Your interview responses and resume content may be sent
              to these third-party AI providers for processing. We do not use your personal data to train third-party AI models
              beyond what is necessary to provide the Service.
            </p>
            <p className="mt-3">
              AI-generated feedback is for educational purposes only and does not constitute professional career advice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Data Sharing and Disclosure</h2>
            <p className="mb-3">We do not sell your personal data. We may share information with:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-slate-200">Sarvam AI</strong> — for real-time speech-to-text processing</li>
              <li><strong className="text-slate-200">OpenRouter / Google Gemini</strong> — for AI feature processing</li>
              <li><strong className="text-slate-200">Firebase (Google)</strong> — for Google OAuth authentication</li>
              <li><strong className="text-slate-200">Email service providers</strong> — for transactional email delivery</li>
              <li><strong className="text-slate-200">Law enforcement</strong> — when required by applicable law or court order</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Data Security</h2>
            <p>
              We implement industry-standard security measures including:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Passwords hashed using bcrypt (minimum 10 rounds)</li>
              <li>Authentication tokens stored in httpOnly, Secure, SameSite cookies</li>
              <li>All data transmitted over HTTPS/TLS</li>
              <li>Database connections protected with SSL in production</li>
            </ul>

            <p className="mt-3">
              No method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. When you delete your account, we permanently
              delete your personal information, interview sessions, resumes, and usage data within 30 days, except where
              we are required to retain it for legal or accounting purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Your Rights (GDPR / DPDPA)</h2>
            <p className="mb-3">Depending on your jurisdiction, you have the right to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-slate-200">Access</strong> — request a copy of your personal data</li>
              <li><strong className="text-slate-200">Rectification</strong> — correct inaccurate personal data</li>
              <li><strong className="text-slate-200">Erasure</strong> — delete your account and all associated data</li>
              <li><strong className="text-slate-200">Portability</strong> — export your data in a machine-readable format</li>
              <li><strong className="text-slate-200">Objection</strong> — opt out of certain processing activities</li>
            </ul>
            <p className="mt-3">
              You can exercise the right to erasure directly from <Link to="/settings" className="text-indigo-400 hover:text-indigo-300">Settings → Delete Account</Link>.
              For other requests, contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-400 hover:text-indigo-300">{CONTACT_EMAIL}</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Cookies</h2>
            <p>We use the following cookies:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li><code className="text-indigo-300 text-sm">tresk_refresh</code> — httpOnly session cookie for authentication (30-day expiry)</li>
              <li><code className="text-indigo-300 text-sm">tresk_access</code> — httpOnly access token (15-minute expiry)</li>
              <li>Local storage: theme preference, font size — no personal data</li>
            </ul>
            <p className="mt-3">We do not use advertising cookies or third-party tracking cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Children's Privacy</h2>
            <p>
              {APP_NAME} is not directed to children under 13. We do not knowingly collect personal information from
              children under 13. If you believe a child has provided us personal information, contact us at {CONTACT_EMAIL}.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes by email
              or by posting a notice in the app. Continued use of the Service after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Contact Us</h2>
            <p>
              For privacy-related questions or to exercise your rights, contact us at:
            </p>
            <div className="mt-3 p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <p className="text-slate-200 font-medium">{COMPANY_NAME}</p>
              <p>Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-400 hover:text-indigo-300">{CONTACT_EMAIL}</a></p>
            </div>
          </section>
        </div>

        {/* Footer nav */}
        <div className="mt-12 pt-8 border-t border-white/5 flex gap-4 text-sm text-slate-500">
          <Link to="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
          <span>·</span>
          <Link to="/" className="hover:text-slate-300 transition-colors">Back to TRESK AI</Link>
        </div>
      </div>
    </div>
  );
}
