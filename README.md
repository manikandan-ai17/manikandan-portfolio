# Manikandan Santhosh: portfolio

Personal portfolio of Manikandan Santhosh, a software engineer working with LLM-integrated applications.
Live site: https://manikandan-portfolio-delta.vercel.app

Every project on the site is labelled with what can actually be demonstrated (public source, local run, or private company code) and lists its evidence and known limitations. All content lives in [src/data/portfolio.ts](src/data/portfolio.ts).

## Stack

React 19, TypeScript, Vite, React Router, plain CSS. No UI framework and no animation library.

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

## Deployment

Pushing to `main` deploys to Vercel. `vercel.json` rewrites unknown paths to `index.html` so project pages such as `/project/cad-drawing-agent` work as direct links.
