(() => {
const KEY = 'primordium.characters.v1';
const D = window.PRIMORDIUM_DATA;
const SK = Object.fromEntries(D.skills.map(s => [s.name, s]));
const $ = (s, el = document) => el.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const n = v => Number(v) || 0;
const STATN = {STR:'Strength',AGI:'Agility',KNO:'Knowledge',SPD:'Speed',PER:'Perception',SPE:'Speech'};
const STATK = Object.fromEntries(Object.entries(STATN).map(([k, v]) => [v, k]));
let db = load(); let current = null; let tab = 'core';

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
let saveTimer; function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => localStorage.setItem(KEY, JSON.stringify(db)), 250); }
function blank(name) {
  const c = { id: Date.now().toString(36), name, race: '', level: 1, xp: 0, marks: 0, stats: {}, hpBase: 40, hpOther: 0, hpCur: 40, hpTemp: 0, armorOther: 0,
    trin: {dmg:'', a:'', b:''}, equip: PD.equipSlots.map(() => ({item:'',tier:'',armor:'',cond:''})), weapons: PD.weaponSlots.map(() => ({item:'',tier:'',ap:'',cond:''})),
    deck: {...PD.startDeck}, jokers: 1, suit: '', stacks: {}, resources: {}, conditions: {}, death: 0, breather: false,
    abilities: [], perks: [], traits: [], resist: '', inventory: '', notes: '', skills: {} };
  PD.stats.forEach(s => c.stats[s] = 0); return c;
}
function upgrade(c) {  // characters saved by the first version
  c.trin ??= {dmg:'', a:'', b:''}; c.armorOther ??= n(c.armor); c.skills ??= {}; c.traits ??= []; c.perks = (c.perks || []).map(p => typeof p === 'string' ? {text:p} : p);
  for (const [k, s] of Object.entries(c.skills)) if (!SK[k]) delete c.skills[k];
  return c;
}
// ---------- what the character's skills grant ----------
function granted(c, skillName) {
  const out = []; const names = skillName ? [skillName] : Object.keys(c.skills);
  for (const k of names) {
    const s = c.skills[k]; const d = SK[k]; if (!s || !d) continue;
    for (let t = 0; t <= n(s.base); t++) { if (t === 0 && n(s.base) === 0) continue; (d.base[t] || []).forEach(i => out.push({...i, skill: k, tierLabel: t === 0 ? 'Tier 0' : `Base Tier ${t}`})); }
    if (s.path && d.paths[s.path]) for (let t = 1; t <= n(s.ptier); t++) (d.paths[s.path][t] || []).forEach(i => out.push({...i, skill: k, tierLabel: `${s.path} Tier ${t}`}));
  }
  return out;
}
function tierItems(c, k, kind, t) {  // the items added by one specific step
  const d = SK[k], s = c.skills[k] || {};
  if (kind === 'base') return [...(t === 1 ? (d.base[0] || []) : []), ...(d.base[t] || [])];
  return (d.paths[s.path] || {})[t] || [];
}
function traitFx(t) {
  const fx = []; const m = String(t.effect).match(/^([+-]\d+) (Strength|Agility|Knowledge|Speed|Perception|Speech)$/);
  if (m) fx.push({stat: STATK[m[2]], add: Number(m[1])});
  const h = String(t.effect).match(/^([+-]\d+) HP$/); if (h) fx.push({maxhp: Number(h[1])});
  return fx;
}
// ---------- totals: everything flows from these ----------
function totals(c) {
  const st = {}; PD.stats.forEach(s => st[s] = n(c.stats[s]));
  let hpSkill = 0, armSkill = 0, hpPer = [];
  if (c.race === 'Trin') { if (c.trin.dmg) st[c.trin.dmg] += 1; for (const x of [c.trin.a, c.trin.b]) if (x === 'HP') hpSkill += 5; else if (x) st[x] += 1; }
  for (const t of c.traits) for (const f of traitFx(t)) { if (f.stat) st[f.stat] += f.add; if (f.maxhp) hpSkill += f.maxhp; }
  for (const i of granted(c)) for (const f of (i.effects || [])) {
    if (f.stat) st[f.stat] += f.add; if (f.maxhp) hpSkill += f.maxhp; if (f.armor) armSkill += f.armor; if (f.maxhpPerStat) hpPer.push(f);
  }
  for (const f of hpPer) hpSkill += f.per * Math.max(0, st[f.maxhpPerStat]);
  const race = D.races[c.race] || {};
  const natural = n(race.armor) + armSkill;
  const worn = c.equip.reduce((a, e) => a + n(e.armor), 0);
  const maxhp = n(c.hpBase) + 25 * Math.floor(n(c.level) / 5) + n(c.hpOther) + hpSkill;
  const earned = n(c.level) + 1 + Math.floor(n(c.level) / 5) + (race.freeMagicPoint ? 1 : 0);
  const spent = Object.values(c.skills).reduce((a, s) => a + n(s.base) + n(s.ptier), 0);
  return { st, maxhp, hpSkill, natural, worn, armor: natural + worn + n(c.armorOther), earned, spent };
}
const derived = {
  maxhp: T => T.maxhp, move: T => Math.max(2, 5 + T.st.SPD) + 'M', init: T => 'D10 ' + (T.st.PER >= 0 ? '+ ' : '- ') + Math.abs(T.st.PER),
  carry: T => (10 + T.st.STR) + ' items', armor: T => T.armor, natural: T => T.natural, worn: T => T.worn, hpskill: T => '+' + T.hpSkill,
  earned: T => T.earned, spent: T => T.spent, left: T => T.earned - T.spent, xpnext: () => 100 + 25 * (n(current.level) - 1),
  hpbar: T => Math.max(0, Math.min(100, Math.round(100 * n(current.hpCur) / Math.max(1, T.maxhp)))) };
