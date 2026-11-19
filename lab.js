/* =====================================================================
   lab.js  ·  FIX IT LAB
   Author: Maverick Hallett (mhallett) · BMIS 235 HTML-4
   AI piece (made with Claude). What it does:
   - Moves between the 5 steps (Learn, See it, Quiz, Fix it, Watch out).
   - "See it": pretends to be a browser and walks a path folder by folder.
   - "Quiz": one question at a time with instant feedback.
   - "Fix it": reads the path out of the code you type, looks for that
     exact file (capitals count, like GitHub Pages), and shows the photo
     or a broken image with the alt text.
   No libraries, no outside files.
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- saving progress (works without it, too) ---------- */
  var SAVE_KEY = 'fixItLab-v1';
  var state = { done: {}, solved: {}, round: 0 };
  try {
    var saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved) state = Object.assign(state, saved);
  } catch (e) { /* storage blocked: just don't save */ }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* =================================================================
     THE PATH RULES
     resolvePath walks a relative path the way a browser does:
     start in the page's folder, "dir/" goes in, "../" goes up,
     "./" stays put. Returns the full path from the top of the site.
     ================================================================= */
  function resolvePath(pageDir, path) {
    var p = path.trim();
    if (p === '') return { error: 'empty' };
    if (/^[a-z]+:\/\//i.test(p) || p.indexOf('//') === 0) return { error: 'external' };
    if (p.charAt(0) === '/') return { error: 'root' };
    var stack = pageDir ? pageDir.split('/') : [];
    var steps = [{ type: 'start', dir: stack.join('/') }];
    var parts = p.split('/');
    for (var i = 0; i < parts.length; i++) {
      var seg = parts[i];
      var last = i === parts.length - 1;
      if (seg === '' || seg === '.') continue;
      if (seg === '..') {
        if (stack.length === 0) {
          steps.push({ type: 'abovetop' });
          return { error: 'abovetop', steps: steps };
        }
        stack.pop();
        steps.push({ type: 'up', dir: stack.join('/') });
      } else if (last) {
        stack.push(seg);
        steps.push({ type: 'file', name: seg });
      } else {
        stack.push(seg);
        steps.push({ type: 'into', name: seg, dir: stack.join('/') });
      }
    }
    return { full: stack.join('/'), steps: steps };
  }

  function foldersOf(files) {
    var set = {};
    files.forEach(function (f) {
      var parts = f.split('/');
      for (var i = 1; i < parts.length; i++) set[parts.slice(0, i).join('/')] = true;
    });
    return set;
  }

  /* explains WHY a path missed, by comparing it to the real files */
  function diagnose(full, files) {
    var lower = full.toLowerCase();
    var name = full.split('/').pop();
    var stem = name.replace(/\.[^.]*$/, '');
    for (var i = 0; i < files.length; i++) {
      if (files[i].toLowerCase() === lower) {
        return 'Capital letters don\'t match. You asked for <code>' + esc(full) +
          '</code>, but the file is <code>' + esc(files[i]) + '</code>.';
      }
    }
    for (i = 0; i < files.length; i++) {
      if (files[i].split('/').pop() === name) {
        return 'That file exists, but at <code>' + esc(files[i]) + '</code>. Your path sent the browser to <code>' +
          esc(full) + '</code>. Check the folder part of the path.';
      }
    }
    for (i = 0; i < files.length; i++) {
      var fname = files[i].split('/').pop();
      if (fname.indexOf(stem + '.') === 0) {
        return 'The name is close, but the ending doesn\'t match. The real file is <code>' +
          esc(files[i]) + '</code>. The extension is part of the name.';
      }
    }
    var dir = full.split('/').slice(0, -1).join('/');
    if (dir && !foldersOf(files)[dir]) {
      return 'There\'s no folder at <code>' + esc(dir) + '/</code> in this repo.';
    }
    return 'No file called <code>' + esc(full) + '</code> exists in this repo.';
  }

  var PATH_ERRORS = {
    empty: 'The path is empty, so there\'s nothing for the browser to look for.',
    external: 'That\'s a full web address. For files in your own repo, use a path from the page, like <code>img/home.png</code>.',
    root: 'A path that starts with <code>/</code> starts at the very top of the domain. On a GitHub Pages project site that skips past your repo\'s folder, so it breaks. Use a path from the page instead, like <code>img/home.png</code>.',
    abovetop: 'This page is already in the site\'s top folder, so <code>../</code> climbs out of your site\'s folder. On a GitHub Pages project site that points outside your repo and breaks. Leave the <code>../</code> off.'
  };

  /* =================================================================
     STEP NAVIGATION
     ================================================================= */
  var order = ['learn', 'see', 'quiz', 'fix', 'watch'];
  var current = 'learn';
  function show(id) {
    if (order.indexOf(id) > order.indexOf(current)) state.done[current] = true;
    current = id;
    order.forEach(function (p) { $(p).hidden = p !== id; });
    document.querySelectorAll('.lab-step').forEach(function (b) {
      var go = b.getAttribute('data-go');
      b.classList.toggle('active', go === id);
      b.classList.toggle('done', !!state.done[go]);
      b.setAttribute('aria-selected', go === id ? 'true' : 'false');
    });
    save();
    $(id).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  document.querySelectorAll('[data-go]').forEach(function (b) {
    b.addEventListener('click', function () { show(b.getAttribute('data-go')); });
  });

  /* =================================================================
     LISTEN: NotebookLM prompt
     ================================================================= */
  function buildPrompt() {
    var topic = $('listen-topic').value;
    $('listen-out').value =
      'Create a short, friendly audio explainer (about 5 minutes) for a college student ' +
      'who is new to HTML. Topic: ' + topic + '. Use one everyday analogy. Walk through ' +
      '2 or 3 concrete examples using a small site with index.html, styles.css, an img ' +
      'folder and a page inside a folder called drops. Point out the most common beginner ' +
      'mistake and how to spot it. End with a 3-question spoken quiz and give the answers.';
  }
  $('listen-topic').addEventListener('change', buildPrompt);
  $('listen-copy').addEventListener('click', function () {
    var box = $('listen-out');
    box.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    if (navigator.clipboard) {
      navigator.clipboard.writeText(box.value).then(function () {
        $('listen-msg').textContent = 'Copied. Paste it into NotebookLM\'s Audio Overview.';
      }, function () {
        $('listen-msg').textContent = ok ? 'Copied.' : 'Select the text and copy it yourself.';
      });
    } else {
      $('listen-msg').textContent = ok ? 'Copied.' : 'Select the text and copy it yourself.';
    }
  });
  buildPrompt();

  /* =================================================================
     SEE IT: the path tracer
     ================================================================= */
  var traceFiles = ['index.html', 'styles.css', 'img/carhartt-jacket.png',
    'img/jnco-jeans.png', 'img/surf-tee.jpg', 'drops/winter.html'];

  function drawTree(files, box) {
    var folders = Object.keys(foldersOf(files)).sort();
    var all = folders.concat(files).sort(function (a, b) {
      return a.localeCompare(b);
    });
    var html = '<div class="trace-node" data-node="">site/</div>';
    all.forEach(function (p) {
      var depth = p.split('/').length;
      var isFolder = folders.indexOf(p) !== -1;
      html += '<div class="trace-node" data-node="' + esc(p) + '" style="padding-left:' +
        (depth * 18 + 6) + 'px">' + (isFolder ? '📁 ' : '📄 ') + esc(p.split('/').pop()) +
        (isFolder ? '/' : '') + '</div>';
    });
    box.innerHTML = html;
  }

  var traceTimer = null;
  function light(node, cls) {
    document.querySelectorAll('#trace-tree .trace-node').forEach(function (n) {
      n.classList.remove('here', 'found');
    });
    if (node === null) return;
    var el = document.querySelector('#trace-tree [data-node="' + node.replace(/"/g, '') + '"]');
    if (el) el.classList.add(cls);
  }

  function trace() {
    clearTimeout(traceTimer);
    var pageDir = $('trace-page').value;
    var path = $('trace-path').value;
    var log = $('trace-log');
    log.innerHTML = '';
    var r = resolvePath(pageDir, path);
    var lines = [];
    var folders = foldersOf(traceFiles);
    var pageName = pageDir ? pageDir + '/winter.html' : 'index.html';

    if (r.error && r.error !== 'abovetop') {
      lines.push({ node: null, html: '<span class="bad">Stopped:</span> ' + PATH_ERRORS[r.error] });
    } else {
      var dir = pageDir;
      lines.push({ node: dir, html: 'Start in <code>' + (dir ? dir + '/' : 'site/') +
        '</code>, the folder <code>' + pageName + '</code> is in.' });
      for (var i = 1; i < r.steps.length; i++) {
        var s = r.steps[i];
        if (s.type === 'abovetop') {
          lines.push({ node: '', html: '<span class="bad">Stopped:</span> ' + PATH_ERRORS.abovetop });
          break;
        }
        if (s.type === 'up') {
          dir = s.dir;
          lines.push({ node: dir, html: '<code>../</code> means go up one folder, to <code>' +
            (dir ? dir + '/' : 'site/') + '</code>.' });
        } else if (s.type === 'into') {
          if (!folders[s.dir]) {
            var near = Object.keys(folders).filter(function (f) {
              return f.toLowerCase() === s.dir.toLowerCase();
            })[0];
            lines.push({ node: dir, html: 'Look for a folder named <code>' + esc(s.name) +
              '</code>… <span class="bad">not here.</span>' +
              (near ? ' There is a <code>' + esc(near.split('/').pop()) + '/</code>. Capital letters count.' : '') });
            lines.push({ node: null, html: '<span class="bad">404 Not Found.</span> The image shows as broken.' });
            break;
          }
          dir = s.dir;
          lines.push({ node: dir, html: 'Go into the <code>' + esc(s.name) + '/</code> folder.' });
        } else if (s.type === 'file') {
          var full = r.full;
          if (traceFiles.indexOf(full) !== -1) {
            lines.push({ node: full, found: true, html: 'Look for <code>' + esc(s.name) +
              '</code>… <span class="ok">found it!</span> 200 OK, and the image shows.' });
          } else {
            lines.push({ node: dir, html: 'Look for <code>' + esc(s.name) +
              '</code>… <span class="bad">not here.</span> ' + diagnose(full, traceFiles) });
            lines.push({ node: null, html: '<span class="bad">404 Not Found.</span> The image shows as broken.' });
          }
        }
      }
    }

    var k = 0;
    (function step() {
      if (k >= lines.length) return;
      var L = lines[k];
      var li = document.createElement('li');
      li.innerHTML = L.html;
      log.appendChild(li);
      if (L.node !== null) light(L.node, L.found ? 'found' : 'here');
      k++;
      traceTimer = setTimeout(step, 900);
    })();
  }

  drawTree(traceFiles, $('trace-tree'));
  $('trace-go').addEventListener('click', trace);
  $('trace-path').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') trace();
  });
  document.querySelectorAll('[data-try]').forEach(function (b) {
    b.addEventListener('click', function () {
      $('trace-path').value = b.getAttribute('data-try');
      $('trace-page').value = b.getAttribute('data-page') || '';
      trace();
    });
  });

  /* =================================================================
     QUIZ: one question at a time
     ================================================================= */
  var questions = [
    { q: '<code>index.html</code> is in the top folder. The photo is at <code>img/tee.png</code>. What goes in <code>src</code>?',
      opts: ['tee.png', 'img/tee.png', '../img/tee.png', 'img.tee.png'], a: 1,
      why: 'Start where the page is (the top folder), go into <code>img/</code>, then take <code>tee.png</code>. Plain <code>tee.png</code> would look next to index.html, where there isn\'t one.' },
    { q: 'Your page is <code>drops/winter.html</code>. The photo is at <code>img/tee.png</code> (img is in the top folder). What goes in <code>src</code>?',
      opts: ['img/tee.png', 'drops/img/tee.png', '../img/tee.png', 'winter/img/tee.png'], a: 2,
      why: 'The browser starts in <code>drops/</code>. <code>../</code> goes up to the top folder, then <code>img/tee.png</code> finds the file. <code>img/tee.png</code> alone would look for <code>drops/img/tee.png</code>.' },
    { q: 'The file in your repo is <code>img/Logo.PNG</code>. Your code says <code>src="img/logo.png"</code>. Will it show on GitHub Pages?',
      opts: ['Yes, capitals don\'t matter in file names', 'No, the capital letters don\'t match', 'Yes, as long as the alt text is filled in', 'Only on phones'], a: 1,
      why: 'On GitHub Pages, <code>Logo.PNG</code> and <code>logo.png</code> are different files. Rename the file to all lowercase and match it in your code.' },
    { q: 'The image works when you open the page on your laptop but breaks on the live site. What\'s the most likely cause?',
      opts: ['GitHub Pages can\'t show PNG files', 'The alt text is too long', 'A capital letter in the path doesn\'t match the file name', 'The page has to be named home.html'], a: 2,
      why: 'Macs and Windows PCs usually ignore capital letters in file names, but GitHub Pages doesn\'t. That\'s the classic "works on my computer" bug.' },
    { q: 'You see your alt text and a broken-image icon where the photo should be. What does that tell you?',
      opts: ['The img tag is fine, but the browser couldn\'t find the file at that path', 'The photo loaded but is too small', 'The stylesheet is missing', 'Alt text always shows next to images'], a: 0,
      why: 'Alt text shows when the image can\'t load. The tag worked, so look at the path: spelling, capitals, folder and extension.' },
    { q: 'Which attribute holds the path in <code>&lt;link rel="stylesheet" …&gt;</code>?',
      opts: ['src', 'href', 'rel', 'style'], a: 1,
      why: 'Links and the stylesheet use <code>href</code>. Images use <code>src</code>. <code>rel="stylesheet"</code> just says what kind of file it is.' },
    { q: 'Your page loads in Times New Roman with blue underlined links instead of your brand. What\'s most likely wrong?',
      opts: ['The images are the wrong size', 'The <code>&lt;link&gt;</code> to styles.css is missing or has a wrong path', 'The footer is missing', 'The page has too many headings'], a: 1,
      why: 'When the stylesheet isn\'t found, nothing breaks loudly. The browser just uses its default styles, which is the plain look you\'re seeing.' },
    { q: 'Which file name is the safest to use on your site?',
      opts: ['Surf Tee.PNG', 'surf tee.png', 'surf-tee.png', 'SurfTee!.png'], a: 2,
      why: 'Lowercase, dashes instead of spaces, and no symbols. Then you never have to remember which letters were capitals.' },
    { q: 'What does <code>../</code> mean at the start of a path?',
      opts: ['Go into a folder named ..', 'Go up one folder', 'Go to the top of the internet', 'Skip this file'], a: 1,
      why: '<code>../</code> means "the folder above this one." You need it when the page is inside a folder and the file isn\'t.' }
  ];

  var qOrder = [];
  var qIndex = 0;
  var qScore = 0;
  var qMissed = [];

  function startQuiz(list) {
    qOrder = list;
    qIndex = 0;
    qScore = 0;
    qMissed = [];
    drawQuestion();
  }

  function drawQuestion() {
    var box = $('quiz-box');
    if (qIndex >= qOrder.length) {
      var html = '<p class="quiz-q"><strong>You got ' + qScore + ' of ' + qOrder.length + '.</strong></p>';
      if (qMissed.length) {
        html += '<p>Missed: ' + qMissed.map(function (i) { return 'Q' + (i + 1); }).join(', ') + '</p>' +
          '<button type="button" class="lab-btn" id="quiz-retry">Redo the ones I missed</button>';
      } else {
        html += '<p>Clean sweep. You\'re ready to fix some broken code.</p>';
      }
      html += '<button type="button" class="lab-btn lab-ghost" id="quiz-again">Start the quiz over</button>';
      box.innerHTML = html;
      if ($('quiz-retry')) $('quiz-retry').addEventListener('click', function () { startQuiz(qMissed.slice()); });
      $('quiz-again').addEventListener('click', function () { startQuiz(questions.map(function (q, i) { return i; })); });
      return;
    }
    var qi = qOrder[qIndex];
    var Q = questions[qi];
    var html2 = '<div class="quiz-count">Question ' + (qIndex + 1) + ' of ' + qOrder.length + '</div>' +
      '<div class="quiz-q">' + Q.q + '</div>';
    Q.opts.forEach(function (o, i) {
      html2 += '<button type="button" class="quiz-opt" data-i="' + i + '">' + o + '</button>';
    });
    box.innerHTML = html2;
    box.querySelectorAll('.quiz-opt').forEach(function (b) {
      b.addEventListener('click', function () { answer(qi, Number(b.getAttribute('data-i'))); });
    });
  }

  function answer(qi, pick) {
    var Q = questions[qi];
    var box = $('quiz-box');
    var btns = box.querySelectorAll('.quiz-opt');
    btns.forEach(function (b, i) {
      b.disabled = true;
      if (i === Q.a) b.classList.add('right');
      if (i === pick && pick !== Q.a) b.classList.add('wrong');
    });
    if (pick === Q.a) qScore++; else qMissed.push(qi);
    var why = document.createElement('div');
    why.className = 'quiz-why';
    why.innerHTML = '<strong>' + (pick === Q.a ? 'Right.' : 'Not quite.') + '</strong> ' + Q.why;
    box.appendChild(why);
    var next = document.createElement('button');
    next.type = 'button';
    next.className = 'lab-btn';
    next.textContent = qIndex + 1 < qOrder.length ? 'Next question →' : 'See my score';
    next.addEventListener('click', function () { qIndex++; drawQuestion(); });
    box.appendChild(next);
    next.focus();
  }

  startQuiz(questions.map(function (q, i) { return i; }));

  /* =================================================================
     FIX IT: broken shop rounds
     ================================================================= */
  var rounds = [
    { title: 'Round 1 · The capital letter',
      story: 'The Carhartt jacket on the home page is a broken image, but the photo is definitely in the repo.',
      pageDir: '', page: 'index.html', kind: 'img',
      files: ['index.html', 'styles.css', 'img/carhartt-jacket.png'],
      code: '<img src="img/Carhartt-Jacket.png" alt="Carhartt jacket">',
      item: { name: 'Carhartt Jacket', shape: 'top', color: '#B5813A' },
      hint: 'Compare your path to the file name in the repo one letter at a time. Look at the capitals.',
      explain: 'GitHub Pages treats <code>C</code> and <code>c</code> as different letters, so <code>Carhartt-Jacket.png</code> and <code>carhartt-jacket.png</code> are different files. Name every file in lowercase and type it the same way in your code.' },
    { title: 'Round 2 · The missing folder',
      story: 'The JNCO jeans photo was uploaded into the img folder, but the page can\'t find it.',
      pageDir: '', page: 'index.html', kind: 'img',
      files: ['index.html', 'styles.css', 'img/jnco-jeans.png'],
      code: '<img src="jnco-jeans.png" alt="JNCO jeans">',
      item: { name: 'JNCO Jeans', shape: 'pants', color: '#4A6FA5' },
      hint: 'Where does the browser look when the path is just a file name? Where is the file actually?',
      explain: 'With only <code>jnco-jeans.png</code>, the browser looks right next to <code>index.html</code>. The file is inside <code>img/</code>, so the path has to say <code>img/</code> first.' },
    { title: 'Round 3 · The wrong ending',
      story: 'The surf tee photo came from a phone, and now it won\'t load.',
      pageDir: '', page: 'index.html', kind: 'img',
      files: ['index.html', 'styles.css', 'img/surf-tee.jpg'],
      code: '<img src="img/surf-tee.png" alt="Vintage surf tee">',
      item: { name: 'Surf Tee', shape: 'top', color: '#3FA7A3' },
      hint: 'Look at the very end of the file name in the repo.',
      explain: 'The extension is part of the name. <code>surf-tee.png</code> and <code>surf-tee.jpg</code> are two different files, so the code has to use whatever the real file ends in.' },
    { title: 'Round 4 · The wrong folder name',
      story: 'The West Coast Choppers hoodie is broken. The code points to a folder that sounds right.',
      pageDir: '', page: 'index.html', kind: 'img',
      files: ['index.html', 'styles.css', 'img/wcc-hoodie.png'],
      code: '<img src="images/wcc-hoodie.png" alt="West Coast Choppers hoodie">',
      item: { name: 'WCC Hoodie', shape: 'hoodie', color: '#2B2B2B' },
      hint: 'What is the folder actually called in the repo?',
      explain: 'The folder is <code>img</code>, not <code>images</code>. The browser doesn\'t guess what you meant. The folder part of the path has to match exactly, just like the file name.' },
    { title: 'Round 5 · The double ending',
      story: 'This photo was renamed by hand. It looks right in the code, but it still won\'t show.',
      pageDir: '', page: 'index.html', kind: 'img',
      files: ['index.html', 'styles.css', 'img/quiksilver-tee.png.png'],
      code: '<img src="img/quiksilver-tee.png" alt="Quiksilver tee">',
      item: { name: 'Quiksilver Tee', shape: 'top', color: '#C8553D' },
      hint: 'Read the file name in the repo all the way to the end. Count the dots.',
      explain: 'The file is really named <code>quiksilver-tee.png.png</code>. That happens when your computer hides file extensions and you type <code>.png</code> yourself. Your code fix works, but the cleaner fix is to rename the file on GitHub to <code>quiksilver-tee.png</code>.' },
    { title: 'Round 6 · The page in a folder',
      story: 'A new page for winter drops lives in its own folder. Its Gonzaga crewneck photo won\'t load, even though the same path works on the home page.',
      pageDir: 'drops', page: 'drops/winter.html', kind: 'img',
      files: ['index.html', 'styles.css', 'drops/winter.html', 'img/gonzaga-crew.png'],
      code: '<img src="img/gonzaga-crew.png" alt="Gonzaga crewneck">',
      item: { name: 'Gonzaga Crew', shape: 'top', color: '#041E42' },
      hint: 'This page starts in drops/. Is there an img folder inside drops/? How do you go up one folder?',
      explain: 'The page lives in <code>drops/</code>, so <code>img/gonzaga-crew.png</code> sends the browser to <code>drops/img/</code>, which doesn\'t exist. <code>../</code> goes up to the top folder first, then into <code>img/</code>.' },
    { title: 'Round 7 · The plain page',
      story: 'No broken image this time. The whole page lost its brand: plain font, blue underlined links. The stylesheet is in the repo.',
      pageDir: '', page: 'index.html', kind: 'link',
      files: ['index.html', 'styles.css', 'img/home.png'],
      code: '<link rel="stylesheet" href="style.css">',
      hint: 'Compare the href to the stylesheet\'s name in the repo, letter by letter.',
      explain: 'The file is <code>styles.css</code>, with an s. A missing stylesheet doesn\'t show an error on the page. The browser just falls back to its default look, and that plain page is your clue.' }
  ];

  var GARMENTS = {
    top: 'M38 22 L60 12 Q75 26 90 12 L112 22 L132 48 L114 60 L106 50 L106 128 L44 128 L44 50 L36 60 L18 48 Z',
    hoodie: 'M38 26 L56 16 Q75 -4 94 16 L112 26 L132 52 L114 64 L106 54 L106 128 L44 128 L44 54 L36 64 L18 52 Z',
    pants: 'M48 10 L102 10 L108 132 L84 132 L75 52 L66 132 L42 132 Z'
  };

  function photoSVG(item) {
    return '<svg viewBox="0 0 150 140" width="150" height="140" role="img" aria-label="' + esc(item.name) + '">' +
      '<path d="' + GARMENTS[item.shape] + '" fill="' + item.color + '" stroke="#1B1B1B" stroke-width="2"/>' +
      (item.shape === 'hoodie' ? '<path d="M64 20 Q75 34 86 20" fill="none" stroke="#F4EDE1" stroke-width="2"/>' : '') +
      (item.shape === 'pants' ? '<line x1="75" y1="12" x2="75" y2="50" stroke="#1B1B1B" stroke-width="1.5"/>' : '') +
      '</svg>';
  }

  var BROKEN_ICON = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="2" width="14" height="12" fill="none" stroke="#777" stroke-width="1.5"/><path d="M3 12 L7 7 L10 10 L13 6" fill="none" stroke="#B3261E" stroke-width="1.5"/></svg>';

  function readAttr(code, name) {
    var m = code.match(new RegExp('\\b' + name + '\\s*=\\s*(["\'])([^"\']*)\\1', 'i'));
    return m ? m[2] : null;
  }

  function preview(round, found, alt) {
    var box = $('fix-preview');
    if (round.kind === 'link') {
      box.innerHTML = '<div class="pv-page ' + (found ? 'styled' : 'plain') + '">' +
        '<div class="pv-nav"><span>Home</span><span>Grails</span><span>The Hunt</span><span>Shop</span></div>' +
        '<div class="pv-h">Goomba Grails</div>' +
        '<div>Vintage and Y2K clothing from the Pacific Northwest.</div></div>';
      return;
    }
    if (found) {
      box.innerHTML = '<div class="pv-card"><div class="pv-photo" style="background:#E8DDCB">' +
        photoSVG(round.item) + '</div><div class="pv-name">' + esc(round.item.name) + '</div></div>';
    } else {
      box.innerHTML = '<div class="pv-card"><div class="pv-photo pv-broken">' + BROKEN_ICON +
        '<span>' + (alt ? esc(alt) : '') + '</span></div><div class="pv-name">' +
        esc(round.item.name) + '</div></div>';
    }
  }

  function drawProgress() {
    var html = '';
    rounds.forEach(function (r, i) {
      html += '<button type="button" class="fix-dot' + (i === state.round ? ' current' : '') +
        (state.solved[i] ? ' solved' : '') + '" data-r="' + i + '" aria-label="Round ' + (i + 1) +
        (state.solved[i] ? ', solved' : '') + '">' + (i + 1) + '</button>';
    });
    $('fix-progress').innerHTML = html;
    $('fix-progress').querySelectorAll('.fix-dot').forEach(function (b) {
      b.addEventListener('click', function () { loadRound(Number(b.getAttribute('data-r'))); });
    });
  }

  function loadRound(i) {
    state.round = i;
    save();
    var R = rounds[i];
    $('fix-title').textContent = R.title;
    $('fix-story').textContent = R.story;
    $('fix-page').textContent = R.page;
    var tree = 'site/\n';
    R.files.slice().sort().forEach(function (f) {
      var parts = f.split('/');
      tree += parts.length > 1 ? '├── ' + parts[0] + '/\n│   └── ' + parts.slice(1).join('/') + '\n' : '├── ' + f + '\n';
    });
    $('fix-tree').textContent = tree.replace(/\n$/, '');
    $('fix-code').value = R.code;
    $('fix-console').textContent = 'Press Run it.';
    $('fix-feedback').innerHTML = '';
    $('fix-next').hidden = true;
    preview(R, false, readAttr(R.code, 'alt'));
    drawProgress();
  }

  function run() {
    var R = rounds[state.round];
    var code = $('fix-code').value;
    var fb = $('fix-feedback');
    var con = $('fix-console');
    var want = R.kind === 'link' ? 'href' : 'src';
    var other = R.kind === 'link' ? 'src' : 'href';
    var tag = R.kind === 'link' ? 'link' : 'img';

    if (!new RegExp('<\\s*' + tag + '\\b', 'i').test(code)) {
      con.innerHTML = '<span class="c-bad">No &lt;' + tag + '&gt; tag found.</span>';
      fb.innerHTML = '<div class="miss">Keep the <code>&lt;' + tag + ' …&gt;</code> tag and only change the path inside the quotes.</div>';
      preview(R, false, null);
      return;
    }
    if (R.kind === 'link' && !/rel\s*=\s*["']stylesheet["']/i.test(code)) {
      con.innerHTML = '<span class="c-bad">Not loaded as a stylesheet.</span>';
      fb.innerHTML = '<div class="miss">The tag needs <code>rel="stylesheet"</code> so the browser knows this file is CSS.</div>';
      preview(R, false, null);
      return;
    }
    var path = readAttr(code, want);
    if (path === null) {
      var wrongAttr = readAttr(code, other) !== null;
      con.innerHTML = '<span class="c-bad">No ' + want + '="…" found.</span>';
      fb.innerHTML = '<div class="miss">' + (wrongAttr
        ? 'This tag uses <code>' + other + '</code>, but ' + (R.kind === 'link' ? 'the stylesheet link' : 'an image') +
          ' needs <code>' + want + '</code>.'
        : 'I couldn\'t find <code>' + want + '="…"</code>. Keep the quotes around the path.') + '</div>';
      preview(R, false, readAttr(code, 'alt'));
      return;
    }

    var r = resolvePath(R.pageDir, path);
    if (r.error) {
      con.innerHTML = '<span class="c-bad">Couldn\'t follow "' + esc(path) + '"</span>';
      fb.innerHTML = '<div class="miss">' + PATH_ERRORS[r.error] + '</div>';
      preview(R, false, readAttr(code, 'alt'));
      return;
    }

    var found = R.files.indexOf(r.full) !== -1 && r.full !== R.page;
    var isRightType = R.kind === 'link' ? /\.css$/i.test(r.full) : !/\.(html|css)$/i.test(r.full);
    found = found && isRightType;

    con.innerHTML = 'Looked for: site/' + esc(r.full) + '\n' +
      (found ? '<span class="c-ok">200 OK</span>' : '<span class="c-bad">404 Not Found</span>');
    preview(R, found, readAttr(code, 'alt'));

    if (found) {
      state.solved[state.round] = true;
      save();
      drawProgress();
      fb.innerHTML = '<div class="win"><strong>Fixed!</strong> ' + R.explain + '</div>';
      var last = state.round === rounds.length - 1;
      $('fix-next').hidden = false;
      $('fix-next').textContent = last ? 'Finish: Watch out list →' : 'Next round →';
      if (R.kind === 'img' && !readAttr(code, 'alt')) {
        fb.innerHTML += '<div class="hint">It loads, but put the <code>alt</code> text back. It\'s what shows (and what screen readers say) when the image can\'t.</div>';
      }
    } else {
      var why = R.files.indexOf(r.full) !== -1
        ? 'That path points to <code>' + esc(r.full) + '</code>, which isn\'t the right kind of file here.'
        : diagnose(r.full, R.files);
      fb.innerHTML = '<div class="miss"><strong>Still broken.</strong> ' + why + '</div>';
    }
  }

  $('fix-run').addEventListener('click', run);
  $('fix-code').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(); }
  });
  $('fix-hint').addEventListener('click', function () {
    $('fix-feedback').innerHTML = '<div class="hint"><strong>Hint:</strong> ' + rounds[state.round].hint + '</div>';
  });
  $('fix-reset').addEventListener('click', function () { loadRound(state.round); });
  $('fix-next').addEventListener('click', function () {
    if (state.round === rounds.length - 1) show('watch');
    else loadRound(state.round + 1);
  });

  if (state.round >= rounds.length) state.round = 0;
  loadRound(state.round);

  /* =================================================================
     RESTART
     ================================================================= */
  $('lab-restart').addEventListener('click', function () {
    state = { done: {}, solved: {}, round: 0 };
    save();
    document.querySelectorAll('#watch-list input').forEach(function (c) { c.checked = false; });
    startQuiz(questions.map(function (q, i) { return i; }));
    loadRound(0);
    show('learn');
  });

  show('learn');
})();
