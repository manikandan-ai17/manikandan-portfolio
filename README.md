# Manikandan Santhosh: portfolio

Personal portfolio of Manikandan Santhosh, a software engineer working with LLM-integrated applications.
Live site: https://manikandan-portfolio-delta.vercel.app

Every project on the site is labelled with its real status (public source, local run, or private company code) and its detail page lists evidence and limitations. All content lives in [src/data/portfolio.ts](src/data/portfolio.ts) and the project pages in [src/pages/ProjectDetail.tsx](src/pages/ProjectDetail.tsx).

## Stack

React 19, TypeScript, Vite, React Router, Tailwind CSS v4, Framer Motion.

## Develop

```bash
npm install
npm run dev      # local development server
npm run build    # type-check and production build into dist/
npm run lint     # oxlint
```

## Resume

[public/resume.html](public/resume.html) is the editable source (A4, prints to one page). [public/Manikandan_Santhosh_Resume.pdf](public/Manikandan_Santhosh_Resume.pdf) is generated from it with a headless browser:

```bash
msedge --headless=new --no-pdf-header-footer --print-to-pdf=public/Manikandan_Santhosh_Resume.pdf file:///<path>/public/resume.html
```

## Notes

- Card banners in `public/images` are generated illustrations of each project's verified flow.
- `src/data/githubActivity.ts` is a dated snapshot of the public GitHub contribution calendar.
- Pushing to `main` deploys to Vercel. `vercel.json` rewrites unknown paths to `index.html` so project pages work as direct links.
