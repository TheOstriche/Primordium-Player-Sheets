(() => {
const KEY = 'primordium.characters.v1';
const $ = (s, el = document) => el.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let db = load(); let current = null; let tab = 'core';

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
let saveTimer; function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => localStorage.setItem(KEY, JSON.stringify(db)), 250); }
function blank(name) {
  const c = { id: Date.now().toString(36), name, race: 'Trin', level: 1, xp: 0, marks: 0, stats: {}, hpBase: 40, hpOther: 0, hpCur: 40, hpTemp: 0, armor: 0,
    equip: PD.equipSlots.map(() => ({item:'',tier:'',armor:'',cond:''})), weapons: PD.weaponSlots.map(() => ({item:'',tier:'',ap:'',cond:''})),
    deck: {...PD.startDeck}, jokers: 1, suit: '', stacks: {}, resources: {}, conditions: {}, death: 0, breather: false,
    abilities: [], perks: [], traits: [], resist: '', inventory: '', notes: '', skills: {} };
  PD.stats.forEach(s => c.stats[s] = 0); return c;
}
// ---------- rules ----------
const n = v => Number(v) || 0;
const maxHP = c => n(c.hpBase) + 25 * Math.floor(n(c.level) / 5) + n(c.hpOther);
const xpNext = c => 100 + 25 * (n(c.level) - 1);
const earned = c => n(c.level) + 1 + Math.floor(n(c.level) / 5);
const spent = c => Object.values(c.skills).reduce((a, s) => a + n(s.base) + n(s.ptier), 0);
const derived = {
  maxhp: c => maxHP(c), xpnext: c => xpNext(c), move: c => Math.max(2, 5 + n(c.stats.SPD)) + 'M',
  init: c => 'D10 ' + (n(c.stats.PER) >= 0 ? '+ ' : '- ') + Math.abs(n(c.stats.PER)), carry: c => (10 + n(c.stats.STR)) + ' items',
  earned: c => earned(c), spent: c => spent(c), left: c => earned(c) - spent(c),
  hpbar: c => Math.max(0, Math.min(100, Math.round(100 * n(c.hpCur) / Math.max(1, maxHP(c))))) };
