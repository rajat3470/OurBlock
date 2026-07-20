import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | mohallaMitr',
  description: 'Privacy Policy for the mohallaMitr mobile application.',
};

const effectiveDate = '20 July 2026';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:py-16">
      <article className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">mohallaMitr</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Privacy Policy</h1>
          <p className="mt-3 text-sm text-slate-600">Effective date: {effectiveDate}</p>
        </header>

        <div className="mt-8 space-y-8 text-base leading-7 text-slate-700">
          <p>
            This Privacy Policy explains how mohallaMitr collects, uses, shares, and protects information when you use
            the mohallaMitr mobile application and related services. By using the app, you agree to this policy.
          </p>

          <Section title="1. Information we collect">
            <p>We collect information needed to operate a local marketplace and order-delivery service, including:</p>
            <ul>
              <li>Account details such as your name, phone number, email address, role, and authentication details.</li>
              <li>Profile and address details, including society, delivery address, and any information you provide in your profile.</li>
              <li>Order details, such as items ordered, delivery instructions, order status, business information, and transaction records.</li>
              <li>Messages, support requests, ratings, feedback, and other content you submit through the service.</li>
              <li>Device and app information, including device identifiers, app version, crash diagnostics, notification token, and log data.</li>
              <li>Camera, microphone, and photo-library content only when you choose to use features that require those permissions.</li>
            </ul>
          </Section>

          <Section title="2. How we use information">
            <p>We use information to create and secure accounts, process and fulfil orders, coordinate customers, businesses, and delivery partners, send order and service notifications, provide support, prevent fraud and misuse, improve reliability, and comply with legal obligations.</p>
          </Section>

          <Section title="3. Sharing of information">
            <p>We share only the information necessary to provide the service. Order and contact details may be shared with the relevant business and delivery partner to fulfil an order. We may also use service providers for authentication, cloud hosting, analytics, crash diagnostics, notifications, and customer support. We may disclose information where required by law or to protect the rights, safety, and security of our users and service.</p>
          </Section>

          <Section title="4. Permissions">
            <p>The app may request camera, microphone, photo-library, notification, and storage permissions. These are optional unless required for a feature you select, such as uploading an image, recording media, receiving order updates, or attaching content to a support request. You can manage permissions in your device settings.</p>
          </Section>

          <Section title="5. Data retention and security">
            <p>We retain information for as long as needed to provide the service, resolve disputes, meet legal obligations, and enforce our agreements. We use reasonable administrative, technical, and organisational safeguards, but no internet service can guarantee absolute security.</p>
          </Section>

          <Section title="6. Your choices and rights">
            <p>You may review or update certain account information in the app. You may disable notifications or device permissions through your device settings. To request access, correction, deletion, or information about your data, contact us through the in-app support feature. We may need to verify your identity and may retain limited information where legally required.</p>
          </Section>

          <Section title="7. Children’s privacy">
            <p>The service is not directed to children under the age at which they can lawfully consent to data processing in their location. We do not knowingly collect personal information from children without appropriate consent. If you believe a child has provided us personal information, contact us through in-app support.</p>
          </Section>

          <Section title="8. Changes to this policy">
            <p>We may update this policy when our practices or legal obligations change. We will post the revised policy on this page and update the effective date. Continued use of the service after an update means you accept the revised policy.</p>
          </Section>

          <Section title="9. Contact">
            <p>For privacy questions or requests, contact the mohallaMitr team through the in-app support feature.</p>
          </Section>
        </div>

        <footer className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-600">
          <Link href="/terms-and-conditions" className="font-medium text-emerald-700 hover:text-emerald-800">
            Read the Terms and Conditions
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
