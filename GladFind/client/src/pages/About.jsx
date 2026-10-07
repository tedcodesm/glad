import { Link } from 'react-router-dom';

import { CheckIcon } from '../components/icons.jsx';

const VALUES = [
  {
    title: 'Transparency',
    body: 'Every consultation fee, insurance compatibility and specialist availability is displayed upfront. No hidden information, no surprises at reception.',
  },
  {
    title: 'Accessibility',
    body: 'Healthcare information should not be a privilege. GlandFind is free for patients and works on any internet-connected device, anywhere in Kenya.',
  },
  {
    title: 'Patient privacy',
    body: 'Health data is encrypted, never sold, and shared only with the providers a patient explicitly selects. Built to the Kenya Data Protection Act, 2019.',
  },
  {
    title: 'Quality assurance',
    body: 'Every listed facility undergoes a verification process. Only facilities that pass our criteria receive the GlandFind Verified badge.',
  },
];

const SERVICES = [
  { title: 'Hospital search & discovery', for: 'For patients', body: 'Search by condition, county, town or insurer. Results surface fees, ratings, specialist counts, insurance compatibility and open status — all in one view.' },
  { title: 'Appointment booking', for: 'For patients & hospitals', body: 'Request an appointment in under 60 seconds. Pre-filled health profiles mean hospitals receive intake data before the visit, cutting check-in friction for both sides.' },
  { title: 'Hospital listing & visibility', for: 'For hospitals', body: 'Register your facility, list every specialist service with fees, declare accepted insurers, and manage appointments from a single dashboard.' },
  { title: 'Insurance compatibility matching', for: 'For patients & insurers', body: 'Filter by your insurance provider and see accepted plans before booking, eliminating costly surprises at the point of care.' },
  { title: 'Patient health profiles', for: 'For patients', body: 'Build a secure digital record of conditions, medications, allergies, vitals and insurance details — entered once, shared only with facilities you choose.' },
  { title: 'Campus & institutional partnerships', for: 'For institutions', body: 'Universities, colleges and employers give students and staff dedicated access under a single institutional agreement.' },
];

const DISCIPLINES = [
  'Cardiology', 'Oncology', 'Neurology', 'Orthopaedics', 'Maternity & Obstetrics',
  'Paediatrics', 'Dialysis & Nephrology', 'General Surgery', 'General Medicine', 'Dental',
  'Ophthalmology', 'Dermatology', 'Mental Health & Psychiatry', 'Burns & Reconstructive',
  'Transplant Services', 'ICU & Critical Care', 'Physiotherapy', 'Radiology & Imaging',
];

const PLANS = [
  {
    name: 'Patient',
    price: 'KES 0',
    period: 'Always free for patients',
    audience: 'For patients',
    cta: 'Get started free',
    to: '/register',
    features: ['Search all hospitals', 'View fees and insurance info', 'Basic patient health profile', 'Up to 3 appointments per month', 'NHIF hospital filter', 'Email confirmations'],
  },
  {
    name: 'Hospital Standard',
    price: 'KES 4,999',
    period: 'per month, per facility',
    audience: 'For hospitals',
    highlight: true,
    cta: 'List your hospital',
    to: '/register',
    features: ['Full facility listing', 'Unlimited service entries', 'GlandFind Verified badge', 'Appointment dashboard', 'Patient profile previews', 'Priority search placement', 'Monthly analytics report'],
  },
  {
    name: 'Campus Partner',
    price: 'Custom',
    period: 'per institution, per annum',
    audience: 'For universities',
    cta: 'Contact us',
    to: '/about#contact',
    features: ['All patient features for every enrolled student', 'University health dashboard', 'Bulk NHIF verification', 'Campus clinic integration', 'Dedicated account manager', 'SLA-backed uptime guarantee'],
  },
];

