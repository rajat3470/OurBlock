import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms and Conditions | mohallaMitr',
  description: 'Terms and Conditions for the mohallaMitr mobile application.',
};

const effectiveDate = '20 July 2026';

export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:py-16">
      <article className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">mohallaMitr</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Terms and Conditions</h1>
          <p className="mt-3 text-sm text-slate-600">Effective date: {effectiveDate}</p>
        </header>

        <div className="mt-8 space-y-8 text-base leading-7 text-slate-700">
          <p>These Terms and Conditions govern your use of the mohallaMitr mobile application and related services. Please read them carefully before using the service.</p>

          <Section title="1. The service">
            <p>mohallaMitr is a local marketplace platform that helps customers discover local businesses, place orders, and coordinate deliveries. Businesses and delivery partners may use the app to manage listings, orders, and deliveries. We may change, suspend, or discontinue features when necessary.</p>
          </Section>

          <Section title="2. Eligibility and accounts">
            <p>You must provide accurate, current information and keep your login credentials secure. You are responsible for activity under your account. You must notify us through in-app support if you believe your account has been accessed without permission.</p>
          </Section>

          <Section title="3. Orders, businesses, and delivery">
            <p>Businesses are responsible for the availability, quality, pricing, descriptions, preparation, and fulfilment of their products or services. Delivery times are estimates and may vary due to business operations, traffic, weather, or other circumstances. You must provide a complete and accurate delivery address and be available to receive your order where applicable.</p>
          </Section>

          <Section title="4. Payments, cancellations, and refunds">
            <p>Prices, charges, promotions, cancellation rules, and refund availability may be shown before you place an order. Refunds and cancellations are handled according to the applicable business policy and legal requirements. Do not submit fraudulent payment information or misuse any promotion.</p>
          </Section>

          <Section title="5. Acceptable use">
            <p>You must not use the service for unlawful, harmful, fraudulent, abusive, or deceptive purposes. You must not interfere with the service, attempt unauthorised access, upload malicious content, harass other users, or create false orders, ratings, or accounts. We may suspend or terminate accounts that violate these Terms.</p>
          </Section>

          <Section title="6. User content and feedback">
            <p>You retain ownership of content you submit, such as feedback, images, and messages. You grant us a non-exclusive licence to use that content only to operate, improve, protect, and promote the service. You confirm that you have the rights needed to submit the content and that it does not violate another person’s rights.</p>
          </Section>

          <Section title="7. Third-party services">
            <p>The service may rely on third-party providers for payments, cloud infrastructure, maps, notifications, authentication, analytics, or other functionality. Their terms and privacy policies may also apply to your use of those services.</p>
          </Section>

          <Section title="8. Disclaimers and limitation of liability">
            <p>The service is provided on an “as is” and “as available” basis to the fullest extent permitted by law. We do not guarantee uninterrupted, error-free, or fully secure operation. To the maximum extent permitted by law, mohallaMitr is not liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the service. Nothing in these Terms limits rights that cannot legally be limited.</p>
          </Section>

          <Section title="9. Changes and termination">
            <p>We may update these Terms by posting the revised version on this page and changing the effective date. Continued use after an update means you accept the revised Terms. You may stop using the service at any time. We may suspend or terminate access when necessary to protect users, the platform, or comply with law.</p>
          </Section>

          <Section title="10. Governing law and contact">
            <p>These Terms are governed by the laws applicable where mohallaMitr operates, subject to mandatory consumer-protection laws. For questions, concerns, or support, contact the mohallaMitr team through the in-app support feature.</p>
          </Section>
        </div>

        <footer className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-600">
          <Link href="/privacy-policy" className="font-medium text-emerald-700 hover:text-emerald-800">
            Read the Privacy Policy
          </Link>
        </footer>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
