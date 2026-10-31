import { useState, type FormEvent } from 'react'
import { portfolioData } from '@/data/portfolio'
import { RevealText, Reveal } from '@/components/ui/Reveal'
import { GithubIcon, LinkedinIcon } from '@/components/ui/SocialIcons'
import { ArrowUpRight, FileText, Mail, MapPin, Send } from 'lucide-react'

// The site has no server, so the form does not pretend to send anything: it opens your email app with the
// message filled in, addressed to the published contact email.
export const Contact = () => {
  const { contactEmail, linkedinLink, githubLink, location, resumeLink, contactBlurb, sections, openToOpportunities } = portfolioData
  const [form, setForm] = useState({ name: '', email: '', message: '' })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const subject = `Portfolio enquiry from ${form.name || 'a visitor'}`
    const body = `${form.message}\n\n— ${form.name}${form.email ? ` (${form.email})` : ''}`
    window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const rows = [
    { icon: <Mail size={18} />, k: 'Email me', v: contactEmail, href: `mailto:${contactEmail}` },
    { icon: <LinkedinIcon size={18} />, k: 'Connect', v: 'LinkedIn', href: linkedinLink, ext: true },
    { icon: <GithubIcon size={18} />, k: 'Code', v: 'GitHub', href: githubLink, ext: true },
    { icon: <FileText size={18} />, k: 'Resume', v: 'View resume', href: resumeLink, ext: true },
    { icon: <MapPin size={18} />, k: 'Based in', v: location },
  ]

  return (
    <section id="contact" className="section contact" tabIndex={-1}>
      <div className="container contact__grid">
        <div>
          <Reveal><span className="eyebrow"><b>08</b> Contact</span></Reveal>
          <h2 className="contact__title">
            <RevealText as="span" text={sections.contact.title.split(' ')[0]} className="title-xl" />
            <RevealText as="span" text={sections.contact.title.split(' ').slice(1).join(' ') + '.'} className="title-xl accent" delay={0.1} />
          </h2>
          <Reveal delay={0.1}><p className="label" style={{ marginBottom: 20 }}>{sections.contact.subtitle}</p></Reveal>
          <Reveal delay={0.15}><p className="body">{contactBlurb}</p></Reveal>
          <Reveal delay={0.2}>
            <p className="contact__status mono"><span className="pulse" aria-hidden="true" /> {openToOpportunities ? 'Open to opportunities' : 'Currently unavailable'}</p>
          </Reveal>
          <ul className="contact__rows">
            {rows.map((r, i) => (
              <Reveal as="li" key={r.k} delay={0.05 * i}>
                {r.href ? (
                  <a className="contact__row" href={r.href} {...(r.ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                    <span className="contact__icon">{r.icon}</span>
                    <span><span className="label">{r.k}</span><span className="contact__v">{r.v}</span></span>
                    <ArrowUpRight className="contact__go" size={18} aria-hidden="true" />
                  </a>
                ) : (
                  <div className="contact__row">
                    <span className="contact__icon">{r.icon}</span>
                    <span><span className="label">{r.k}</span><span className="contact__v">{r.v}</span></span>
                  </div>
                )}
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal delay={0.15}>
          <form className="contact__form" onSubmit={submit}>
            <label>
              <span className="label">Name</span>
              <input name="name" autoComplete="name" required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              <span className="label">Email</span>
              <input name="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label>
              <span className="label">Message</span>
              <textarea name="message" required rows={6} placeholder="What would you like to talk about?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </label>
            <button type="submit" className="btn btn--solid contact__send">Write the email <Send size={15} /></button>
            <p className="contact__note">Opens your email app with this message addressed to {contactEmail}. Nothing is sent from this page.</p>
          </form>
        </Reveal>
      </div>
    </section>
  )
}
