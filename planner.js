/* =====================================================================
   planner.js  ·  STUDY PLANNER
   Author: Maverick Hallett (mhallett) · BMIS 235 HTML-4
   AI piece (made with Claude). What it does:
   - Draws my week: class times, plus the open blocks between them.
   - When I add an assignment (due date + hours), it splits the work into
     sessions and spreads them over the days BEFORE the due date, so it
     doesn't all land the night before. It tries to finish a day early and
     puts a session right after that class meets when it can.
   - Saves everything in this browser only (localStorage). Nothing is sent
     anywhere and nothing I type shows up for other visitors.
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- my classes (from my Fall 2026 schedule) ----------
     days: 0 = Sunday, 1 = Monday ... 6 = Saturday */
  var DEFAULT_CLASSES = [
    { id: 'acct', name: 'ACCT 261', full: 'Principles of Accounting II', meets: [{ days: [1, 3, 5], start: '11:00', end: '11:50' }] },
    { id: 'bmis', name: 'BMIS 235', full: 'Management Information Systems', meets: [{ days: [2, 4], start: '12:15', end: '13:30' }] },
    { id: 'phil', name: 'Philosophy', full: 'Philosophy of Human Nature', meets: [{ days: [2, 4], start: '13:45', end: '15:00' }] },
    { id: 'stats', name: 'Stats', full: 'Business Statistics', meets: [{ days: [2, 4], start: '17:00', end: '18:15' }] },
    { id: 'musc', name: 'MUSC 250', full: 'Popular Music in the US', meets: [{ days: [1, 3, 5], start: '13:10', end: '14:00' }] },
    { id: 'gscg', name: 'GSCG', full: 'Gonzaga Sport Consulting Group', meets: [] }
  ];

  var DEFAULT_ASSIGNMENTS = [
    { id: 'phil-post', cls: 'phil', name: 'Philosophy discussion post', weekly: true, dow: 0, time: '23:59', hours: 2 }
  ];

  var DEFAULT_SETTINGS = { dayStart: '08:00', dayEnd: '22:00', maxPerDay: 4 };

  var DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var BUFFER = 10;      // minutes kept free before and after each class
  var MIN_BLOCK = 30;   // shortest work session worth scheduling
  var VIEW_START = 7;   // the week map shows 7am...
  var VIEW_END = 23;    // ...to 11pm
  var PX_PER_HOUR = 40;

  /* ---------- saved state ---------- */
  var KEY = 'nnbPlanner-v2';
  var state;
  function fresh() {
    return {
      classes: JSON.parse(JSON.stringify(DEFAULT_CLASSES)),
      assignments: JSON.parse(JSON.stringify(DEFAULT_ASSIGNMENTS)),
      settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
      done: {},
      week: 0
    };
  }
  try { state = JSON.parse(localStorage.getItem(KEY)); } catch (e) { state = null; }
  if (!state || !state.classes) state = fresh();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* not saved, still works */ }
  }

  /* ---------- small helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function toMin(t) { var p = t.split(':'); return Number(p[0]) * 60 + Number(p[1]); }
  function fmt(min) {
    var h = Math.floor(min / 60), m = min % 60;
    var ap = h >= 12 ? 'pm' : 'am';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + (m ? ':' + (m < 10 ? '0' : '') + m : '') + ap;
  }
  function dur(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return (h ? h + 'h' : '') + (m ? (h ? ' ' : '') + m + 'm' : '');
  }
  function dateKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function parseKey(k) { var p = k.split('-'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function nowMinutes() { var n = new Date(); return n.getHours() * 60 + n.getMinutes(); }
  function prettyDate(d) {
    return DAY_SHORT[d.getDay()] + ' ' + (d.getMonth() + 1) + '/' + d.getDate();
  }
  function classById(id) {
    for (var i = 0; i < state.classes.length; i++) if (state.classes[i].id === id) return state.classes[i];
    return { id: id, name: id, full: id, meets: [] };
  }

  /* ---------- weekly assignments become one copy per week ---------- */
  function instances() {
    var list = [];
    var today = startOfDay(new Date());
    state.assignments.forEach(function (a) {
      if (a.weekly) {
        for (var w = 0; w < 2; w++) {
          var d = addDays(today, w * 7);
          d = addDays(d, (a.dow - d.getDay() + 7) % 7);
          var key = dateKey(d);
          list.push({ id: a.id + '@' + key, base: a.id, cls: a.cls, name: a.name, dueKey: key, dueMin: toMin(a.time), hours: a.hours, weekly: true });
        }
      } else {
        list.push({ id: a.id, base: a.id, cls: a.cls, name: a.name, dueKey: a.date, dueMin: toMin(a.time), hours: a.hours, weekly: false });
      }
    });
    return list.map(function (x) {
      x.due = parseKey(x.dueKey);
      x.due.setMinutes(x.dueMin);
      x.doneMin = state.done[x.id] || 0;
      x.left = Math.max(0, Math.round(x.hours * 60) - x.doneMin);
      return x;
    }).filter(function (x) {
      return !(x.weekly && x.left === 0 && x.due < new Date());
    }).sort(function (a, b) { return a.due - b.due; });
  }

  /* ---------- busy and free time ---------- */
  function classBlocks(d) {
    var out = [];
    state.classes.forEach(function (c) {
      c.meets.forEach(function (m) {
        if (m.days.indexOf(d.getDay()) !== -1) out.push({ cls: c.id, start: toMin(m.start), end: toMin(m.end) });
      });
    });
    return out.sort(function (a, b) { return a.start - b.start; });
  }

  function freeGaps(d, taken, endLimit) {
    var s = toMin(state.settings.dayStart);
    var e = toMin(state.settings.dayEnd);
    if (endLimit !== undefined) e = Math.min(e, endLimit);
    if (dateKey(d) === dateKey(new Date())) s = Math.max(s, Math.ceil((nowMinutes() + 5) / 15) * 15);
    var busy = classBlocks(d).map(function (b) { return { start: b.start - BUFFER, end: b.end + BUFFER }; })
      .concat(taken || []).sort(function (a, b) { return a.start - b.start; });
    var gaps = [];
    var cur = s;
    busy.forEach(function (b) {
      if (b.start > cur) gaps.push({ start: cur, end: Math.min(b.start, e) });
      cur = Math.max(cur, b.end);
    });
    if (cur < e) gaps.push({ start: cur, end: e });
    return gaps.filter(function (g) { return g.end - g.start >= MIN_BLOCK; });
  }

  /* ---------- the scheduler ---------- */
  function chunksFor(min) {
    if (min <= 90) return [min];
    var n = Math.ceil(min / 60);
    var size = Math.round(min / n / 5) * 5;
    var out = [];
    for (var i = 0; i < n - 1; i++) out.push(size);
    out.push(min - size * (n - 1));
    return out;
  }

  function schedule() {
    var taken = {};   // dateKey -> [{start,end}]
    var used = {};    // dateKey -> minutes scheduled
    var sessions = [];
    var problems = [];
    var today = startOfDay(new Date());
    var cap = state.settings.maxPerDay * 60;

    instances().forEach(function (a) {
      if (a.left <= 0) return;
      // don't start too far ahead: about 2 days per hour of work, between 3 and 10 days
      var windowDays = Math.min(10, Math.max(3, Math.ceil(a.left / 60) * 2 + 1));
      var first = addDays(startOfDay(a.due), -windowDays);
      if (first < today) first = today;
      var days = [];
      for (var d = new Date(first); d < startOfDay(a.due); d = addDays(d, 1)) days.push(new Date(d));
      var lastDayLimit = null;
      if (days.length === 0) {
        days = [startOfDay(a.due)];
        lastDayLimit = a.dueMin - 30;
      }
      // finish a day early when there's room to
      var spreadDays = days.length >= 3 ? days.slice(0, -1) : days;
      var chunks = chunksFor(a.left);
      var n = chunks.length;

      chunks.forEach(function (len, i) {
        var target = n === 1 ? 0 : Math.round(i * (spreadDays.length - 1) / (n - 1));
        if (n === 1 && spreadDays.length > 1) target = Math.floor((spreadDays.length - 1) / 2);
        var order = [target];
        for (var k = 1; k < days.length; k++) {
          if (target - k >= 0) order.push(target - k);
          if (target + k < days.length) order.push(target + k);
        }
        var placed = false;
        for (var o = 0; o < order.length && !placed; o++) {
          var day = days[order[o]];
          var key = dateKey(day);
          if ((used[key] || 0) + len > cap) continue;
          var limit = lastDayLimit !== null && key === dateKey(a.due) ? lastDayLimit : undefined;
          var gaps = freeGaps(day, taken[key], limit).filter(function (g) { return g.end - g.start >= len; });
          if (!gaps.length) continue;
          var blocks = classBlocks(day);
          var best = null;
          gaps.forEach(function (g) {
            var score = 0, why = 'Open time between classes';
            blocks.forEach(function (b) {
              if (b.cls === a.cls && g.start - b.end >= 0 && g.start - b.end <= 30) {
                score += 3; why = 'Right after ' + classById(a.cls).name + ', while it\'s fresh';
              }
            });
            if (g.start < 21 * 60) score += 1; else why = 'Late block (nothing earlier was open)';
            if (why === 'Open time between classes') {
              if (g.start < 12 * 60) why = 'Morning block before classes';
              else if (g.start >= 17 * 60) why = 'Evening block';
            }
            score -= g.start / 2000;
            if (!best || score > best.score) best = { g: g, score: score, why: why };
          });
          var st = best.g.start;
          (taken[key] = taken[key] || []).push({ start: st, end: st + len });
          used[key] = (used[key] || 0) + len;
          sessions.push({ a: a, key: key, start: st, end: st + len, why: best.why });
          placed = true;
        }
        if (!placed) problems.push({ a: a, min: len });
      });
    });
    return { sessions: sessions, problems: problems };
  }

  /* =================================================================
     DRAWING
     ================================================================= */
  function weekStart() {
    var t = startOfDay(new Date());
    var monday = addDays(t, -((t.getDay() + 6) % 7));
    return addDays(monday, state.week * 7);
  }

  function block(cls, top, height, html, extra, title) {
    return '<div class="pl-block ' + cls + '" style="top:' + top + 'px;height:' + height + 'px"' +
      (title ? ' title="' + esc(title) + '"' : '') + (extra || '') + '>' + html + '</div>';
  }
  function y(min) { return (min - VIEW_START * 60) / 60 * PX_PER_HOUR; }

  function drawWeek(plan) {
    var ws = weekStart();
    $('pl-week-label').textContent = 'Week of ' + prettyDate(ws);
    var todayKey = dateKey(new Date());
    var height = (VIEW_END - VIEW_START) * PX_PER_HOUR;
    var html = '<div class="pl-gutter" style="height:' + height + 'px">';
    for (var h = VIEW_START; h < VIEW_END; h++) {
      html += '<div class="pl-hour" style="top:' + ((h - VIEW_START) * PX_PER_HOUR) + 'px">' + fmt(h * 60) + '</div>';
    }
    html += '</div>';
    for (var i = 0; i < 7; i++) {
      var d = addDays(ws, i);
      var key = dateKey(d);
      var inner = '';
      // open blocks (only today and later)
      if (key >= todayKey) {
        freeGaps(d, []).forEach(function (g) {
          if (g.end - g.start >= 45) {
            inner += block('pl-open', y(g.start), y(g.end) - y(g.start),
              '<span>Open · ' + dur(g.end - g.start) + '</span>', '', 'Open: ' + fmt(g.start) + '–' + fmt(g.end));
          }
        });
      }
      classBlocks(d).forEach(function (b) {
        var c = classById(b.cls);
        inner += block('pl-class c-' + b.cls, y(b.start), y(b.end) - y(b.start),
          '<b>' + esc(c.name) + '</b><span>' + fmt(b.start) + '</span>', '', c.full + ' ' + fmt(b.start) + '–' + fmt(b.end));
      });
      plan.sessions.forEach(function (s) {
        if (s.key !== key) return;
        inner += block('pl-session c-' + s.a.cls, y(s.start), Math.max(y(s.end) - y(s.start), 18),
          '<b>' + esc(s.a.name) + '</b><span>' + fmt(s.start) + ' · ' + dur(s.end - s.start) + '</span>', '',
          s.a.name + ': ' + fmt(s.start) + '–' + fmt(s.end) + ' (' + s.why + ')');
      });
      html += '<div class="pl-day' + (key === todayKey ? ' pl-today' : '') + '">' +
        '<div class="pl-dayhead">' + prettyDate(d) + '</div>' +
        '<div class="pl-daybody" style="height:' + height + 'px">' + inner + '</div></div>';
    }
    $('pl-grid').innerHTML = html;
  }

  function drawUpNext(plan) {
    var today = startOfDay(new Date());
    var keys = [dateKey(today), dateKey(addDays(today, 1))];
    var labels = ['Today', 'Tomorrow'];
    var html = '';
    keys.forEach(function (k, i) {
      var list = plan.sessions.filter(function (s) { return s.key === k; })
        .sort(function (a, b) { return a.start - b.start; });
      html += '<h3>' + labels[i] + '</h3>';
      if (!list.length) { html += '<p class="pl-empty">Nothing planned. Enjoy it.</p>'; return; }
      html += '<ul class="pl-list">';
      list.forEach(function (s) {
        html += '<li><span class="pl-dot c-' + s.a.cls + '"></span><div><b>' + fmt(s.start) + '–' + fmt(s.end) + '</b> ' +
          esc(classById(s.a.cls).name) + ': ' + esc(s.a.name) + '<div class="pl-why">' + esc(s.why) + '</div></div>' +
          '<button type="button" class="pl-done" data-id="' + esc(s.a.id) + '" data-min="' + (s.end - s.start) + '">Done</button></li>';
      });
      html += '</ul>';
    });
    if (plan.problems.length) {
      html += '<div class="pl-warn"><b>Heads up:</b> ';
      html += plan.problems.map(function (p) {
        return dur(p.min) + ' of "' + esc(p.a.name) + '" didn\'t fit before it\'s due';
      }).join('; ') + '. Start it now or raise your max hours per day.</div>';
    }
    $('pl-upnext').innerHTML = html;
    $('pl-upnext').querySelectorAll('.pl-done').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-id');
        state.done[id] = (state.done[id] || 0) + Number(b.getAttribute('data-min'));
        save(); render();
      });
    });
  }

  function drawAssignments() {
    var list = instances();
    var html = '';
    if (!list.length) html = '<p class="pl-empty">No assignments yet. Add one above.</p>';
    list.forEach(function (a) {
      var total = Math.round(a.hours * 60);
      var pct = Math.min(100, Math.round(a.doneMin / total * 100));
      var late = a.due < new Date() && a.left > 0;
      html += '<div class="pl-item"><span class="pl-dot c-' + a.cls + '"></span><div class="pl-item-main">' +
        '<b>' + esc(a.name) + '</b> <span class="pl-tag">' + esc(classById(a.cls).name) + '</span>' +
        (a.weekly ? ' <span class="pl-tag">weekly</span>' : '') +
        '<div class="pl-why">Due ' + prettyDate(a.due) + ' ' + fmt(a.dueMin) + ' · ' + dur(a.doneMin) + (a.doneMin ? '' : '0m') +
        ' of ' + dur(total) + ' done' + (late ? ' · <span class="pl-late">past due</span>' : '') + '</div>' +
        '<div class="pl-bar"><span style="width:' + pct + '%"></span></div></div>' +
        '<button type="button" class="pl-x" data-base="' + esc(a.base) + '" aria-label="Delete ' + esc(a.name) + '">✕</button></div>';
    });
    $('pl-assignments').innerHTML = html;
    $('pl-assignments').querySelectorAll('.pl-x').forEach(function (b) {
      b.addEventListener('click', function () {
        var base = b.getAttribute('data-base');
        var a = state.assignments.filter(function (x) { return x.id === base; })[0];
        var msg = a && a.weekly ? 'Delete every week of "' + a.name + '"?' : 'Delete this assignment?';
        // first click asks, second click deletes
        if (b.getAttribute('data-sure') !== 'yes') {
          b.setAttribute('data-sure', 'yes');
          b.textContent = 'Sure?';
          b.title = msg;
          return;
        }
        state.assignments = state.assignments.filter(function (x) { return x.id !== base; });
        save(); render();
      });
    });
  }

  function drawClassOptions() {
    var sel = $('pl-cls');
    var cur = sel.value;
    sel.innerHTML = state.classes.map(function (c) {
      return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>';
    }).join('');
    if (cur) sel.value = cur;
  }

  /* ---------- "My week" editor ---------- */
  function drawEditor() {
    var html = '';
    state.classes.forEach(function (c, ci) {
      html += '<div class="pl-edit-class"><div class="pl-edit-head"><span class="pl-dot c-' + c.id + '"></span><b>' + esc(c.name) + '</b>' +
        ' <span class="pl-why">' + esc(c.full) + '</span></div>';
      if (!c.meets.length) html += '<div class="pl-why">No set meeting time.</div>';
      c.meets.forEach(function (m, mi) {
        html += '<div class="pl-edit-row">';
        for (var d = 0; d < 7; d++) {
          html += '<label class="pl-daybox"><input type="checkbox" data-c="' + ci + '" data-m="' + mi + '" data-d="' + d + '"' +
            (m.days.indexOf(d) !== -1 ? ' checked' : '') + '>' + ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'][d] + '</label>';
        }
        html += '<input type="time" value="' + m.start + '" data-c="' + ci + '" data-m="' + mi + '" data-f="start">' +
          '–<input type="time" value="' + m.end + '" data-c="' + ci + '" data-m="' + mi + '" data-f="end">' +
          '<button type="button" class="pl-mini" data-del="' + ci + ':' + mi + '">Remove</button></div>';
      });
      html += '<button type="button" class="pl-mini" data-add="' + ci + '">+ Add a time</button></div>';
    });
    $('pl-editor').innerHTML = html;
    var ed = $('pl-editor');
    ed.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var m = state.classes[cb.dataset.c].meets[cb.dataset.m];
        var d = Number(cb.dataset.d);
        m.days = m.days.filter(function (x) { return x !== d; });
        if (cb.checked) m.days.push(d);
        save(); render(true);
      });
    });
    ed.querySelectorAll('input[type=time]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        if (!inp.value) return;
        state.classes[inp.dataset.c].meets[inp.dataset.m][inp.dataset.f] = inp.value;
        save(); render(true);
      });
    });
    ed.querySelectorAll('[data-add]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.classes[b.dataset.add].meets.push({ days: [], start: '09:00', end: '10:00' });
        save(); render();
      });
    });
    ed.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.dataset.del.split(':');
        state.classes[p[0]].meets.splice(Number(p[1]), 1);
        save(); render();
      });
    });
  }

  function render(skipEditor) {
    var plan = schedule();
    drawWeek(plan);
    drawUpNext(plan);
    drawAssignments();
    drawClassOptions();
    if (!skipEditor) drawEditor();
    $('pl-start').value = state.settings.dayStart;
    $('pl-end').value = state.settings.dayEnd;
    $('pl-max').value = state.settings.maxPerDay;
  }

  /* ---------- the add-assignment form ---------- */
  $('pl-date').value = dateKey(addDays(new Date(), 7));
  $('pl-weekly').addEventListener('change', function () {
    $('pl-date-wrap').hidden = this.checked;
    $('pl-dow-wrap').hidden = !this.checked;
  });
  $('pl-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('pl-name').value.trim();
    var hours = Number($('pl-hours').value);
    var msg = $('pl-form-msg');
    if (!name) { msg.textContent = 'Give it a name.'; return; }
    if (!(hours > 0)) { msg.textContent = 'How many hours will it take? Use a number like 2 or 1.5.'; return; }
    var weekly = $('pl-weekly').checked;
    var a = { id: 'a' + Date.now(), cls: $('pl-cls').value, name: name, hours: hours, time: $('pl-time').value || '23:59', weekly: weekly };
    if (weekly) a.dow = Number($('pl-dow').value);
    else {
      if (!$('pl-date').value) { msg.textContent = 'Pick a due date.'; return; }
      a.date = $('pl-date').value;
    }
    state.assignments.push(a);
    save();
    $('pl-name').value = '';
    msg.textContent = 'Added. Its sessions are on the map.';
    render();
  });

  $('pl-prev').addEventListener('click', function () { state.week--; save(); render(true); });
  $('pl-next').addEventListener('click', function () { state.week++; save(); render(true); });
  $('pl-this').addEventListener('click', function () { state.week = 0; save(); render(true); });
  ['pl-start', 'pl-end', 'pl-max'].forEach(function (id) {
    $(id).addEventListener('change', function () {
      if (id === 'pl-max') state.settings.maxPerDay = Math.max(1, Number($(id).value) || 4);
      else if ($(id).value) state.settings[id === 'pl-start' ? 'dayStart' : 'dayEnd'] = $(id).value;
      save(); render(true);
    });
  });
  $('pl-reset').addEventListener('click', function () {
    if (this.getAttribute('data-sure') !== 'yes') {
      this.setAttribute('data-sure', 'yes');
      this.textContent = 'Click again to erase everything';
      return;
    }
    state = fresh(); save(); render();
    this.removeAttribute('data-sure');
    this.textContent = 'Reset to my default schedule';
  });

  render();
})();
