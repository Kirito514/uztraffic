import { useEffect } from 'react'
import { MotionConfig } from 'motion/react'
import { initSmoothScroll } from '@/lib/smoothScroll'
import { Nav } from '@/sections/nav/Nav'
import { Hero } from '@/sections/Hero'
import { Features } from '@/sections/Features'
import { About } from '@/sections/About'
import { Steps } from '@/sections/Steps'
import { Cta } from '@/sections/Cta'
import { Footer } from '@/sections/Footer'

export default function App() {
  useEffect(() => initSmoothScroll(), [])

  return (
    // reducedMotion="user": tizimda harakat kamaytirilgan bo‘lsa, transform animatsiyalari o‘chadi
    <MotionConfig reducedMotion="user">
      <Nav />
      <main>
        <Hero />
        <Features />
        <About />
        <Steps />
        <Cta />
      </main>
      <Footer />
    </MotionConfig>
  )
}
