# HTML-4: Goomba Grails + Fix It Lab
**By:** Maverick Hallett (mhallett)
**Live site:** CLOUDFLARE LINK GOES HERE

## My path
Path 3 (Full build). I'm concentrating in MIS, and I wanted to practice building with an AI connected straight to GitHub, the way it's done on real teams. I also wanted to see if I understood HTML well enough to check what the AI built.

## By hand vs by AI
**I made:** the Goomba Grails site from HTML-3 (the Home, Grails, The Hunt and Shop pages, the menu, my brand colors and font, and my 3 styles), all the shop content, and the idea for the learning tool: teaching file paths, since broken images and paths were the bugs I actually hit in HTML-2 and HTML-3.

**AI made (Claude, connected to this repo):**
- `fixit.html`, `lab.css` and `lab.js`: the Fix It Lab learning tool
- `img/fixit.png`: the Fix It Lab menu button, generated to match my other buttons (not made in Excel)
- Adding the Fix It Lab button to the menu on all four pages
- Two bug fixes from HTML-3: the menu color typo (`##2F4F3E` → `#2F4F3E`) and a stray `>` after the game on the home page
- A first draft of this README, which I edited

Each change is its own commit, so the history shows exactly what was added.

**I checked it by:** Claude ran every Fix It Lab round in a real browser with the broken code and the fixed code, plus common wrong answers like using `href` on an image or starting a path with `/`, and checked that the page had no errors. I then checked the lesson and quiz answers against what we learned in HTML-1 to HTML-3 and the module's "#1 bug" note about capital letters, and clicked every link and image on the live site.

## Path 3 only
**Concept it teaches:** file paths. How `src` and `href` tell the browser where a file is, `img/` vs `../`, why capital letters and extensions have to match exactly on GitHub Pages, and how a missing or wrong stylesheet link makes a page show up plain.

**Built for how I learn because:** I learn best with a short lesson, then quiz questions one at a time where I find out right away whether I was right and why, then a real problem to solve on my own, and a "watch out for" list of common mistakes at the end. The lab follows that same order: Learn → See it → Quiz → Fix it → Watch out. The Fix it rounds are based on the bugs I actually ran into, like capital letters in file names and images uploaded to the wrong folder.

**Tested by:** CLASSMATE'S FIRST NAME **What I changed:** WHAT YOU CHANGED FROM THEIR FEEDBACK
