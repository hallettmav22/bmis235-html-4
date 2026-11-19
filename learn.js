/* =====================================================================
   learn.js  ·  LEARN CSS
   Author: Maverick Hallett (mhallett) · BMIS 235 HTML-4
   AI piece (made with Claude). What it does:
   - Moves between the steps (Learn, Try it, Quiz, Watch out).
   - Try it: takes the CSS typed in the planner.css box and applies it
     only to the mini pages whose <head> has a correct link line, just
     like a real browser. Then it checks the tasks by reading the colors
     and fonts the browser actually used.
   - Quiz: one question at a time with the answer explained right away.
   ===================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  var KEY = 'goombaLearnCSS-v1';
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
  function save(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) {}
  }

  /* =================================================================
     STEPS
     ================================================================= */
  var order = ['learn', 'play', 'quiz', 'watch'];
  var current = 'learn';
  var done = saved.done || {};
  function show(id) {
    if (order.indexOf(id) > order.indexOf(current)) done[current] = true;
    current = id;
    order.forEach(function (p) { $(p).hidden = p !== id; });
    document.querySelectorAll('.tool-step').forEach(function (b) {
      var go = b.getAttribute('data-go');
      b.classList.toggle('active', go === id);
      b.classList.toggle('done', !!done[go]);
      b.setAttribute('aria-selected', go === id ? 'true' : 'false');
    });
    persist();
    $(id).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  document.querySelectorAll('[data-go]').forEach(function (b) {
    b.addEventListener('click', function () { show(b.getAttribute('data-go')); });
  });

  /* =================================================================
     LISTEN: NotebookLM prompt
     ================================================================= */
  function buildPrompt() {
    $('listen-out').value =
      'Create a short, friendly audio explainer (about 5 minutes) for a college student ' +
      'who is new to HTML and CSS. Topic: ' + $('listen-topic').value + '. Use one everyday ' +
      'analogy. Use a study planner website with one page per weekday and a shared planner.css ' +
      'file as the running example. Point out the most common beginner mistake and how to spot it. ' +
      'End with a 3-question spoken quiz and give the answers.';
  }
  $('listen-topic').addEventListener('change', buildPrompt);
  $('listen-copy').addEventListener('click', function () {
    var box = $('listen-out');
    box.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    $('listen-msg').textContent = ok ? 'Copied. Paste it into NotebookLM.' : 'Select the text and copy it yourself.';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(box.value).then(function () {
        $('listen-msg').textContent = 'Copied. Paste it into NotebookLM.';
      }, function () {});
    }
  });
  buildPrompt();

  /* =================================================================
     TRY IT: four mini pages + one stylesheet
     ================================================================= */
  var STARTER_CSS =
    'body {\n' +
    '  background: #F4EDE1;\n' +
    '  font-family: Georgia, serif;\n' +
    '  color: #2F4F3E;\n' +
    '}\n\n' +
    'h4 {\n' +
    '  color: #C8553D;\n' +
    '  margin: 0 0 6px 0;\n' +
    '}\n\n' +
    '.block {\n' +
    '  padding: 6px;\n' +
    '  margin: 4px 0;\n' +
    '  border-radius: 6px;\n' +
    '  color: white;\n' +
    '}\n\n' +
    '.acct  { background: #D9822B; }\n' +
    '.cath  { background: #6A4C93; }\n' +
    '.bmis  { background: #3E7CB1; }\n' +
    '.phil  { background: #C2185B; }\n' +
    '.stats { background: #4E9A3A; }\n\n' +
    '/* added later by someone else */\n' +
    '.phil  { background: #888888; }\n';

  var PAGES = [
    { file: 'monday.html', title: 'Monday', blocks: [['acct', 'ACCT 261', '11:00'], ['cath', 'Catholicism', '1:10']] },
    { file: 'tuesday.html', title: 'Tuesday', blocks: [['bmis', 'BMIS 235', '12:15'], ['phil', 'Philosophy', '1:45'], ['stats', 'Stats', '5:00']] },
    { file: 'wednesday.html', title: 'Wednesday', blocks: [['acct', 'ACCT 261', '11:00'], ['cath', 'Catholicism', '1:10']] },
    { file: 'thursday.html', title: 'Thursday', blocks: [['bmis', 'BMIS 235', '12:15'], ['phil', 'Philosophy', '1:45'], ['stats', 'Stats', '5:00']] }
  ];
  var GOOD_LINK = '<link rel="stylesheet" href="planner.css">';
  var STARTER_LINKS = [GOOD_LINK, GOOD_LINK, '<link rel="stylesheet" href="planer.css">', GOOD_LINK];

  var play = saved.play || { css: STARTER_CSS, links: STARTER_LINKS.slice() };

  function persist() {
    save({ done: done, play: play });
  }

  function drawPages() {
    var html = '';
    PAGES.forEach(function (p, i) {
      html += '<div class="mini-page" id="mini-' + i + '">' +
        '<div class="mini-tab"><span class="mini-dots">●●●</span> <span class="mini-title">' + esc(p.title) +
        '</span> <span class="mini-file">' + esc(p.file) + '</span></div>' +
        '<div class="mini-head"><div class="mini-headtag">&lt;head&gt;</div>' +
        '<div class="mini-headline">&lt;title&gt;' + esc(p.title) + '&lt;/title&gt;</div>' +
        '<input class="mini-link" data-i="' + i + '" type="text" spellcheck="false" autocomplete="off" aria-label="Link line for ' + esc(p.file) + '">' +
        '<div class="mini-status" id="mini-status-' + i + '"></div>' +
        '<div class="mini-headtag">&lt;/head&gt;</div></div>' +
        '<div class="mini-body"><h4>' + esc(p.title) + '</h4>';
      p.blocks.forEach(function (b) {
        html += '<div class="block ' + b[0] + '"><span class="name">' + esc(b[1]) + '</span> ' + b[2] + '</div>';
      });
      html += '</div></div>';
    });
    $('pg-pages').innerHTML = html;
    document.querySelectorAll('.mini-link').forEach(function (inp) {
      inp.value = play.links[Number(inp.getAttribute('data-i'))];
      inp.addEventListener('input', function () {
        play.links[Number(inp.getAttribute('data-i'))] = inp.value;
        update();
      });
    });
  }

  /* is this link line correct? Returns a short reason when it isn't. */
  function checkLink(line) {
    var t = line.trim();
    if (!/^<\s*link\b/i.test(t)) return 'Not a <link> tag, so nothing loads.';
    var rel = t.match(/\brel\s*=\s*["']([^"']*)["']/i);
    var href = t.match(/\bhref\s*=\s*["']([^"']*)["']/i);
    if (!rel || rel[1].toLowerCase() !== 'stylesheet') return 'Missing rel="stylesheet", so it isn\'t used as CSS.';
    if (!href) {
      if (/\bsrc\s*=/.test(t)) return 'The link tag uses href, not src.';
      return 'Missing href="…", so there\'s no path to the file.';
    }
    if (href[1] !== 'planner.css') {
      if (href[1].toLowerCase() === 'planner.css') return 'Capital letters don\'t match: the file is planner.css.';
      return 'href="' + href[1] + '" → 404 Not Found. The file is planner.css.';
    }
    if (!/>\s*$/.test(t)) return 'The tag isn\'t closed with >.';
    return '';
  }

  /* turn the typed CSS into rules that only reach linked mini pages */
  function scopeCSS(css) {
    css = css.replace(/\/\*[\s\S]*?\*\//g, '');
    var out = '';
    var parts = css.split('}');
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      var brace = part.indexOf('{');
      if (brace === -1) continue;
      var sel = part.slice(0, brace).trim();
      var body = part.slice(brace + 1);
      if (!sel || sel.charAt(0) === '@' || /[<>{]/.test(body)) continue;
      var scoped = sel.split(',').map(function (s) {
        s = s.trim();
        if (!s) return '';
        if (/^(html|body)\b/i.test(s)) return s.replace(/^(html|body)/i, '.mini-page.linked .mini-body');
        return '.mini-page.linked .mini-body ' + s;
      }).filter(Boolean).join(', ');
      if (scoped) out += scoped + ' {' + body + '}\n';
    }
    return out;
  }

  var flashTimer = null;
  function update() {
    play.css = $('pg-css').value;
    $('mini-css').textContent = scopeCSS(play.css);
    PAGES.forEach(function (p, i) {
      var why = checkLink(play.links[i]);
      var page = $('mini-' + i);
      page.classList.toggle('linked', !why);
      var st = $('mini-status-' + i);
      st.innerHTML = why ? '✗ ' + esc(why) : '✓ planner.css loaded';
      st.className = 'mini-status ' + (why ? 'bad' : 'ok');
    });
    clearTimeout(flashTimer);
    document.querySelectorAll('.mini-page.linked').forEach(function (p) { p.classList.add('flash'); });
    $('pg-flow').classList.add('on');
    flashTimer = setTimeout(function () {
      document.querySelectorAll('.mini-page').forEach(function (p) { p.classList.remove('flash'); });
      $('pg-flow').classList.remove('on');
    }, 600);
    checkTasks();
    persist();
  }

  /* ---------- tasks, checked by reading what the browser drew ---------- */
  var STARTER_BG = 'rgb(244, 237, 225)';
  function bodies() { return Array.prototype.slice.call(document.querySelectorAll('.mini-body')); }
  function cs(el, prop) { return getComputedStyle(el)[prop]; }

  var TASKS = [
    { text: 'Wednesday looks plain. Fix the link line in its <code>&lt;head&gt;</code>.',
      tip: 'Compare its href to the file name: planner.css.',
      check: function () { return $('mini-2').classList.contains('linked'); } },
    { text: 'Change the background color of <strong>all four</strong> pages with <strong>one</strong> edit in planner.css.',
      tip: 'Change the background value in the body rule. Every linked page uses it.',
      check: function () {
        var b = bodies();
        if (!b.every(function (x) { return x.parentNode.classList.contains('linked'); })) return false;
        var bg = cs(b[0], 'backgroundColor');
        return bg !== STARTER_BG && bg !== 'rgba(0, 0, 0, 0)' && b.every(function (x) { return cs(x, 'backgroundColor') === bg; });
      } },
    { text: 'Philosophy blocks are gray, but there\'s a pink <code>.phil</code> rule. Make them pink (<code>#C2185B</code>) again.',
      tip: 'Two .phil rules are equally specific, so the later one wins. Fix or delete the later one.',
      check: function () {
        var el = document.querySelector('#mini-1 .phil');
        return $('mini-1').classList.contains('linked') && cs(el, 'backgroundColor') === 'rgb(194, 24, 91)';
      } },
    { text: 'Make every class name bold by adding <strong>one new rule</strong>. Each name is in <code>&lt;span class="name"&gt;</code>.',
      tip: 'Start a new rule with .name { … } and use font-weight: bold;',
      check: function () {
        var names = document.querySelectorAll('.mini-page.linked .name');
        if (names.length < 10) return false;
        return Array.prototype.every.call(names, function (n) { return Number(cs(n, 'fontWeight')) >= 600; });
      } }
  ];

  function drawTasks() {
    $('pg-tasks').innerHTML = TASKS.map(function (t, i) {
      return '<li id="task-' + i + '"><span class="task-box" aria-hidden="true"></span><span>' + t.text +
        ' <button type="button" class="tool-link task-tip" data-i="' + i + '">hint</button>' +
        '<span class="task-hint" id="task-hint-' + i + '" hidden>' + t.tip + '</span></span></li>';
    }).join('');
    document.querySelectorAll('.task-tip').forEach(function (b) {
      b.addEventListener('click', function () {
        var h = $('task-hint-' + b.getAttribute('data-i'));
        h.hidden = !h.hidden;
      });
    });
  }

  function checkTasks() {
    var n = 0;
    TASKS.forEach(function (t, i) {
      var ok = false;
      try { ok = t.check(); } catch (e) { ok = false; }
      $('task-' + i).classList.toggle('done', ok);
      if (ok) n++;
    });
    $('pg-score').textContent = n + ' of ' + TASKS.length + ' done' + (n === TASKS.length ? '. Nice!' : '');
  }

  $('pg-css').value = play.css;
  var typingTimer = null;
  $('pg-css').addEventListener('input', function () {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(update, 250);
  });
  $('pg-css').addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      var t = e.target, s = t.selectionStart;
      t.value = t.value.slice(0, s) + '  ' + t.value.slice(t.selectionEnd);
      t.selectionStart = t.selectionEnd = s + 2;
    }
  });
  $('pg-reset').addEventListener('click', function () {
    play = { css: STARTER_CSS, links: STARTER_LINKS.slice() };
    $('pg-css').value = play.css;
    drawPages();
    update();
  });

  drawTasks();
  drawPages();
  update();

  /* =================================================================
     QUIZ: one question at a time
     ================================================================= */
  var questions = [
    { q: 'Where does <code>&lt;link rel="stylesheet" href="styles.css"&gt;</code> go?',
      opts: ['Inside &lt;head&gt;', 'At the very bottom of &lt;body&gt;', 'Inside styles.css', 'Inside &lt;footer&gt;'], a: 0,
      why: 'The link line belongs in the <code>&lt;head&gt;</code>, which holds information about the page rather than things you see on it.' },
    { q: 'What shows up on the browser tab?',
      opts: ['The first &lt;h1&gt;', 'The &lt;title&gt; in the head', 'The file name', 'The footer'], a: 1,
      why: 'The <code>&lt;title&gt;</code> lives in the head. You never see it on the page itself, only on the tab (and in bookmarks and search results).' },
    { q: 'Four pages link to the same styles.css. You change the h1 color in styles.css. What happens?',
      opts: ['Only index.html changes', 'Every page that links to styles.css changes', 'Nothing until you edit each page', 'Only pages with an h1 class'], a: 1,
      why: 'That\'s the point of one shared stylesheet: change a rule once and every page that links to it picks up the change.' },
    { q: 'Monday, Tuesday and Thursday look branded, but Wednesday is plain Times New Roman. What\'s most likely wrong?',
      opts: ['Wednesday has too many classes', 'Wednesday\'s link line is missing or its href is wrong', 'styles.css is broken', 'Wednesday needs its own stylesheet'], a: 1,
      why: 'If the stylesheet itself were broken, every page would be plain. One plain page means that page\'s <code>&lt;link&gt;</code> line is missing or misspelled.' },
    { q: 'planner.css has <code>.phil { background: pink; }</code> and later <code>.phil { background: gray; }</code>. What color are the Philosophy blocks?',
      opts: ['Pink, because it came first', 'Gray, because the later rule wins', 'A mix of both', 'Neither, because they cancel out'], a: 1,
      why: 'Both rules use the same selector, so they\'re equally specific. When that happens, the rule that comes later in the file wins.' },
    { q: 'The file has <code>.note { color: red; }</code> and, later, <code>p { color: green; }</code>. What color is <code>&lt;p class="note"&gt;</code>?',
      opts: ['Green, because it comes later', 'Red, because a class is more specific than a tag', 'Black, the default', 'Half red, half green'], a: 1,
      why: 'Specificity is checked before order. A class selector (<code>.note</code>) beats a plain tag selector (<code>p</code>) even though the p rule comes later.' },
    { q: 'Which selector styles <code>&lt;div class="block acct"&gt;</code> by its acct class?',
      opts: ['acct', '.acct', '#acct', '&lt;acct&gt;'], a: 1,
      why: 'In CSS a dot means "class," so <code>.acct</code> picks any tag with acct in its class list. <code>#acct</code> would look for <code>id="acct"</code>.' },
    { q: 'You typed <code>backgroud: blue;</code> in a rule. What happens?',
      opts: ['The whole stylesheet stops working', 'The browser skips that one line, and everything else still works', 'The page shows an error', 'It works anyway'], a: 1,
      why: 'Browsers ignore declarations they don\'t understand, with no error message. The rest of the rule and the file still apply, so typos are easy to miss.' }
  ];

  var qOrder = [], qIndex = 0, qScore = 0, qMissed = [];
  function startQuiz(list) { qOrder = list; qIndex = 0; qScore = 0; qMissed = []; drawQuestion(); }
  function allQs() { return questions.map(function (q, i) { return i; }); }

  function drawQuestion() {
    var box = $('quiz-box');
    if (qIndex >= qOrder.length) {
      var html = '<p class="quiz-q"><strong>You got ' + qScore + ' of ' + qOrder.length + '.</strong></p>';
      if (qMissed.length) {
        html += '<p>Missed: ' + qMissed.map(function (i) { return 'Q' + (i + 1); }).join(', ') + '</p>' +
          '<button type="button" class="tool-btn" id="quiz-retry">Redo the ones I missed</button>';
      } else {
        html += '<p>Clean sweep.</p>';
      }
      html += '<button type="button" class="tool-btn tool-ghost" id="quiz-again">Start the quiz over</button>';
      box.innerHTML = html;
      if ($('quiz-retry')) $('quiz-retry').addEventListener('click', function () { startQuiz(qMissed.slice()); });
      $('quiz-again').addEventListener('click', function () { startQuiz(allQs()); });
      return;
    }
    var qi = qOrder[qIndex], Q = questions[qi];
    var h = '<div class="quiz-count">Question ' + (qIndex + 1) + ' of ' + qOrder.length + '</div><div class="quiz-q">' + Q.q + '</div>';
    Q.opts.forEach(function (o, i) { h += '<button type="button" class="quiz-opt" data-i="' + i + '">' + o + '</button>'; });
    box.innerHTML = h;
    box.querySelectorAll('.quiz-opt').forEach(function (b) {
      b.addEventListener('click', function () { answer(qi, Number(b.getAttribute('data-i'))); });
    });
  }

  function answer(qi, pick) {
    var Q = questions[qi], box = $('quiz-box');
    box.querySelectorAll('.quiz-opt').forEach(function (b, i) {
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
    next.className = 'tool-btn';
    next.textContent = qIndex + 1 < qOrder.length ? 'Next question →' : 'See my score';
    next.addEventListener('click', function () { qIndex++; drawQuestion(); });
    box.appendChild(next);
    next.focus();
  }
  startQuiz(allQs());

  show('learn');
})();
