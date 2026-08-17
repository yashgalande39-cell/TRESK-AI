import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
  useEffect(() => {
    document.title = 'Terms of Service — TRESK AI';
    window.scrollTo(0, 0);
  }, []);

  const LAST_UPDATED = 'June 24, 2026';
  const CONTACT_EMAIL = 'legal@tresk.ai';
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
          <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <FileText size={18} className="text-violet-400" />
          </div>
          <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Legal</span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-500 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-invert max-w-none space-y-8 text-slate-300 leading-relaxed">

          <section>
            <p>
              These Terms of Service ("Terms") govern your access to and use of {APP_NAME}, operated by {COMPANY_NAME} ("we", "us", "our").
              By creating an account or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Account Registration</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>You must be at least 13 years of age to create an account.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You must provide accurate and complete information during registration.</li>
              <li>You must verify your email address within 7 days of registration to maintain full access.</li>
              <li>One person may not maintain multiple accounts. Duplicate accounts may be suspended.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. 100% Free Platform Access</h2>
            <p>
              The AI Mock Interview Platform is completely free for all students, developers, and job seekers. 
              Every user receives full community access to unlimited mock interviews across all rounds (HR, Technical, Behavioral, Aptitude, Coding), 
              ATS resume scanning, real-time Sarvam AI voice transcription, coding sandboxes, and advanced telemetry analytics at zero cost.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Acceptable Use</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Use the Service for any unlawful purpose or in violation of any regulations</li>
              <li>Share your account credentials with others or allow others to access your account</li>
              <li>Attempt to circumvent plan restrictions or access controls</li>
              <li>Use automated scripts, bots, or scrapers to access the Service</li>
              <li>Upload malicious content, viruses, or harmful code</li>
              <li>Engage in harassment, abuse, or discrimination toward other users</li>
              <li>Use AI-generated interview answers to deceive real employers in actual interviews</li>
              <li>Resell, sublicense, or commercialize access to the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. AI Services and Limitations</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>AI-generated content (questions, feedback, analysis) is for educational and practice purposes only.</li>
              <li>We do not guarantee the accuracy, completeness, or fitness for any particular purpose of AI outputs.</li>
              <li>AI feedback does not constitute professional career counseling or employment advice.</li>
              <li>Model availability and quality may vary. We reserve the right to change AI models at any time.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Intellectual Property</h2>
            <p>
              The Service, including its design, interface, underlying technology, and content we provide, is owned by {COMPANY_NAME}
              and protected by intellectual property laws. You may not copy, modify, distribute, or reverse-engineer any part of the Service.
            </p>
            <p className="mt-3">
              You retain ownership of content you submit to the Service (resume content, interview answers). By submitting content,
              you grant us a limited license to process and display it solely for providing the Service to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Service Availability</h2>
            <p>
              We strive for 99.5% uptime but do not guarantee uninterrupted access. We may perform scheduled maintenance
              with advance notice. We are not liable for downtime caused by third-party services (AI providers, payment processors, cloud infrastructure).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Disclaimer of Warranties</h2>
            <p className="uppercase text-sm">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED,
              INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, {COMPANY_NAME.toUpperCase()} SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF DATA, LOST PROFITS, OR LOSS OF OPPORTUNITY,
              ARISING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID
              TO US IN THE 12 MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Account Termination</h2>
            <p>
              You may delete your account at any time from <Link to="/settings" className="text-violet-400 hover:text-violet-300">Settings → Delete Account</Link>.
              We may suspend or terminate accounts that violate these Terms, without prior notice and without refund.
              Upon termination, your data will be deleted within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Governing Law</h2>
            <p>
              These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction
              of the courts of India. If you are located outside India, you consent to jurisdiction in India.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Changes to These Terms</h2>
            <p>
              We may update these Terms at any time. We will provide at least 14 days' notice of material changes via email
              or in-app notification. Continued use after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. Contact</h2>
            <div className="mt-3 p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <p className="text-slate-200 font-medium">{COMPANY_NAME}</p>
              <p>Legal inquiries: <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-400 hover:text-violet-300">{CONTACT_EMAIL}</a></p>
            </div>
          </section>
        </div>

        {/* Footer nav */}
        <div className="mt-12 pt-8 border-t border-white/5 flex gap-4 text-sm text-slate-500">
          <Link to="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/" className="hover:text-slate-300 transition-colors">Back to TRESK AI</Link>
        </div>
      </div>
    </div>
  );
}
