import { motion } from 'motion/react'
import { CoverFlow } from '@/components/CoverFlow'
import { SectionTag } from '@/components/SectionTag'
import { FEATURES } from '@/data/features'
import { reveal } from '@/lib/motion'

export function Features() {
  return (
    <section id="imkoniyatlar" className="scroll-mt-16 overflow-x-clip pt-24 pb-20 md:pt-32">
      <motion.div {...reveal} className="mx-auto flex max-w-[900px] flex-col items-center px-5 text-center">
        <SectionTag>Imkoniyatlar</SectionTag>
        <h2 className="display mt-6 text-[clamp(36px,5.2vw,64px)]">
          Oqimning <span className="accent">eng kuchli</span>
          <br />
          <span className="accent">imkoniyatlari</span> bilan tanishing
        </h2>
      </motion.div>

      <motion.div {...reveal} className="mt-12">
        <CoverFlow items={FEATURES} start={2} />
      </motion.div>
    </section>
  )
}