function refresh() {
  if (!current) return; const T = totals(current);
  document.querySelectorAll('[data-d]').forEach(el => { const v = derived[el.dataset.d](T); if (el.dataset.d === 'hpbar') el.style.width = v + '%'; else el.textContent = v; });
  document.querySelectorAll('[data-tot]').forEach(el => { const k = el.dataset.tot, b = n(current.stats[k]), t = T.st[k]; el.textContent = t; el.parentElement.classList.toggle('boosted', t !== b); });
  const left = T.earned - T.spent; document.querySelectorAll('[data-d="left"]').forEach(el => el.classList.toggle('warn', left < 0));
  $('#title').textContent = current.name || 'Unnamed';
}
// ---------- notifications ----------
function toast(lines) {
  const box = $('#toasts'); while (box.children.length >= 2) box.firstElementChild.remove();
  const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status');
  el.innerHTML = lines.map((l, i) => i === 0 ? `<b>${esc(l)}</b>` : `<span>${esc(l)}</span>`).join('');
  box.appendChild(el); setTimeout(() => el.classList.add('out'), 3800); setTimeout(() => el.remove(), 4300);
}
const fxText = i => (i.effects || []).map(f => f.stat ? `${f.add > 0 ? '+' : ''}${f.add} ${STATN[f.stat]}` : f.maxhp ? `+${f.maxhp} maximum HP` : f.armor ? `+${f.armor} natural armor` : f.maxhpPerStat ? `+${f.per} HP per ${STATN[f.maxhpPerStat]}` : '').filter(Boolean).join(', ');
const itemLine = i => `${i.kind === 'ability' ? 'Ability' : 'Perk'}: ${i.name}${fxText(i) ? ' (' + fxText(i) + ')' : ''}`;
// ---------- path helpers and builders ----------
const get = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
function set(o, p, v) { const k = p.split('.'); const last = k.pop(); const t = k.reduce((a, x) => a[x] ??= {}, o); t[last] = v; }
const field = (label, path, opts = {}) => `<label class="field ${opts.cls||''}"><span>${label}</span><input ${opts.num?'type="number" inputmode="numeric"':'type="text"'} data-p="${path}" value="${esc(get(current, path))}" ${opts.ph?`placeholder="${opts.ph}"`:''}></label>`;
const stepper = (label, path, min = 0, extra = '') => `<div class="step"><span>${label}</span><button data-s="${path}" data-by="-1" data-min="${min}" ${extra} aria-label="Lower ${label}">−</button><output>${n(get(current, path))}</output><button data-s="${path}" data-by="1" ${extra} aria-label="Raise ${label}">+</button></div>`;
const toggle = (label, path) => `<button class="tog ${get(current, path)?'on':''}" data-t="${path}" aria-pressed="${!!get(current, path)}">${label}</button>`;
const calc = (label, key) => `<div class="calc"><span>${label}</span><b data-d="${key}"></b></div>`;
const select = (label, path, opts, blankLabel) => `<label class="field"><span>${label}</span><select data-p="${path}">${blankLabel !== undefined ? `<option value="">${blankLabel}</option>` : ''}${opts.map(o => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(get(current, path)) === String(v) ? 'selected' : ''}>${esc(t)}</option>`; }).join('')}</select></label>`;
const detail = i => `<details class="item"><summary><b>${esc(i.name)}</b><span>${i.kind === 'ability' ? esc(i.type + ' · ' + i.rarity) : 'Perk'}</span></summary><p><i>${esc(i.desc)}</i></p><p>${esc(i.usage)}</p></details>`;
// ---------- views ----------
function listView() {
  current = null; $('#tabs').hidden = true; $('#backBtn').hidden = true; $('#title').textContent = 'Primordium';
  const chars = Object.values(db).map(upgrade).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  $('#view').innerHTML = `<section class="list">
    ${chars.length ? chars.map(c => `<button class="charrow" data-open="${c.id}"><b>${esc(c.name || 'Unnamed')}</b><span>Level ${esc(c.level)} ${esc(c.race || '')}</span><span class="hp">${esc(c.hpCur)} / ${totals(c).maxhp} HP</span></button>`).join('')
      : `<p class="empty">No characters yet. Create one to start tracking HP, stacks, gear, and skills at the table.</p>`}
    <form id="newForm" class="newchar"><input id="newName" placeholder="Character name" required><button class="btn">Create character</button></form></section>`;
}
const TABS = [['core','Core'],['combat','Combat'],['gear','Gear'],['abilities','Abilities'],['skills','Skills'],['notes','Notes']];
function charView(id, t = tab) {
  const y = (current && current.id === id && t === tab) ? window.scrollY : 0;
  current = upgrade(db[id]); tab = t; $('#backBtn').hidden = false; const tb = $('#tabs'); tb.hidden = false;
  tb.innerHTML = TABS.map(([k, l]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('');
  $('#view').innerHTML = views[tab](); refresh(); window.scrollTo(0, y);
}
const statBox = s => `<div class="stat"><span>${STATN[s]}</span><b data-tot="${s}"></b><div class="adj"><button data-s="stats.${s}" data-by="-1" data-min="-10" aria-label="Lower base ${STATN[s]}">−</button><small>base ${n(current.stats[s])}</small><button data-s="stats.${s}" data-by="1" aria-label="Raise base ${STATN[s]}">+</button></div></div>`;
const views = {
  core: () => { const race = D.races[current.race];
    return `
    <section class="hero">
      <div class="hpline"><button class="big" data-s="hpCur" data-by="-1" data-min="-999" aria-label="Lose 1 HP">−</button>
        <div class="hpnum"><input type="number" inputmode="numeric" data-p="hpCur" value="${esc(current.hpCur)}" aria-label="Current HP"><small>of <b data-d="maxhp"></b> HP</small></div>
        <button class="big" data-s="hpCur" data-by="1" data-min="-999" aria-label="Gain 1 HP">+</button></div>
      <div class="bar"><i data-d="hpbar"></i></div>
      <div class="row3">${field('Temporary HP','hpTemp',{num:1})}${calc('Armor','armor')}${calc('Movement','move')}</div>
    </section>
    <section><h2>Character</h2>
      <div class="row2">${field('Name','name')}${select('Race','race',Object.keys(D.races),'Choose a race')}</div>
      <div class="row3">${field('Level','level',{num:1})}${field('XP','xp',{num:1})}${calc('XP for next level','xpnext')}</div>
      ${field('Marks','marks',{num:1})}
      ${race ? `<div class="racebox"><b>${esc(current.race)}</b><ul>${race.traits.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
      ${current.race === 'Trin' ? `<div class="row3">${select('+1 to','trin.dmg',[['STR','Strength'],['AGI','Agility'],['KNO','Knowledge']],'Choose')}${select('+1 to','trin.a',[['SPD','Speed'],['PER','Perception'],['SPE','Speech'],['HP','+5 HP']],'Choose')}${select('+1 to','trin.b',[['SPD','Speed'],['PER','Perception'],['SPE','Speech'],['HP','+5 HP']],'Choose')}</div>` : ''}
    </section>
    <section><h2>Stats</h2><div class="statgrid">${PD.stats.map(statBox).join('')}</div>
      <p class="note">Large numbers are totals, including race choices, traits, and skills. Adjust the base with − and +. Damage modifier per die: +½ per D4 or D6, +1 per D8 to D12, +2 per D20.</p></section>
    <section><h2>Health and defense</h2><div class="row3">${field('Base HP (race)','hpBase',{num:1})}${calc('From skills and traits','hpskill')}${field('Other HP','hpOther',{num:1})}</div>
      <div class="row3">${calc('Natural armor','natural')}${calc('Worn armor (Gear)','worn')}${field('Other armor','armorOther',{num:1})}</div>
      <p class="note">Max HP adds 25 at every 5th level.</p>
      <div class="row2">${calc('Initiative','init')}${calc('Carry limit','carry')}</div></section>`; },
  combat: () => `
    <section><h2>Death clock</h2><div class="clock">${[1,2,3].map(i => `<button class="tog ${current.death>=i?'on':''}" data-death="${i}">Phase ${i}</button>`).join('')}</div>
      <div class="row2">${toggle('Breather used today','breather')}<button class="btn ghost" data-act="rest">Take a full rest</button></div></section>
    <section><h2>Stacks</h2><div class="stats">${PD.stacks.map(s => stepper(s,'stacks.'+s)).join('')}</div><button class="btn ghost" data-act="clearstacks">Clear all stacks</button></section>
    <section><h2>Resources</h2><div class="stats">${PD.resources.map(s => stepper(s,'resources.'+s)).join('')}</div><button class="btn ghost" data-act="endcombat">End combat: reset rage, fury, and overcharge</button></section>
    <section><h2>Conditions</h2><div class="chips">${PD.conditions.map(s => toggle(s,'conditions.'+s)).join('')}</div></section>
    <section><h2>Tactical deck</h2><div class="stats">${PD.rarities.map(r => stepper(r,'deck.'+r)).join('')}${stepper('Jokers','jokers')}</div>${field('Suit rider','suit',{ph:'Spades, Hearts, Diamonds, or Clubs'})}</section>`,
  gear: () => `
    <section><h2>Equipment</h2>${PD.equipSlots.map((s,i) => `<div class="gear"><b>${s}</b>${field('Item',`equip.${i}.item`)}<div class="row3">${field('Tier',`equip.${i}.tier`,{num:1})}${field('Armor',`equip.${i}.armor`,{num:1})}${field('Condition',`equip.${i}.cond`,{num:1})}</div></div>`).join('')}
      <p class="note">Worn armor adds up into the armor total on Core.</p></section>
    <section><h2>Weapons</h2>${PD.weaponSlots.map((s,i) => `<div class="gear"><b>${s}</b>${field('Item',`weapons.${i}.item`)}<div class="row3">${field('Tier',`weapons.${i}.tier`,{num:1})}${field('AP',`weapons.${i}.ap`,{num:1})}${field('Condition',`weapons.${i}.cond`,{num:1})}</div></div>`).join('')}</section>`,
  abilities: () => { const g = granted(current); const ab = g.filter(i => i.kind === 'ability'), pk = g.filter(i => i.kind === 'perk');
    const bySkill = list => { const m = {}; list.forEach(i => (m[i.skill] ??= []).push(i)); return Object.entries(m).map(([k, l]) => `<h3>${esc(k)}</h3>${l.map(detail).join('')}`).join(''); };
    return `
    <section><h2>Abilities from skills</h2>${ab.length ? bySkill(ab) : '<p class="empty">Train a skill on the Skills tab and its abilities appear here.</p>'}</section>
    <section><h2>Perks from skills</h2>${pk.length ? bySkill(pk) : '<p class="empty">Perks from your skills appear here.</p>'}</section>
    <section><h2>Other abilities and perks</h2><p class="note">For anything not from a skill: items, enchantments, or GM rewards.</p>
      ${current.abilities.map((a,i) => `<div class="gear">${field('Name',`abilities.${i}.name`)}${field('Effect',`abilities.${i}.skill`)}<button class="link" data-del="abilities.${i}">Remove</button></div>`).join('')}
      <button class="btn ghost" data-add="abilities">Add an entry</button></section>`; },
  skills: () => `
    <section class="points"><div class="row3">${calc('Points earned','earned')}${calc('Spent','spent')}${calc('Remaining','left')}</div>
      <p class="note">2 at level 1, +1 each level, +1 bonus at every 5th level${D.races[current.race]?.freeMagicPoint ? ', +1 Avichai magic point' : ''}.</p></section>
    ${['Physical','Mental','Attribute','Other'].map(g => `<section><h2>${g} skills</h2>${D.skills.filter(s => s.group === g).map(d => { const s = current.skills[d.name] || {}; const paths = Object.keys(d.paths);
      return `<div class="skill"><div class="skhead"><b>${esc(d.name)}</b><small>${n(s.base) + n(s.ptier) ? `${n(s.base) + n(s.ptier)} of 8 tiers` : ''}</small></div>
        ${stepper('Base tier','skills.'+d.name+'.base',0,`data-sk="${esc(d.name)}" data-kind="base"`)}
        ${n(s.base) >= 4 ? `${select('Path','skills.'+d.name+'.path',paths,'Choose a path')}${s.path ? stepper(s.path + ' tier','skills.'+d.name+'.ptier',0,`data-sk="${esc(d.name)}" data-kind="path"`) : ''}` : ''}</div>`; }).join('')}</section>`).join('')}`,
  notes: () => { const tc = current.traits.reduce((a, t) => a + n(t.cost), 0);
    return `
    <section><h2>Background traits</h2><p class="note">Chosen at character creation and never changed. Total cost: <b class="${tc > 2 ? 'warn' : ''}">${tc}</b> of 2.</p>
      ${current.traits.map((t,i) => `<div class="gear"><div class="skhead"><b>${esc(t.name)}</b><small>Cost ${esc(t.cost)}</small></div><p class="note">${esc(t.effect)}</p><button class="link" data-del="traits.${i}">Remove trait</button></div>`).join('')}
      <label class="field"><span>Add a trait</span><select id="traitPick"><option value="">Choose a trait</option>${['Physical','Mental','Major'].map(c => `<optgroup label="${c}">${D.traits.filter(t => t.category === c).map(t => `<option value="${esc(t.name)}">${esc(t.name)} (${t.cost})</option>`).join('')}</optgroup>`).join('')}</select></label></section>
    <section><h2>Resistances</h2>${(D.races[current.race]?.resist || []).map(r => `<p class="note">${esc(r)} (racial)</p>`).join('')}<textarea data-p="resist" rows="3">${esc(current.resist)}</textarea></section>
    <section><h2>Inventory</h2><textarea data-p="inventory" rows="6">${esc(current.inventory)}</textarea><p class="note">Carry limit: <b data-d="carry"></b></p></section>
    <section><h2>Notes</h2><textarea data-p="notes" rows="8">${esc(current.notes)}</textarea></section>
    <section><button class="btn danger" data-act="delete">Delete this character</button></section>`; }
};
// ---------- skill changes with notifications ----------
function stepSkill(k, kind, by) {
  const s = current.skills[k] ??= {base:0, path:'', ptier:0};
  const before = totals(current).maxhp;
  if (kind === 'base') {
    const nv = Math.min(4, Math.max(0, n(s.base) + by)); if (nv === n(s.base)) return;
    if (by < 0 && n(s.ptier) > 0) return toast([`Lower ${k}'s path first`, 'Path tiers depend on Base Tier 4.']);
    const items = tierItems(current, k, 'base', by > 0 ? nv : n(s.base)); s.base = nv; if (nv < 4) s.path = '';
    announce(by > 0 ? `${k} Base Tier ${nv}` : `${k} lowered to Base Tier ${nv}`, items, by, before);
  } else {
    const nv = Math.min(4, Math.max(0, n(s.ptier) + by)); if (nv === n(s.ptier)) return;
    const items = tierItems(current, k, 'path', by > 0 ? nv : n(s.ptier)); s.ptier = nv;
    announce(by > 0 ? `${k}: ${s.path} Tier ${nv}` : `${k} lowered to ${s.path} Tier ${nv}`, items, by, before);
  }
  save(); charView(current.id);
}
function announce(head, items, by, hpBefore) {
  const lines = [head, ...items.map(i => (by > 0 ? 'Added ' : 'Removed ') + itemLine(i))];
  const T = totals(current);
  if (T.maxhp !== hpBefore) { if (by > 0 && T.maxhp > hpBefore) current.hpCur = n(current.hpCur) + (T.maxhp - hpBefore); else current.hpCur = Math.min(n(current.hpCur), T.maxhp); lines.push(`Max HP is now ${T.maxhp}`); }
  if (T.earned - T.spent < 0) lines.push(`Over budget by ${T.spent - T.earned} skill point${T.spent - T.earned > 1 ? 's' : ''}`);
  toast(items.length || lines.length > 1 ? lines : [head, 'No new abilities or perks at this tier.']);
}
// ---------- race ----------
function applyRace(r) {
  const race = D.races[r]; if (!race) return;
  const edited = PD.stats.some(s => n(current.stats[s]) !== 0);
  if (edited && !confirm(`Replace base stats and HP with ${r} starting values?`)) return;
  current.hpBase = race.hp; PD.stats.forEach((s, i) => current.stats[s] = race.stats[i]); current.hpCur = totals(current).maxhp;
  toast([`${r} applied`, `HP ${race.hp}, stats ${PD.stats.map((s, i) => `${s} ${race.stats[i] >= 0 ? '+' : ''}${race.stats[i]}`).join(', ')}`, ...(race.armor ? [`+${race.armor} natural armor`] : []), ...(race.choice ? ['Choose your +1 bonuses below'] : []), ...(race.freeMagicPoint ? ['+1 skill point for a magic skill'] : [])]);
}
// ---------- events ----------
document.addEventListener('input', e => {
  if (e.target.id === 'traitPick') return;
  const p = e.target.dataset.p; if (!p || !current) return;
  set(current, p, e.target.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value);
  if (p === 'race') { applyRace(e.target.value); save(); return charView(current.id); }
  save(); refresh();
  if (p.startsWith('trin.')) refresh();
  if (p.endsWith('.path')) { const k = p.split('.')[1]; if (e.target.value) toast([`${k}: ${e.target.value} chosen`, 'Raise its path tier to unlock the path\'s abilities.']); charView(current.id); }
});
document.addEventListener('change', e => {
  if (e.target.id !== 'traitPick' || !e.target.value) return;
  const t = D.traits.find(x => x.name === e.target.value); current.traits.push({...t}); save();
  const fx = traitFx(t); toast([`Trait added: ${t.name}`, t.effect, ...(fx.length ? ['Applied to your stats'] : [])]); charView(current.id);
});
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.open) return charView(d.open, 'core');
  if (d.tab) return charView(current.id, d.tab);
  if (d.sk) return stepSkill(d.sk, d.kind, Number(d.by));
  if (d.s) { const v = n(get(current, d.s)) + Number(d.by); set(current, d.s, Math.max(Number(d.min ?? 0), v)); save(); return charView(current.id); }
  if (d.t) { set(current, d.t, !get(current, d.t)); save(); return charView(current.id); }
  if (d.death) { current.death = current.death >= Number(d.death) ? Number(d.death) - 1 : Number(d.death); save(); return charView(current.id); }
  if (d.add) { current[d.add].push({name:'', skill:''}); save(); return charView(current.id); }
  if (d.del) { const [k, i] = d.del.split('.'); current[k].splice(Number(i), 1); save(); return charView(current.id); }
  if (d.act === 'rest') { current.hpCur = totals(current).maxhp; current.hpTemp = 0; current.stacks = {}; current.death = 0; current.breather = false; save(); toast(['Full rest taken', 'HP restored, stacks cleared, breather ready.']); charView(current.id); }
  if (d.act === 'clearstacks') { current.stacks = {}; save(); charView(current.id); }
  if (d.act === 'endcombat') { ['Rage','Fury','Overcharge'].forEach(r => current.resources[r] = 0); save(); charView(current.id); }
  if (d.act === 'delete' && confirm(`Delete ${current.name || 'this character'}? This can not be undone unless you have a backup.`)) { delete db[current.id]; localStorage.setItem(KEY, JSON.stringify(db)); listView(); }
});
document.addEventListener('submit', e => { if (e.target.id !== 'newForm') return; e.preventDefault(); const c = blank($('#newName').value.trim()); db[c.id] = c; save(); charView(c.id, 'core'); });
$('#backBtn').onclick = () => { localStorage.setItem(KEY, JSON.stringify(db)); listView(); };
$('#menuBtn').onclick = () => $('#menu').showModal();
$('#closeMenu').onclick = () => $('#menu').close();
$('#exportBtn').onclick = () => { const blob = new Blob([JSON.stringify(db, null, 1)], {type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `primordium-characters-${new Date().toISOString().slice(0,10)}.json`; a.click(); };
$('#importFile').onchange = async e => { try { const data = JSON.parse(await e.target.files[0].text()); Object.assign(db, data); localStorage.setItem(KEY, JSON.stringify(db)); $('#menu').close(); listView(); toast([`Imported ${Object.keys(data).length} characters`]); } catch { toast(['That file is not a Primordium backup', 'Choose a file made with Export all characters.']); } };
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
listView();
})();