function refresh() {
  if (!current) return;
  document.querySelectorAll('[data-d]').forEach(el => { const v = derived[el.dataset.d](current); if (el.dataset.d === 'hpbar') el.style.width = v + '%'; else el.textContent = v; });
  $('#title').textContent = current.name || 'Unnamed';
}
// ---------- path helpers ----------
const get = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
function set(o, p, v) { const k = p.split('.'); const last = k.pop(); const t = k.reduce((a, x) => a[x] ??= {}, o); t[last] = v; }
// ---------- small builders ----------
const field = (label, path, opts = {}) => `<label class="field ${opts.cls||''}"><span>${label}</span><input ${opts.num?'type="number" inputmode="numeric"':'type="text"'} data-p="${path}" value="${esc(get(current, path))}" ${opts.ph?`placeholder="${opts.ph}"`:''}></label>`;
const stepper = (label, path, min = 0) => `<div class="step"><span>${label}</span><button data-s="${path}" data-by="-1" data-min="${min}" aria-label="Lower ${label}">−</button><output>${n(get(current, path))}</output><button data-s="${path}" data-by="1" aria-label="Raise ${label}">+</button></div>`;
const toggle = (label, path) => `<button class="tog ${get(current, path)?'on':''}" data-t="${path}" aria-pressed="${!!get(current, path)}">${label}</button>`;
const calc = (label, key) => `<div class="calc"><span>${label}</span><b data-d="${key}"></b></div>`;
// ---------- views ----------
function listView() {
  current = null; $('#tabs').hidden = true; $('#backBtn').hidden = true; $('#title').textContent = 'Primordium';
  const chars = Object.values(db).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  $('#view').innerHTML = `<section class="list">
    ${chars.length ? chars.map(c => `<button class="charrow" data-open="${c.id}"><b>${esc(c.name || 'Unnamed')}</b><span>Level ${esc(c.level)} ${esc(c.race)}</span><span class="hp">${esc(c.hpCur)} / ${maxHP(c)} HP</span></button>`).join('')
      : `<p class="empty">No characters yet. Create one to start tracking HP, stacks, gear, and skills at the table.</p>`}
    <form id="newForm" class="newchar"><input id="newName" placeholder="Character name" required><button class="btn">Create character</button></form></section>`;
}
const TABS = [['core','Core'],['combat','Combat'],['gear','Gear'],['abilities','Abilities'],['skills','Skills'],['notes','Notes']];
function charView(id, t = tab) {
  const y = (current && current.id === id && t === tab) ? window.scrollY : 0;
  current = db[id]; tab = t; $('#backBtn').hidden = false; const tb = $('#tabs'); tb.hidden = false;
  tb.innerHTML = TABS.map(([k, l]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('');
  $('#view').innerHTML = views[tab](); refresh(); window.scrollTo(0, y);
}
const views = {
  core: () => `
    <section class="hero">
      <div class="hpline"><button class="big" data-s="hpCur" data-by="-1" data-min="-999" aria-label="Lose 1 HP">−</button>
        <div class="hpnum"><input type="number" inputmode="numeric" data-p="hpCur" value="${esc(current.hpCur)}" aria-label="Current HP"><small>of <b data-d="maxhp"></b> HP</small></div>
        <button class="big" data-s="hpCur" data-by="1" data-min="-999" aria-label="Gain 1 HP">+</button></div>
      <div class="bar"><i data-d="hpbar"></i></div>
      <div class="row3">${field('Temporary HP','hpTemp',{num:1})}${field('Armor','armor',{num:1})}${calc('Movement','move')}</div>
    </section>
    <section><h2>Character</h2>
      <div class="row2">${field('Name','name')}<label class="field"><span>Race</span><select data-p="race">${Object.keys(PD.races).map(r => `<option ${r===current.race?'selected':''}>${r}</option>`).join('')}</select></label></div>
      <div class="row3">${field('Level','level',{num:1})}${field('XP','xp',{num:1})}${calc('XP for next level','xpnext')}</div>
      <div class="row2">${field('Marks','marks',{num:1})}<button class="btn ghost" data-act="race">Apply race stats and HP</button></div></section>
    <section><h2>Stats</h2><div class="stats">${PD.stats.map(s => stepper(PD.statNames[s], 'stats.' + s, -10)).join('')}</div>
      <p class="note">Damage modifier per die: +½ per D4 or D6, +1 per D8 to D12, +2 per D20.</p></section>
    <section><h2>Health</h2><div class="row3">${field('Base HP (race)','hpBase',{num:1})}${field('Other HP','hpOther',{num:1})}${calc('Max HP','maxhp')}</div>
      <p class="note">Max HP adds 25 at every 5th level.</p>
      <div class="row2">${calc('Initiative','init')}${calc('Carry limit','carry')}</div></section>`,
  combat: () => `
    <section><h2>Death clock</h2><div class="clock">${[1,2,3].map(i => `<button class="tog ${current.death>=i?'on':''}" data-death="${i}">Phase ${i}</button>`).join('')}</div>
      <div class="row2">${toggle('Breather used today','breather')}<button class="btn ghost" data-act="rest">Take a full rest</button></div></section>
    <section><h2>Stacks</h2><div class="stats">${PD.stacks.map(s => stepper(s,'stacks.'+s)).join('')}</div>
      <button class="btn ghost" data-act="clearstacks">Clear all stacks</button></section>
    <section><h2>Resources</h2><div class="stats">${PD.resources.map(s => stepper(s,'resources.'+s)).join('')}</div>
      <button class="btn ghost" data-act="endcombat">End combat: reset rage, fury, and overcharge</button></section>
    <section><h2>Conditions</h2><div class="chips">${PD.conditions.map(s => toggle(s,'conditions.'+s)).join('')}</div></section>
    <section><h2>Tactical deck</h2><div class="stats">${PD.rarities.map(r => stepper(r,'deck.'+r)).join('')}${stepper('Jokers','jokers')}</div>
      ${field('Suit rider','suit',{ph:'Spades, Hearts, Diamonds, or Clubs'})}</section>`,
  gear: () => `
    <section><h2>Equipment</h2>${PD.equipSlots.map((s,i) => `<div class="gear"><b>${s}</b>${field('Item',`equip.${i}.item`)}<div class="row3">${field('Tier',`equip.${i}.tier`,{num:1})}${field('Armor',`equip.${i}.armor`,{num:1})}${field('Condition',`equip.${i}.cond`,{num:1})}</div></div>`).join('')}</section>
    <section><h2>Weapons</h2>${PD.weaponSlots.map((s,i) => `<div class="gear"><b>${s}</b>${field('Item',`weapons.${i}.item`)}<div class="row3">${field('Tier',`weapons.${i}.tier`,{num:1})}${field('AP',`weapons.${i}.ap`,{num:1})}${field('Condition',`weapons.${i}.cond`,{num:1})}</div></div>`).join('')}</section>`,
  abilities: () => `
    <section><h2>Abilities</h2>${current.abilities.map((a,i) => `<div class="gear">${field('Name',`abilities.${i}.name`)}<div class="row3">${field('Skill',`abilities.${i}.skill`)}${field('Type',`abilities.${i}.type`,{ph:'Standard'})}<label class="field"><span>Rarity</span><select data-p="abilities.${i}.rarity">${PD.rarities.map(r => `<option ${r===a.rarity?'selected':''}>${r}</option>`).join('')}</select></label></div><button class="link" data-del="abilities.${i}">Remove ability</button></div>`).join('')}
      <button class="btn ghost" data-add="abilities">Add an ability</button></section>
    <section><h2>Perks</h2>${current.perks.map((p,i) => `<div class="gear">${field('Perk and effect',`perks.${i}.text`)}<button class="link" data-del="perks.${i}">Remove perk</button></div>`).join('')}
      <button class="btn ghost" data-add="perks">Add a perk</button></section>`,
  skills: () => `
    <section class="points"><div class="row3">${calc('Points earned','earned')}${calc('Spent','spent')}${calc('Remaining','left')}</div>
      <p class="note">2 at level 1, +1 each level, +1 bonus at every 5th level.</p></section>
    ${PD.skills.map(([g, list]) => `<section><h2>${g} skills</h2>${list.map(([sk,...paths]) => { const s = current.skills[sk] || {};
      return `<div class="skill"><b>${sk}</b>${stepper('Base tier','skills.'+sk+'.base')}${n(s.base)>=4 ? `<label class="field"><span>Path</span><select data-p="skills.${sk}.path"><option value="">Choose a path</option>${paths.map(p => `<option ${p===s.path?'selected':''}>${p}</option>`).join('')}</select></label>${s.path?stepper('Path tier','skills.'+sk+'.ptier'):''}` : ''}</div>`; }).join('')}</section>`).join('')}`,
  notes: () => `
    <section><h2>Background traits</h2>${current.traits.map((t,i) => `<div class="gear"><div class="row2">${field('Trait',`traits.${i}.name`)}${field('Cost',`traits.${i}.cost`,{num:1})}</div>${field('Effect',`traits.${i}.effect`)}<button class="link" data-del="traits.${i}">Remove trait</button></div>`).join('')}
      <button class="btn ghost" data-add="traits">Add a trait</button></section>
    <section><h2>Resistances</h2><textarea data-p="resist" rows="3">${esc(current.resist)}</textarea></section>
    <section><h2>Inventory</h2><textarea data-p="inventory" rows="6">${esc(current.inventory)}</textarea><p class="note">Carry limit: <b data-d="carry"></b></p></section>
    <section><h2>Notes</h2><textarea data-p="notes" rows="8">${esc(current.notes)}</textarea></section>
    <section><button class="btn danger" data-act="delete">Delete this character</button></section>`
};
// ---------- events ----------
document.addEventListener('input', e => {
  const p = e.target.dataset.p; if (!p || !current) return;
  set(current, p, e.target.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value);
  save(); refresh();
  if (p.startsWith('skills.') && p.endsWith('.path')) charView(current.id);
});
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const d = b.dataset;
  if (d.open) return charView(d.open, 'core');
  if (d.tab) return charView(current.id, d.tab);
  if (d.s) { const v = n(get(current, d.s)) + Number(d.by); let max = d.s.startsWith('skills.') ? 4 : Infinity; set(current, d.s, Math.min(max, Math.max(Number(d.min ?? 0), v))); save(); return charView(current.id); }
  if (d.t) { set(current, d.t, !get(current, d.t)); save(); return charView(current.id); }
  if (d.death) { current.death = current.death >= Number(d.death) ? Number(d.death) - 1 : Number(d.death); save(); return charView(current.id); }
  if (d.add) { current[d.add].push(d.add === 'abilities' ? {name:'',skill:'',type:'',rarity:'Basic'} : d.add === 'traits' ? {name:'',cost:'',effect:''} : {text:''}); save(); return charView(current.id); }
  if (d.del) { const [k, i] = d.del.split('.'); current[k].splice(Number(i), 1); save(); return charView(current.id); }
  if (d.act === 'race') { const r = PD.races[current.race]; if (confirm(`Set base HP to ${r[0]} and stats to ${current.race} starting values?`)) { current.hpBase = r[0]; PD.stats.forEach((s, i) => current.stats[s] = r[i + 1]); current.hpCur = maxHP(current); save(); charView(current.id); } }
  if (d.act === 'rest') { current.hpCur = maxHP(current); current.hpTemp = 0; current.stacks = {}; current.death = 0; current.breather = false; save(); charView(current.id); }
  if (d.act === 'clearstacks') { current.stacks = {}; save(); charView(current.id); }
  if (d.act === 'endcombat') { ['Rage','Fury','Overcharge'].forEach(r => current.resources[r] = 0); save(); charView(current.id); }
  if (d.act === 'delete' && confirm(`Delete ${current.name || 'this character'}? This can not be undone unless you have a backup.`)) { delete db[current.id]; localStorage.setItem(KEY, JSON.stringify(db)); listView(); }
});
document.addEventListener('submit', e => { if (e.target.id !== 'newForm') return; e.preventDefault(); const c = blank($('#newName').value.trim()); db[c.id] = c; save(); charView(c.id, 'core'); });
$('#backBtn').onclick = () => { localStorage.setItem(KEY, JSON.stringify(db)); listView(); };
$('#menuBtn').onclick = () => $('#menu').showModal();
$('#closeMenu').onclick = () => $('#menu').close();
$('#exportBtn').onclick = () => { const blob = new Blob([JSON.stringify(db, null, 1)], {type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `primordium-characters-${new Date().toISOString().slice(0,10)}.json`; a.click(); };
$('#importFile').onchange = async e => { try { const data = JSON.parse(await e.target.files[0].text()); Object.assign(db, data); localStorage.setItem(KEY, JSON.stringify(db)); $('#menu').close(); listView(); alert(`Imported ${Object.keys(data).length} characters.`); } catch { alert('That file is not a Primordium backup. Choose a file made with Export all characters.'); } };
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
listView();
})();