const TEAM = [
  { name: 'Roy ', role: 'Founder & Chief Executive Officer', bio: 'BSc Computer Science (St Paul’s University) and BSc Geomatics & GIS (DeKUT). Leads product strategy, platform architecture and investor relations.' },
  { name: 'Edward ', role: 'Co-Founder & Chief Technology Officer', bio: 'Full-stack engineer and systems architect specialising in distributed systems and API design. Leads engineering and hospital verification technology.' },
  { name: 'Head of Partnerships', role: 'Hospital & Institutional Relations', bio: 'Leads hospital onboarding, county health department relationships and campus partnership agreements. Manages the GlandFind Verified review process.' },
  { name: 'Head of Design', role: 'Product Design & Patient Experience', bio: 'Owns the end-to-end patient and hospital experience, including design systems and accessibility standards across every platform surface.' },
  { name: 'Legal & Compliance', role: 'Data Protection & Regulatory Affairs', bio: 'Ensures compliance with the Kenya Data Protection Act 2019, the Healthcare Act and NHIF regulations, and oversees the patient consent framework.' },
];

const CHANNELS = [
  { label: 'General enquiries', value: 'hello@glandfind.co.ke' },
  { label: 'Hospital partnerships', value: 'hospitals@glandfind.co.ke' },
  { label: 'Campus partnerships', value: 'campus@glandfind.co.ke' },
  { label: 'Press & media', value: 'press@glandfind.co.ke' },
  { label: 'Careers', value: 'careers@glandfind.co.ke' },
];

