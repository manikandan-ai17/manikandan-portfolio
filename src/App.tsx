import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { SmoothScroll } from '@/components/ui/SmoothScroll'
import { Cursor } from '@/components/ui/Cursor'
import { Loader } from '@/components/ui/Loader'
import { Navbar } from '@/components/layout/Navbar'
import { Hero } from '@/components/sections/Hero'
import { About } from '@/components/sections/About'
import { Expertise } from '@/components/sections/Expertise'
import { Skills } from '@/components/sections/Skills'
import { WorkIntro } from '@/components/sections/WorkIntro'
import { Work } from '@/components/sections/Work'
import { Experience } from '@/components/sections/Experience'
import { Highlights } from '@/components/sections/Highlights'
import { OpenSource } from '@/components/sections/OpenSource'
import { Contact } from '@/components/sections/Contact'
import { Footer } from '@/components/sections/Footer'
// Case studies load on demand, so the home page ships less code
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail').then((m) => ({ default: m.ProjectDetail })))

const seen = () => { try { return Boolean(sessionStorage.getItem('pf_loaded')) } catch { return true } }

function PortfolioApp() {
  // The opening sequence plays once per visit (not again when coming back from a case study)
  const [loading, setLoading] = useState(() => !seen())
  const done = useCallback(() => {
    try { sessionStorage.setItem('pf_loaded', '1') } catch { /* private mode */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    document.title = 'Manikandan Santhosh — AI Systems Engineer'
  }, [])

  // Keep the reading position when going to a case study and back
  useEffect(() => () => { try { sessionStorage.setItem('pf_scroll', String(window.scrollY)) } catch { /* ignore */ } }, [])
  useEffect(() => {
    if (loading) return
    let saved: string | null = null
    try { saved = sessionStorage.getItem('pf_scroll') } catch { /* ignore */ }
    if (!saved) return
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.scrollTo(0, parseInt(saved!, 10))
      try { sessionStorage.removeItem('pf_scroll') } catch { /* ignore */ }
    }))
  }, [loading])

  // No scrolling while the opening sequence plays
  useEffect(() => {
    document.documentElement.style.overflow = loading ? 'hidden' : ''
  }, [loading])

  return (
    <>
      <a href="#about" className="skip-link">Skip to content</a>
      {loading && <Loader onDone={done} />}
      <Navbar />
      <main id="main">
        <Hero ready={!loading} />
        <About />
        <Expertise />
        <Skills />
        <WorkIntro />
        <Work />
        <Experience />
        <Highlights />
        <OpenSource />
        <Contact />
      </main>
      <Footer />
    </>
  )
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <SmoothScroll>
          <div className="grain">
            <Cursor />
            <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg)' }} />}>
              <Routes>
                <Route path="/" element={<PortfolioApp />} />
                <Route path="/project/:id" element={<ProjectDetail />} />
                <Route path="/experience/:id" element={<ProjectDetail />} />
              </Routes>
            </Suspense>
          </div>
        </SmoothScroll>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
