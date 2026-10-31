import { portfolioData } from './portfolio'

// Every project on the site (the experience entries that have their own page), merged with the richer
// card data where the "big projects" list has it. Nothing is added: fields only come from those two lists.
export interface ShowcaseProject {
  id: string
  name: string
  where: string
  date: string
  desc: string
  problem?: string
  status?: string
  llm?: string
  metrics: string[]
  bullets: string[]
  tech: string[]
  image?: string
  github?: string
  download?: string
}

export const showcaseProjects: ShowcaseProject[] = portfolioData.experiences
  .filter((e): e is typeof e & { id: string } => 'id' in e && Boolean(e.id))
  .map((e) => {
    const big = portfolioData.bigProjects.find((b) => b.id === e.id) as (typeof portfolioData.bigProjects)[number] & { github?: string } | undefined
    return {
      id: e.id,
      name: big?.name ?? e.role,
      where: e.company,
      date: e.date,
      desc: big?.desc ?? e.desc,
      problem: big?.problem,
      status: big?.status,
      llm: big?.llm,
      metrics: big?.metrics ?? [],
      bullets: e.descBullets ?? [],
      tech: e.tech ?? [],
      image: ('image' in e ? e.image : undefined) ?? big?.image,
      github: big?.github,
      download: big?.link?.startsWith('/downloads/') ? big.link : undefined,
    }
  })
