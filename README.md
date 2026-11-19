# HTML-4: Not the Night Before
**By:** Maverick Hallett (mhallett)
**Live site:** https://bmis235-html-4.hallemav22.workers.dev

## My path
Path 3 (Full build). I'm concentrating in MIS, and I wanted to practice building with an AI connected straight to GitHub, the way it's done on real teams. I also wanted to fix a real problem I have: I do a lot of my work the night it's due. So I built a study planner that spreads my work out, plus a learning tool that teaches the HTML and CSS the planner is built from.

## By hand vs by AI
**I made:** the idea (a planner for my own procrastination problem, and using it to teach CSS), the site name, my class schedule (from my registration page), which classes to include, and the decisions about how it should work.

**AI made (Claude, connected to this repo):**
- `index.html` and `planner.js`: the Study Planner (week map, open blocks, spreading assignments out before their due dates)
- `learn.html` and `learn.js`: the Learn CSS learning tool (lessons, the four-page stylesheet playground with auto-checked tasks, the quiz and the NotebookLM prompt)
- `styles.css`: the site's brand (navy and gold, the menu and the footer)
- `tools.css`: styles for both pages, including one color rule per class
- A first draft of this README, which I edited

Each change is its own commit. This repo started as a copy of my HTML-3 site. I replaced it with this new site, and the commit history shows that.

**I checked it by:** Claude tested both pages in a real browser. For the planner, it added assignments and checked where the sessions landed. For Learn CSS, it completed all four playground tasks and checked that they passed, and it confirmed every link works and neither page has errors. I checked the lessons and quiz answers against what we learned about the head, the link line and the cascade, compared the class times to my schedule, and clicked through the live site.

## Path 3 only
**Concept it teaches:** one stylesheet styling many pages, and the cascade. The `<head>` vs the `<body>`, how `<link rel="stylesheet" href="…">` connects a page to a CSS file (and what happens when the href is wrong), selectors (tags, `.classes`, `#ids`), and which rule wins when two rules disagree (the more specific one, and if they're equal, the later one). The planner is the example: every class color comes from one rule in `tools.css`, and both pages get their look from one `styles.css`.

**Built for how I learn because:** I learn best with a short lesson, then quiz questions one at a time where I find out right away whether I was right and why, then a real problem to solve on my own, and a "watch out for" list at the end. Learn CSS follows that order: Learn → Try it (four tiny planner pages share one planner.css, and I have to fix a broken link line, change all four pages with one edit and fix a cascade problem) → Quiz → Watch out. There's also a "Rather listen?" button that writes a NotebookLM prompt for an audio version.

**Tested by:** CLASSMATE'S FIRST NAME **What I changed:** WHAT YOU CHANGED FROM THEIR FEEDBACK