export default function About() {
  return (
    <>
      {/* -- Hero ------------------------------------------------------- */}
      <section className="bg-navy py-20 text-white">
        <div className="container-page">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-500">About GlandFind</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl">
            Kenya&apos;s medical search platform —{' '}
            <span className="font-serif italic text-brand-500">built for everyone</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/70">
            GlandFind connects patients across Kenya with hospitals, specialist services and
            insurance-compatible care, giving everyone the information they need to make
            confident healthcare decisions in seconds.
          </p>
        </div>
      </section>

      {/* -- Who we are ------------------------------------------------- */}
      <section className="container-page py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-navy">
              A company built on one fundamental belief
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-navy/70">
              <p>
                GlandFind is a Kenyan digital health technology company founded to solve a problem
                that affects millions of patients every day: the inability to find the right
                specialist, at the right hospital, at a price they can afford — and with their
                insurance accepted.
              </p>
              <p>
                We are a three-sided platform connecting patients who need care, hospitals and
                clinics that provide it, and insurance providers that fund it — all in one
                transparent, searchable system. No more calling hospitals one by one. No more
                arriving at a facility only to discover they don&apos;t offer the service you need.
              </p>
              <p>
                Founded and headquartered in Limuru, Kiambu County, GlandFind operates across all
                47 counties, with a focus on underserved urban and campus communities where
                patients face the steepest information barriers.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Metric value="200+" label="Verified hospitals" />
            <Metric value="27" label="Specialist services" />
            <Metric value="47" label="Counties covered" />
            <Metric value="60s" label="Average booking time" />
          </div>
        </div>
      </section>

      {/* -- Values ---------------------------------------------------- */}
      <section className="border-y border-navy/10 bg-white py-16">
        <div className="container-page">
          <h2 className="text-3xl font-extrabold tracking-tight text-navy">Our values</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value) => (
              <div key={value.title} className="card p-6">
                <h3 className="font-bold text-navy">{value.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy/65">{value.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- Mission --------------------------------------------------- */}
      <section className="container-page py-16">
        <div className="card bg-navy p-8 text-white sm:p-12">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-brand-500">Our mission</h2>
              <p className="mt-4 font-serif text-2xl leading-snug sm:text-3xl">
                “To make every healthcare service in Kenya searchable, comparable and bookable —
                reducing the time between symptom and specialist to under 60 seconds.”
              </p>
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-brand-500">Our vision</h2>
              <p className="mt-4 text-base leading-relaxed text-white/75">
                A Kenya where no patient misses specialist care because they didn&apos;t know
                where to find it, couldn&apos;t afford to search, or didn&apos;t know their
                insurance was accepted.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -- What we do ------------------------------------------------ */}
      <section className="border-t border-navy/10 bg-white py-16">
        <div className="container-page">
          <h2 className="text-3xl font-extrabold tracking-tight text-navy">What we do</h2>
          <p className="mt-2 max-w-2xl text-sm text-navy/60">
            Three pillars working together to make healthcare information accessible,
            transparent and actionable.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => (
              <div key={service.title} className="card flex flex-col p-6">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-600">{service.for}</p>
                <h3 className="mt-2 text-lg font-bold text-navy">{service.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-navy/65">{service.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- Disciplines ----------------------------------------------- */}
      <section className="container-page py-16">
        <h2 className="text-3xl font-extrabold tracking-tight text-navy">
          Specialities searchable on GlandFind
        </h2>
        <ul className="mt-6 flex flex-wrap gap-2.5">
          {DISCIPLINES.map((name) => (
            <li key={name}>
              <Link
                to={`/hospitals?q=${encodeURIComponent(name.split(' ')[0])}`}
                className="badge border border-navy/15 bg-white px-3.5 py-1.5 text-sm text-navy transition hover:border-brand-500 hover:text-brand-700"
              >
                {name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* -- Pricing --------------------------------------------------- */}
      <section className="border-t border-navy/10 bg-white py-16">
        <div className="container-page">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-navy">
              Transparent pricing. No hidden charges.
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-navy/60">
              GlandFind is free for patients. Hospitals and institutions access advanced features
              through plans designed for the Kenyan healthcare market.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`card flex flex-col p-7 ${plan.highlight ? 'ring-2 ring-brand-500' : ''}`}
              >
                {plan.highlight && (
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-brand-600">
                    Most popular
                  </p>
                )}
                <p className="text-xs font-bold uppercase tracking-wide text-navy/45">{plan.audience}</p>
                <h3 className="mt-1.5 text-xl font-extrabold text-navy">{plan.name}</h3>
                <p className="mt-4 text-3xl font-extrabold tracking-tight text-navy">{plan.price}</p>
                <p className="mt-1 text-sm text-navy/55">{plan.period}</p>

                <ul className="mt-6 flex-1 space-y-2.5 text-sm text-navy/70">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5">
                      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  to={plan.to}
                  className={`mt-7 w-full ${plan.highlight ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- Team ------------------------------------------------------ */}
      <section className="container-page py-16">
        <h2 className="text-3xl font-extrabold tracking-tight text-navy">The team</h2>
        <p className="mt-2 max-w-2xl text-sm text-navy/60">
          A multidisciplinary founding team combining expertise in computer science, geospatial
          technology, healthcare systems and East African market development.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((member) => (
            <div key={member.name} className="card p-6">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 font-bold text-brand-700">
                {member.name.charAt(0)}
              </div>
              <h3 className="mt-4 font-bold text-navy">{member.name}</h3>
              <p className="text-xs font-semibold text-brand-600">{member.role}</p>
              <p className="mt-2 text-sm leading-relaxed text-navy/65">{member.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* -- Contact --------------------------------------------------- */}
      <section id="contact" className="border-t border-navy/10 bg-white py-16">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-navy">Get in touch</h2>
            <p className="mt-2 text-sm text-navy/60">
              Whether you are a patient, a hospital administrator, a university, an investor or
              the press — we want to hear from you.
            </p>

            <dl className="mt-7 space-y-4">
              {CHANNELS.map((channel) => (
                <div key={channel.label} className="flex flex-wrap items-baseline gap-x-3">
                  <dt className="text-sm text-navy/55">{channel.label}</dt>
                  <dd>
                    <a href={`mailto:${channel.value}`} className="text-sm font-semibold text-brand-700 hover:underline">
                      {channel.value}
                    </a>
                  </dd>
                </div>
              ))}
            </dl>

            <address className="mt-7 space-y-1 text-sm not-italic text-navy/65">
              <p className="font-bold text-navy">GlandFind Kenya Ltd.</p>
              <p>Limuru, Kiambu County, Kenya</p>
              <p>P.O. Box 0000 – 00217 Limuru</p>
              <p className="pt-2">+254 700 000 000 · Mon–Fri, 8:00 AM – 6:00 PM EAT</p>
            </address>
          </div>

          <div className="card bg-slate-50 p-7">
            <h3 className="text-lg font-bold text-navy">Registered in Kenya</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-navy/70">
              {[
                'Companies Act, 2015',
                'Kenya Data Protection Act, 2019 compliant',
                'Hospital verification programme',
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-navy/60">
              © {new Date().getFullYear()} GlandFind Kenya Ltd. All rights reserved.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function Metric({ value, label }) {
  return (
    <div className="card p-6">
      <p className="text-3xl font-extrabold tracking-tight text-navy">{value}</p>
      <p className="mt-1 text-sm text-navy/55">{label}</p>
    </div>
  );
}