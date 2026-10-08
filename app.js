(() => {
const KEY = 'primordium.characters.v1';
const D = window.PRIMORDIUM_DATA;
const SK = Object.fromEntries(D.skills.map(s => [s.name, s]));
const $ = (s, el = document) => el.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const n = v => Number(v) || 0;
const uid = () => Math.random().toString(36).slice(2, 9);
const STATS = PD.stats;
const STATN = {STR:'Strength',AGI:'Agility',KNO:'Knowledge',SPD:'Speed',PER:'Perception',SPE:'Speech'};
const STATK = Object.fromEntries(Object.entries(STATN).map(([k, v]) => [v, k]));
const RAR = PD.rarities;
const MATERIALS = [['Oak',0],['Bronze',0],['Iron',0],['Steel',1],['D-Iron',1],['Silv-Steel',1],['D-Steel',2],['Etherian',2],['Lyran Stone',2],['Glacius',3],['Aurausheen',3],['Mag-Glass',4],['Druiniun',4],['Pitch',5],['PriGlass',6],['PriSteel',7]];
const WEAPONS = ['Sword','Dagger','One Handed Axe','Mace','Spear','Greatsword','Battle Axe','Warhammer','Bow','Crossbow','Staff or Focus','Other'];
const ARMOR_SLOTS = ['Head / Neck','Chest','Arms','Legs / Feet','Shield'];
const DEFAULT_MAP = {Basic:'2 through 6, black 7s',Common:'Red 7s, 8 through 10, black Jacks',Uncommon:'Red Jacks, Queens, black Kings',Rare:'Red Kings, black Aces',Epic:'Red Aces',Legendary:'Joker',Mythic:''};
// Tactics perks that change the deck
const DECK_FX = {'Improved Tactics':{Basic:-4,Common:4,_:'Promote one Basic number to Common'},'Trained Tactics':{Uncommon:-4,Rare:4,_:'Promote one Uncommon number to Rare'},
  'Seasoned Tactics':{Common:-4,Uncommon:4,Rare:-2,Epic:2,_:'Promote one Common number to Uncommon and one Rare color to Epic'},'Wild Card':{Legendary:1,_:'Add the second joker (wild, up to Legendary)'},
  'Focused Training':{Rare:-2,Epic:2,_:'Promote one Rare color to Epic'},'Specialist':{Uncommon:-4,Rare:4,_:'Promote one Uncommon number to Rare'},'Mastery':{Epic:-2,Legendary:2,_:'Promote two Epic cards to Legendary'},
  'Grand Strategy':{Legendary:-1,Mythic:1,_:'Promote the joker to Mythic'},"Officer's Training":{Common:-4,Uncommon:4,_:'Promote one Common number to Uncommon'},'Veteran Command':{Epic:-1,Legendary:1,_:'Promote one Epic card to Legendary'}};
let db = load(); let current = null; let tab = 'overview'; let editList = false; const openGroups = new Set();
const DAMAGING = ['Bleed','Flame','Poison','Acid'];
const has = (c, perk) => granted(c).some(i => i.name === perk);
const startNeed = c => has(c, 'Trained Resilience') ? 3 : 4;
const d4 = () => (crypto.getRandomValues(new Uint32Array(1))[0] % 4) + 1;

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
let saveTimer; function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => localStorage.setItem(KEY, JSON.stringify(db)), 250); }
function saveNow() { clearTimeout(saveTimer); localStorage.setItem(KEY, JSON.stringify(db)); }
function blank(name) {
  const c = { id: Date.now().toString(36), name, race: '', level: 1, xp: 0, marks: 0, stats: {}, hpBase: 40, hpOther: 0, hpCur: 40, hpTemp: 0, armorOther: 0,
    trin: {dmg:'', a:'', b:''}, mode: 'standard', aug: [], death: 0, breather: false, deckMap: {...DEFAULT_MAP}, suit: '',
    items: [], abilities: [], traits: [], resist: '', notes: '', skills: {} };
  STATS.forEach(s => c.stats[s] = 0); return c;
}
function upgrade(c) {  // characters saved by earlier versions
  c.trin ??= {dmg:'', a:'', b:''}; c.armorOther ??= n(c.armor); c.skills ??= {}; c.traits ??= []; c.abilities ??= []; c.mode ??= 'standard';
  c.deckMap ??= {...DEFAULT_MAP};
  if (!c.items) {
    c.items = [];
    (c.equip || []).forEach((e, i) => e.item && c.items.push({id: uid(), name: e.item, desc: '', qty: 1, equipped: true, kind: 'armor', slot: ARMOR_SLOTS[Math.min(i, 3)], weight: 'heavy', material: '', tier: n(e.tier), armor: n(e.armor), cond: e.cond, special: ''}));
    (c.weapons || []).forEach(w => w.item && c.items.push({id: uid(), name: w.item, desc: '', qty: 1, equipped: true, kind: 'weapon', wtype: 'Other', material: '', tier: n(w.tier), ap: n(w.ap), cond: w.cond, special: ''}));
    if (c.inventory) c.items.push({id: uid(), name: 'Pack (from earlier notes)', desc: c.inventory, qty: 1, equipped: false});
  }
  if (!c.aug) {
    c.aug = [];
    for (const [k, v] of Object.entries(c.stacks || {})) if (n(v)) c.aug.push({id: uid(), cat: 'stack', type: k, count: n(v)});
    for (const [k, v] of Object.entries(c.resources || {})) if (n(v)) c.aug.push({id: uid(), cat: 'resource', type: k, count: n(v)});
    for (const [k, v] of Object.entries(c.conditions || {})) if (v) c.aug.push({id: uid(), cat: 'condition', type: k, count: 1});
  }
  for (const k of Object.keys(c.skills)) if (!SK[k]) delete c.skills[k];
  return c;
}
// ---------- what skills grant ----------
function granted(c) {
  const out = [];
  for (const [k, s] of Object.entries(c.skills)) {
    const d = SK[k]; if (!d) continue;
    for (let t = 0; t <= n(s.base); t++) { if (t === 0 && n(s.base) === 0) continue; (d.base[t] || []).forEach(i => out.push({...i, skill: k, tierLabel: t === 0 ? 'Tier 0' : `Base Tier ${t}`})); }
    if (s.path && d.paths[s.path]) for (let t = 1; t <= n(s.ptier); t++) (d.paths[s.path][t] || []).forEach(i => out.push({...i, skill: k, tierLabel: `${s.path} Tier ${t}`}));
  }
  return out;
}
function tierItems(c, k, kind, t) { const d = SK[k], s = c.skills[k] || {}; return kind === 'base' ? [...(t === 1 ? (d.base[0] || []) : []), ...(d.base[t] || [])] : ((d.paths[s.path] || {})[t] || []); }
function traitFx(t) {
  const fx = []; const m = String(t.effect).match(/^([+-]\d+) (Strength|Agility|Knowledge|Speed|Perception|Speech)$/); if (m) fx.push({stat: STATK[m[2]], add: Number(m[1])});
  const h = String(t.effect).match(/^([+-]\d+) HP$/); if (h) fx.push({maxhp: Number(h[1])}); return fx;
}
function deck(c) {
  const d = {}; RAR.forEach(r => d[r] = n(PD.startDeck[r])); const names = new Set(granted(c).filter(i => i.skill === 'Tactics').map(i => i.name));
  for (const [p, fx] of Object.entries(DECK_FX)) if (names.has(p)) for (const [r, v] of Object.entries(fx)) if (r !== '_') d[r] += v;
  return d;
}
function suits(c) { const names = new Set(granted(c).filter(i => i.skill === 'Tactics').map(i => i.name)); if (names.has('Full Deck')) return 'All four suits (double when every card shares a suit)'; return names.has('Suit Mastery') ? (c.suit || 'Choose a suit below') : 'None yet (Tactics Base Tier 2)'; }
// ---------- totals ----------
function totals(c) {
  const st = {}; STATS.forEach(s => st[s] = n(c.stats[s]));
  let hpSkill = 0, armSkill = 0; const hpPer = [];
  if (c.race === 'Trin') { if (c.trin.dmg) st[c.trin.dmg] += 1; for (const x of [c.trin.a, c.trin.b]) if (x === 'HP') hpSkill += 5; else if (x) st[x] += 1; }
  for (const t of c.traits) for (const f of traitFx(t)) { if (f.stat) st[f.stat] += f.add; if (f.maxhp) hpSkill += f.maxhp; }
  for (const i of granted(c)) for (const f of (i.effects || [])) { if (f.stat) st[f.stat] += f.add; if (f.maxhp) hpSkill += f.maxhp; if (f.armor) armSkill += f.armor; if (f.maxhpPerStat) hpPer.push(f); }
  for (const f of hpPer) hpSkill += f.per * Math.max(0, st[f.maxhpPerStat]);
  const race = D.races[c.race] || {};
  const natural = n(race.armor) + armSkill;
  const worn = c.items.filter(i => i.equipped && i.kind === 'armor' && i.slot !== 'Shield').reduce((a, i) => a + n(i.armor), 0);
  const maxhp = n(c.hpBase) + 25 * Math.floor(n(c.level) / 5) + n(c.hpOther) + hpSkill;
  const earned = n(c.level) + 1 + Math.floor(n(c.level) / 5) + (race.freeMagicPoint ? 1 : 0);
  const spent = Object.values(c.skills).reduce((a, s) => a + n(s.base) + n(s.ptier), 0);
  const carryLimit = 10 + st.STR * (granted(c).some(i => i.name === 'Heavy Lifter') ? 2 : 1) + (granted(c).some(i => i.name === 'Heavy Lifter') ? 10 : 0);
  const carried = c.items.filter(i => !i.equipped).reduce((a, i) => a + Math.max(1, n(i.qty)), 0);
  // live combat layer: temporary stat effects, paralysis, weakened
  const live = {...st}; const notes = [];
  for (const a of c.aug) {
    if (a.cat === 'stat') live[a.stat] += n(a.amount);
    if (a.cat === 'stack' && a.type === 'Paralysis') { live.STR -= n(a.count); live.AGI -= n(a.count); }
    if (a.cat === 'condition' && a.type === 'Weakened' && a.stat) live[a.stat] -= Math.abs(n(a.amount));
  }
  const liveCarry = carryLimit + (live.STR - st.STR) * (granted(c).some(i => i.name === 'Heavy Lifter') ? 2 : 1);
  const enc = carried > liveCarry; if (enc) { live.SPD -= 2; notes.push(carried >= 2 * carryLimit ? 'Encumbered: −2 Speed, no running or rolled movement' : 'Encumbered: −2 Speed'); }
  const L = n(c.level);
  for (const a of c.aug) {
    if (a.cat === 'stack' && a.type === 'Frozen') { if (n(a.count) > L) notes.push('Frozen solid: no actions until you recover'); else if (n(a.count) >= 3) notes.push('Chilled: no Defensive abilities; Quick abilities only as Standard on your turn'); }
    if (a.cat === 'stack' && a.type === 'Paralysis' && n(a.count) > L) notes.push('Paralyzed: no actions until you recover');
    if (a.cat === 'stack' && ['Calm','Anger','Fear'].includes(a.type) && n(a.count) > L / 2) notes.push(`${a.type}: roll Knowledge against 1D10 + ${n(a.count)} or be ${({Calm:'calmed',Anger:'enraged',Fear:'terrified'})[a.type]}`);
    if (a.cat === 'condition' && a.type === 'Disoriented') notes.push('Disoriented: abilities cost a card one rarity higher');
    if (a.cat === 'condition' && a.type === 'Silenced') notes.push('Silenced: no magic abilities');
    if (a.cat === 'condition' && a.type === 'Immobilized') notes.push('Immobilized: no movement');
  }
  return { liveCarry, st, live, maxhp, hpSkill, natural, worn, armor: natural + worn + n(c.armorOther), earned, spent, carryLimit, carried, notes };
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
// ---------- helpers ----------
const get = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
function set(o, p, v) { const k = p.split('.'); const last = k.pop(); const t = k.reduce((a, x) => a[x] ??= {}, o); t[last] = v; }
const field = (label, path, o = {}) => `<label class="field"><span>${label}</span><input ${o.num?'type="number" inputmode="numeric"':'type="text"'} data-p="${path}" value="${esc(get(current, path))}" ${o.ph?`placeholder="${o.ph}"`:''}></label>`;
const select = (label, path, opts, blankLabel) => `<label class="field"><span>${label}</span><select data-p="${path}">${blankLabel !== undefined ? `<option value="">${blankLabel}</option>` : ''}${opts.map(o => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(get(current, path) ?? '') === String(v) ? 'selected' : ''}>${esc(t)}</option>`; }).join('')}</select></label>`;
const stat = (label, val, sub = '', boosted = false) => `<div class="calc ${boosted ? 'boosted' : ''}"><span>${label}</span><b>${esc(val)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
const detail = i => `<details class="item"><summary><b>${esc(i.name)}</b><span>${i.kind === 'ability' ? esc(i.type + ' · ' + i.rarity) : esc(i.tierLabel || 'Perk')}</span></summary><p><i>${esc(i.desc)}</i></p><p>${esc(i.usage)}</p></details>`;
const moveText = T => Math.max(2, 5 + T) + 'M';
function stackLine(a) {
  const need = n(a.need) || startNeed(current); const parts = [`Recovers on ${need}+`];
  if (DAMAGING.includes(a.type)) parts.push(`deals ${n(a.count)}D4${has(current, 'Hardy') ? ` − ${n(a.count)} (Hardy, min 1 each)` : ''} at end of phase`);
  if (a.type === 'Paralysis') parts.push(`−${n(a.count)} Strength and Agility`);
  return parts.join(' · ');
}
function recover(id) {
  const a = current.aug.find(x => x.id === id); const need = n(a.need) || startNeed(current); const roll = d4(); const before = n(a.count);
  const ok = roll !== 1 && roll >= need; let removed = 0;
  if (ok) { removed = DAMAGING.includes(a.type) ? Math.max(3, Math.ceil(before / 2)) + (has(current, 'Shrug It Off') ? 1 : 0) : Math.ceil(before / 2); removed = Math.min(before, removed); a.count = before - removed; }
  a.need = Math.max(2, need - 1);
  const lines = [`${a.type} recovery: rolled ${roll}, needed ${need}+`];
  if (ok) lines.push(`Removed ${removed} ${a.type} stack${removed > 1 ? 's' : ''} (${before} → ${a.count})`);
  else lines.push(roll === 1 ? 'A 1 never recovers.' : 'Failed.');
  if (a.count > 0) lines.push(`Next roll needs ${a.need}+`); else lines.push(`${a.type} cleared`);
  if (!a.count) current.aug = current.aug.filter(x => x !== a);
  toast(lines); rerender();
}
const capStack = a => { if (DAMAGING.includes(a.type) && has(current, 'Unyielding Flesh') && n(a.count) > 5) { a.count = 5; toast(['Unyielding Flesh', `${a.type} can not exceed 5 stacks`]); } };
// ---------- list ----------
function listView() {
  current = null; $('#tabs').hidden = true; $('#backBtn').hidden = true; $('#title').textContent = 'Primordium';
  const chars = Object.values(db).map(upgrade).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  $('#view').innerHTML = `<section class="list">
    ${chars.length ? `<div class="listbar"><h2>Characters</h2><button class="link" data-act="editlist">${editList ? 'Done' : 'Edit'}</button></div>` : ''}
    ${chars.length ? chars.map(c => `<div class="charline">${editList ? `<button class="del" data-delchar="${c.id}" aria-label="Delete ${esc(c.name)}">Delete</button>` : ''}<button class="charrow" data-open="${c.id}"><b>${esc(c.name || 'Unnamed')}</b><span>Level ${esc(c.level)} ${esc(c.race || '')}</span><span class="hp">${esc(c.hpCur)} / ${totals(c).maxhp} HP</span></button></div>`).join('')
      : `<p class="empty">No characters yet. Create one to start tracking HP, stacks, gear, and skills at the table.</p>`}
    <form id="newForm" class="newchar"><input id="newName" placeholder="Character name" required><button class="btn">Create character</button></form></section>`;
}
const TABS = [['overview','Overview'],['sheet','Sheet'],['inventory','Inventory'],['abilities','Abilities'],['skills','Skills']];
function charView(id, t = tab) {
  const y = (current && current.id === id && t === tab) ? window.scrollY : 0;
  current = upgrade(db[id]); tab = t; $('#backBtn').hidden = false; const tb = $('#tabs'); tb.hidden = false;
  tb.innerHTML = TABS.map(([k, l]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('');
  $('#view').innerHTML = views[tab](totals(current)); $('#title').textContent = current.name || 'Unnamed'; window.scrollTo(0, y);
}
const rerender = () => { save(); charView(current.id); };
// ---------- views ----------
const equippedList = () => { const eq = current.items.filter(i => i.equipped);
  return eq.length ? eq.map(i => `<div class="eq"><b>${esc(i.name)}</b><span>${i.kind === 'weapon' ? esc(i.wtype || 'Weapon') + ` · Tier ${n(i.tier)}` + (n(i.ap) ? ` · ${n(i.ap)}AP` : '') : esc(i.slot || 'Armor') + (i.slot === 'Shield' ? ` · Tier ${n(i.tier)} (adds to blocks)` : ` · ${n(i.armor)} armor`)}${i.special ? ' · ' + esc(i.special) : ''}</span></div>`).join('') : '<p class="note">Nothing equipped. Equip items on the Inventory tab.</p>'; };
const views = {
  overview: T => {
    const combat = current.mode === 'combat'; const S = T.live;
    const head = `<div class="modebar"><span>${combat ? 'Combat' : 'Standard'}</span><button class="switch ${combat ? 'on' : ''}" data-act="mode" role="switch" aria-checked="${combat}" aria-label="Combat mode"><i></i></button></div>`;
    const hp = `<section class="hero">${combat
      ? `<div class="hpline"><button class="big" data-hp="-1" aria-label="Lose 1 HP">−</button><div class="hpnum"><input type="number" inputmode="numeric" data-p="hpCur" value="${esc(current.hpCur)}" aria-label="Current HP"><small>of ${T.maxhp} HP</small></div><button class="big" data-hp="1" aria-label="Gain 1 HP">+</button></div>`
      : `<div class="hpnum still"><b>${esc(current.hpCur)}</b><small>of ${T.maxhp} HP${n(current.hpTemp) ? ` · ${n(current.hpTemp)} temporary` : ''}</small></div>`}
      <div class="bar"><i style="width:${Math.max(0, Math.min(100, Math.round(100 * n(current.hpCur) / Math.max(1, T.maxhp))))}%"></i></div>
      ${combat ? `<div class="row2">${field('Temporary HP','hpTemp',{num:1})}<div class="clockwrap"><span>Death clock</span><div class="clock">${[1,2,3].map(i => `<button class="pip ${current.death >= i ? 'on' : ''}" data-death="${i}" aria-label="Death clock phase ${i}">${i}</button>`).join('')}</div></div></div>` : ''}
      <div class="row3">${stat('Armor', T.armor)}${stat('Movement', moveText(S.SPD))}${stat('Initiative', 'D10 ' + (S.PER >= 0 ? '+ ' : '- ') + Math.abs(S.PER))}</div></section>`;
    const stats = `<section><h2>Stats</h2><div class="statgrid">${STATS.map(s => `<div class="stat ${S[s] !== T.st[s] ? 'temp' : (T.st[s] !== n(current.stats[s]) ? 'boosted' : '')}"><span>${STATN[s]}</span><b>${S[s]}</b>${combat ? `<div class="adj"><button data-tmp="${s}" data-by="-1" aria-label="Temporarily lower ${STATN[s]}">−</button><small>${S[s] !== T.st[s] ? 'temp' : ''}</small><button data-tmp="${s}" data-by="1" aria-label="Temporarily raise ${STATN[s]}">+</button></div>` : ''}</div>`).join('')}</div>
      ${combat ? '<p class="note">Changes here are temporary and clear when combat ends.</p>' : ''}</section>`;
    const notes = T.notes.length ? `<section class="alerts">${T.notes.map(x => `<p>${esc(x)}</p>`).join('')}</section>` : '';
    const augs = `<section><div class="listbar"><h2>Effects</h2>${combat ? '<button class="btn small" data-act="addaug">+ Add</button>' : ''}</div>
      ${current.aug.length ? current.aug.map(a => `<div class="rec ${a.cat === 'stack' && current.mode === 'combat' ? 'stackrec' : ''}"><div><b>${esc(a.type)}</b><small>${esc({stack:'Stack',resource:'Resource',condition:'Condition',stat:'Stat effect'}[a.cat])}${a.cat === 'stat' ? ` · ${n(a.amount) > 0 ? '+' : ''}${n(a.amount)} ${STATN[a.stat]}` : ''}${a.cat === 'condition' && a.stat ? ` · −${Math.abs(n(a.amount))} ${STATN[a.stat]}` : ''}${a.source ? ' · ' + esc(a.source) : ''}</small>
        ${a.cat === 'stack' ? `<small class="need">${stackLine(a)}</small>` : ''}</div>
        ${combat && a.cat === 'stack' ? `<button class="btn small rec-btn" data-recover="${a.id}" aria-label="Recovery roll for ${esc(a.type)}">Recover</button>` : ''}
        ${combat ? (a.cat === 'stack' || a.cat === 'resource' ? `<div class="mini"><button data-aug="${a.id}" data-by="-1" aria-label="Lower ${esc(a.type)}">−</button><output>${n(a.count)}</output><button data-aug="${a.id}" data-by="1" aria-label="Raise ${esc(a.type)}">+</button></div>` : '') + `<button class="x" data-rmaug="${a.id}" aria-label="Remove ${esc(a.type)}">×</button>` : (a.cat === 'stack' || a.cat === 'resource' ? `<output>${n(a.count)}</output>` : '')}</div>`).join('')
        : `<p class="note">${combat ? 'Add stacks, resources, conditions, and temporary stat effects with + Add.' : 'No active effects.'}</p>`}</section>`;
    if (!combat) return head + hp + stats + notes + augs + `<section><h2>Equipped</h2>${equippedList()}</section>`;
    const g = granted(current); const ab = g.filter(i => i.kind === 'ability').sort((a, b) => RAR.indexOf(a.rarity) - RAR.indexOf(b.rarity) || a.name.localeCompare(b.name));
    const pk = g.filter(i => i.kind === 'perk'); const sel = ab.find(a => a.skill + '|' + a.name === current.abilityPick);
    return head + hp + notes + augs + stats + `
      <section><h2>Abilities</h2>${ab.length ? `<label class="field"><span>Choose an ability</span><select id="abilityPick"><option value="">Select to see its details</option>${RAR.map(r => { const l = ab.filter(a => a.rarity === r); return l.length ? `<optgroup label="${r}">${l.map(a => `<option value="${esc(a.skill + '|' + a.name)}" ${sel === a ? 'selected' : ''}>${esc(a.name)} · ${esc(a.rarity)}</option>`).join('')}</optgroup>` : ''; }).join('')}</select></label>
        ${sel ? `<div class="card"><b>${esc(sel.name)}</b><small>${esc(sel.skill)} · ${esc(sel.type)} · ${esc(sel.rarity)}</small><p><i>${esc(sel.desc)}</i></p><p>${esc(sel.usage)}</p></div>` : ''}` : '<p class="note">Train skills to gain abilities.</p>'}</section>
      <section><details class="perks"><summary><h2>Perks (${pk.length})</h2></summary>${pk.map(detail).join('') || '<p class="note">No perks yet.</p>'}</details></section>
      <section><h2>Deck</h2><div class="decklist">${RAR.map(r => { const d = deck(current)[r]; return d ? `<span><b>${d}</b> ${r}</span>` : ''; }).join('')}</div><p class="note">Suit riders: ${esc(suits(current))}</p></section>
      <section class="actions"><button class="btn ghost" data-act="endcombat">End combat</button><button class="btn ghost" data-act="breather" ${current.breather ? 'disabled' : ''}>${current.breather ? 'Breather used today' : 'Take a breather'}</button><button class="btn" data-act="rest">Full rest</button>
        <p class="note">End combat clears resources, conditions, and temporary stat effects. A breather restores 25% of max HP and clears stacks once per day. A full rest restores everything.</p></section>`;
  },
  sheet: T => { const race = D.races[current.race]; const dk = deck(current); const hasSuit = granted(current).some(i => i.name === 'Suit Mastery');
    return `
    <section><h2>Character</h2>
      <div class="row2">${field('Name','name')}${select('Race','race',Object.keys(D.races),'Choose a race')}</div>
      <div class="row3">${field('Level','level',{num:1})}${field('XP','xp',{num:1})}${stat('XP for next level', 100 + 25 * (n(current.level) - 1))}</div>
      ${field('Marks','marks',{num:1})}
      ${race ? `<div class="racebox"><b>${esc(current.race)}</b><ul>${race.traits.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
      ${current.race === 'Trin' ? `<div class="row3">${select('+1 to','trin.dmg',[['STR','Strength'],['AGI','Agility'],['KNO','Knowledge']],'Choose')}${select('+1 to','trin.a',[['SPD','Speed'],['PER','Perception'],['SPE','Speech'],['HP','+5 HP']],'Choose')}${select('+1 to','trin.b',[['SPD','Speed'],['PER','Perception'],['SPE','Speech'],['HP','+5 HP']],'Choose')}</div>` : ''}</section>
    <section><h2>Base stats</h2><div class="statgrid">${STATS.map(s => `<div class="stat ${T.st[s] !== n(current.stats[s]) ? 'boosted' : ''}"><span>${STATN[s]}</span><b>${T.st[s]}</b><div class="adj"><button data-s="stats.${s}" data-by="-1" aria-label="Lower base ${STATN[s]}">−</button><small>base ${n(current.stats[s])}</small><button data-s="stats.${s}" data-by="1" aria-label="Raise base ${STATN[s]}">+</button></div></div>`).join('')}</div>
      <p class="note">Large numbers include race choices, traits, and skills. Damage modifier per die: +½ per D4 or D6, +1 per D8 to D12, +2 per D20.</p></section>
    <section><h2>Health and armor</h2><div class="row3">${field('Base HP (race)','hpBase',{num:1})}${stat('Skills and traits','+' + T.hpSkill)}${field('Other HP','hpOther',{num:1})}</div>
      <div class="row3">${stat('Max HP', T.maxhp, 'adds 25 every 5th level')}${stat('Natural armor', T.natural)}${field('Other armor','armorOther',{num:1})}</div></section>
    <section><h2>Card assignment</h2><p class="note">Counts include your Tactics promotions. Adjust the cards in each rarity to match.</p>
      ${RAR.map(r => `<div class="maprow"><b>${dk[r]}</b><span>${r}</span><input type="text" data-p="deckMap.${r}" value="${esc(current.deckMap[r] ?? '')}" placeholder="Which cards"></div>`).join('')}
      ${hasSuit && !granted(current).some(i => i.name === 'Full Deck') ? select('Suit Mastery suit','suit',['Spades','Hearts','Diamonds','Clubs'],'Choose a suit') : ''}
      <p class="note">Suit riders: ${esc(suits(current))}</p></section>
    <section><h2>Background traits</h2>${(() => { const tc = current.traits.reduce((a, t) => a + n(t.cost), 0); return `<p class="note">Chosen at creation and never changed. Total cost: <b class="${tc > 2 ? 'warn' : ''}">${tc}</b> of 2.</p>`; })()}
      ${current.traits.map((t, i) => `<div class="rec"><div><b>${esc(t.name)}</b><small>Cost ${esc(t.cost)} · ${esc(t.effect)}</small></div><button class="x" data-del="traits.${i}" aria-label="Remove ${esc(t.name)}">×</button></div>`).join('')}
      <label class="field"><span>Add a trait</span><select id="traitPick"><option value="">Choose a trait</option>${['Physical','Mental','Major'].map(c => `<optgroup label="${c}">${D.traits.filter(t => t.category === c).map(t => `<option value="${esc(t.name)}">${esc(t.name)} (${t.cost})</option>`).join('')}</optgroup>`).join('')}</select></label></section>
    <section><h2>Resistances</h2>${(race?.resist || []).map(r => `<p class="note">${esc(r)} (racial)</p>`).join('')}<textarea data-p="resist" rows="2">${esc(current.resist)}</textarea></section>
    <section><h2>Notes</h2><textarea data-p="notes" rows="6">${esc(current.notes)}</textarea></section>
    <section><button class="btn danger" data-act="delete">Delete this character</button></section>`; },
  inventory: T => {
    const pack = current.items.filter(i => !i.equipped), eq = current.items.filter(i => i.equipped);
    const card = i => `<div class="rec item ${i.equipped ? 'equipped' : ''}"><div><b>${esc(i.name)}${n(i.qty) > 1 ? ' ×' + n(i.qty) : ''}</b><small>${i.equipped ? (i.kind === 'weapon' ? `${esc(i.wtype)} · ${esc(i.material || '')} · Tier ${n(i.tier)}${n(i.ap) ? ' · ' + n(i.ap) + 'AP' : ''}` : `${esc(i.slot)} · ${esc(i.weight || '')} ${esc(i.material || '')} · Tier ${n(i.tier)}${i.slot === 'Shield' ? '' : ' · ' + n(i.armor) + ' armor'}`) + (i.cond !== '' && i.cond != null ? ` · Condition ${esc(i.cond)}` : '') + (i.special ? ' · ' + esc(i.special) : '') : esc(i.desc || '')}</small></div>
      <div class="itembtns"><button class="link" data-equip="${i.id}">${i.equipped ? 'Unequip' : 'Equip'}</button><button class="link" data-edititem="${i.id}">Edit</button><button class="x" data-rmitem="${i.id}" aria-label="Remove ${esc(i.name)}">×</button></div></div>`;
    return `
    <section><div class="listbar"><h2>Equipped</h2></div>${eq.length ? eq.map(card).join('') : '<p class="note">Equip an item from your pack below.</p>'}
      <div class="row2">${stat('Worn armor', T.worn)}${stat('Total armor', T.armor)}</div></section>
    <section><div class="listbar"><h2>Pack</h2><span class="${T.carried > T.liveCarry ? 'warn' : 'note'}">${T.carried} of ${T.liveCarry} items</span></div>
      ${pack.length ? pack.map(card).join('') : '<p class="note">Your pack is empty.</p>'}
      <form id="itemForm" class="additem"><input id="itemName" placeholder="Item name" required><input id="itemDesc" placeholder="Description (optional)"><div class="row2"><input id="itemQty" type="number" inputmode="numeric" min="1" value="1" aria-label="Quantity"><button class="btn">Add item</button></div></form>
      <p class="note">Carrying more than your limit applies −2 Speed automatically.</p></section>`; },
  abilities: () => { const g = granted(current); const ab = g.filter(i => i.kind === 'ability'), pk = g.filter(i => i.kind === 'perk');
    const bySkill = list => { const m = {}; list.forEach(i => (m[i.skill] ??= []).push(i)); return Object.entries(m).map(([k, l]) => `<h3>${esc(k)}</h3>${l.map(detail).join('')}`).join(''); };
    return `
    <section><h2>Abilities from skills</h2>${ab.length ? bySkill(ab) : '<p class="empty">Train a skill on the Skills tab and its abilities appear here.</p>'}</section>
    <section><h2>Perks from skills</h2>${pk.length ? bySkill(pk) : '<p class="empty">Perks from your skills appear here.</p>'}</section>
    <section><h2>Other abilities and perks</h2><p class="note">For anything not from a skill: items, enchantments, or GM rewards.</p>
      ${current.abilities.map((a, i) => `<div class="gear">${field('Name',`abilities.${i}.name`)}${field('Effect',`abilities.${i}.skill`)}<button class="link" data-del="abilities.${i}">Remove</button></div>`).join('')}
      <button class="btn ghost" data-act="addother">Add an entry</button></section>`; },
  skills: T => `
    <section class="points"><div class="row3">${stat('Points earned', T.earned)}${stat('Spent', T.spent)}<div class="calc"><span>Remaining</span><b class="${T.earned - T.spent < 0 ? 'warn' : ''}">${T.earned - T.spent}</b></div></div>
      <p class="note">2 at level 1, +1 each level, +1 bonus at every 5th level${D.races[current.race]?.freeMagicPoint ? ', +1 Avichai magic point' : ''}.</p></section>
    ${['Physical','Mental','Attribute','Other'].map(g => { const list = D.skills.filter(s => s.group === g); const tiers = list.reduce((a, d) => a + n(current.skills[d.name]?.base) + n(current.skills[d.name]?.ptier), 0);
      return `<section><details class="group" data-group="${g}" ${openGroups.has(g) ? 'open' : ''}><summary><h2>${g} skills</h2><span>${tiers ? tiers + ' tier' + (tiers > 1 ? 's' : '') : list.length + ' skills'}</span></summary>${list.map(d => { const s = current.skills[d.name] || {}; const paths = Object.keys(d.paths);
      return `<div class="skill"><div class="skhead"><b>${esc(d.name)}</b><small>${n(s.base) + n(s.ptier) ? `${n(s.base) + n(s.ptier)} of 8 tiers` : ''}</small></div>
        <div class="step"><span>Base tier</span><button data-sk="${esc(d.name)}" data-kind="base" data-by="-1" aria-label="Lower ${esc(d.name)}">−</button><output>${n(s.base)}</output><button data-sk="${esc(d.name)}" data-kind="base" data-by="1" aria-label="Raise ${esc(d.name)}">+</button></div>
        ${n(s.base) >= 4 ? `${select('Path','skills.' + d.name + '.path', paths, 'Choose a path')}${s.path ? `<div class="step"><span>${esc(s.path)} tier</span><button data-sk="${esc(d.name)}" data-kind="path" data-by="-1" aria-label="Lower ${esc(s.path)}">−</button><output>${n(s.ptier)}</output><button data-sk="${esc(d.name)}" data-kind="path" data-by="1" aria-label="Raise ${esc(s.path)}">+</button></div>` : ''}` : ''}</div>`; }).join('')}</details></section>`; }).join('')}`
};
// ---------- skills ----------
function stepSkill(k, kind, by) {
  const s = current.skills[k] ??= {base: 0, path: '', ptier: 0};
  const T0 = totals(current), deck0 = deck(current); let head, items;
  if (kind === 'base') {
    const nv = Math.min(4, Math.max(0, n(s.base) + by)); if (nv === n(s.base)) return;
    if (by < 0 && n(s.ptier) > 0) return toast([`Lower ${k}'s path first`, 'Path tiers depend on Base Tier 4.']);
    items = tierItems(current, k, 'base', by > 0 ? nv : n(s.base)); s.base = nv; if (nv < 4) s.path = '';
    head = by > 0 ? `${k} Base Tier ${nv}` : `${k} lowered to Base Tier ${nv}`;
  } else {
    const nv = Math.min(4, Math.max(0, n(s.ptier) + by)); if (nv === n(s.ptier)) return;
    items = tierItems(current, k, 'path', by > 0 ? nv : n(s.ptier)); s.ptier = nv;
    head = by > 0 ? `${k}: ${s.path} Tier ${nv}` : `${k} lowered to ${s.path} Tier ${nv}`;
  }
  const lines = [head, ...items.map(i => (by > 0 ? 'Added ' : 'Removed ') + itemLine(i))];
  const T = totals(current), deck1 = deck(current);
  if (T.maxhp !== T0.maxhp) { current.hpCur = by > 0 ? n(current.hpCur) + (T.maxhp - T0.maxhp) : Math.min(n(current.hpCur), T.maxhp); lines.push(`Max HP is now ${T.maxhp}`); }
  const dchg = RAR.filter(r => deck1[r] !== deck0[r]).map(r => `${r} ${deck0[r]} → ${deck1[r]}`);
  if (dchg.length) { const fx = items.map(i => DECK_FX[i.name]?._).filter(Boolean); lines.push(`Deck: ${dchg.join(', ')}`); if (by > 0 && fx.length) lines.push(fx.join('; ') + ' in your card assignment'); }
  if (T.earned - T.spent < 0) lines.push(`Over budget by ${T.spent - T.earned} skill point${T.spent - T.earned > 1 ? 's' : ''}`);
  toast(lines.length > 1 ? lines : [head, 'No new abilities or perks at this tier.']); rerender();
}
function applyRace(r) {
  const race = D.races[r]; if (!race) return;
  if (STATS.some(s => n(current.stats[s]) !== 0) && !confirm(`Replace base stats and HP with ${r} starting values?`)) return;
  current.hpBase = race.hp; STATS.forEach((s, i) => current.stats[s] = race.stats[i]); current.hpCur = totals(current).maxhp;
  toast([`${r} applied`, `HP ${race.hp}, stats ${STATS.map((s, i) => `${s} ${race.stats[i] >= 0 ? '+' : ''}${race.stats[i]}`).join(', ')}`, ...(race.armor ? [`+${race.armor} natural armor`] : []), ...(race.choice ? ['Choose your +1 bonuses below'] : []), ...(race.freeMagicPoint ? ['+1 skill point for a magic skill'] : [])]);
}
// ---------- bottom sheet: effects and items ----------
const sheet = $('#sheet');
function openSheet(html) { sheet.innerHTML = `<div class="sheetbody">${html}</div>`; if (!sheet.open) sheet.showModal(); }
function augStep(step, data = {}) {
  if (step === 1) return openSheet(`<h2>Add an effect</h2><div class="choices">${[['stack','Stack'],['resource','Resource'],['condition','Condition'],['stat','Stat effect']].map(([k, l]) => `<button class="choice" data-augcat="${k}">${l}</button>`).join('')}</div><button class="btn ghost" data-act="closesheet">Cancel</button>`);
  if (step === 2) {
    const list = {stack: PD.stacks, resource: PD.resources, condition: PD.conditions}[data.cat];
    if (data.cat === 'stat') return openSheet(`<h2>Stat effect</h2><form id="statForm"><label class="field"><span>Stat</span><select name="stat">${STATS.map(s => `<option value="${s}">${STATN[s]}</option>`).join('')}</select></label><label class="field"><span>Amount (use − for a penalty)</span><input name="amount" type="number" inputmode="numeric" value="1"></label><label class="field"><span>Source</span><input name="source" placeholder="For example Courage or Rally"></label><button class="btn">Add effect</button></form><button class="btn ghost" data-act="closesheet">Cancel</button>`);
    return openSheet(`<h2>Choose a ${data.cat}</h2><div class="choices">${list.map(t => `<button class="choice" data-augtype="${esc(t)}" data-cat="${data.cat}">${esc(t)}</button>`).join('')}</div><button class="btn ghost" data-act="closesheet">Cancel</button>`);
  }
  if (step === 3) return openSheet(`<h2>Weakened</h2><form id="weakForm"><label class="field"><span>Stat reduced</span><select name="stat">${STATS.map(s => `<option value="${s}">${STATN[s]}</option>`).join('')}</select></label><label class="field"><span>Reduced by</span><input name="amount" type="number" inputmode="numeric" value="1" min="1"></label><button class="btn">Add condition</button></form><button class="btn ghost" data-act="closesheet">Cancel</button>`);
}
function addAug(rec) {
  const same = current.aug.find(a => a.cat === rec.cat && a.type === rec.type && (rec.cat === 'stack' || rec.cat === 'resource'));
  let r = same; if (same) same.count = n(same.count) + n(rec.count); else { r = {id: uid(), count: 1, ...rec}; current.aug.push(r); }
  if (r.cat === 'stack') { r.need = startNeed(current); capStack(r); }
  sheet.close(); const T = totals(current);
  toast([`${rec.type} added`, ...(rec.cat === 'stat' ? [`${n(rec.amount) > 0 ? '+' : ''}${n(rec.amount)} ${STATN[rec.stat]} until combat ends`] : []), ...(rec.type === 'Paralysis' ? ['−1 Strength and Agility per stack'] : []), ...(rec.type === 'Weakened' ? [`−${Math.abs(n(rec.amount))} ${STATN[rec.stat]}`] : []), ...T.notes.slice(-1)]);
  rerender();
}
function itemSheet(id) {
  const it = current.items.find(i => i.id === id); const k = it.kind || '';
  const opt = (v, cur) => `<option ${String(v) === String(cur ?? '') ? 'selected' : ''}>${esc(v)}</option>`;
  openSheet(`<h2>${it.equipped || it.kind ? 'Edit' : 'Equip'} ${esc(it.name)}</h2><form id="equipForm" data-id="${id}">
    <label class="field"><span>Name</span><input name="name" value="${esc(it.name)}"></label>
    <label class="field"><span>Kind</span><select name="kind" id="kindPick"><option value="">Choose</option>${['armor','weapon'].map(v => `<option value="${v}" ${v === k ? 'selected' : ''}>${v === 'armor' ? 'Armor or shield' : 'Weapon'}</option>`).join('')}</select></label>
    ${k === 'armor' ? `<div class="row2"><label class="field"><span>Slot</span><select name="slot">${ARMOR_SLOTS.map(v => opt(v, it.slot)).join('')}</select></label><label class="field"><span>Weight</span><select name="weight">${['light','heavy'].map(v => opt(v, it.weight || 'heavy')).join('')}</select></label></div>` : ''}
    ${k === 'weapon' ? `<label class="field"><span>Weapon type</span><select name="wtype">${WEAPONS.map(v => opt(v, it.wtype)).join('')}</select></label>` : ''}
    ${k ? `<div class="row2"><label class="field"><span>Material (sets tier)</span><select name="material" id="matPick"><option value="">Choose</option>${MATERIALS.map(([m, t]) => `<option value="${m}" data-tier="${t}" ${m === it.material ? 'selected' : ''}>${m} (Tier ${t})</option>`).join('')}</select></label><label class="field"><span>Tier</span><input name="tier" id="tierBox" type="number" inputmode="numeric" value="${esc(it.tier ?? 0)}"></label></div>
      <div class="row2">${k === 'armor' ? `<label class="field"><span>Armor value</span><input name="armor" type="number" inputmode="numeric" value="${esc(it.armor ?? '')}" placeholder="Shield: leave blank"></label>` : `<label class="field"><span>AP</span><input name="ap" type="number" inputmode="numeric" value="${esc(it.ap ?? '')}"></label>`}<label class="field"><span>Condition</span><input name="cond" type="number" inputmode="numeric" value="${esc(it.cond ?? '')}"></label></div>
      <label class="field"><span>Enchantments or special effects</span><input name="special" value="${esc(it.special || '')}" placeholder="For example Flame Brand, rank 1"></label>
      ${k === 'weapon' ? '<p class="note">A weapon adds its tier to one strike per attack.</p>' : '<p class="note">Shields add their tier to block rolls. Worn armor adds into your armor total.</p>'}` : ''}
    <label class="field"><span>Description</span><input name="desc" value="${esc(it.desc || '')}"></label>
    <button class="btn">${it.equipped ? 'Save' : 'Equip'}</button></form><button class="btn ghost" data-act="closesheet">Cancel</button>`);
}
// ---------- events ----------
document.addEventListener('input', e => {
  if (['traitPick','abilityPick','kindPick','matPick'].includes(e.target.id)) return;
  if (e.target.closest('#sheet')) return;
  const p = e.target.dataset.p; if (!p || !current) return;
  set(current, p, e.target.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value);
  if (p === 'race') { applyRace(e.target.value); return rerender(); }
  save();
  if (p.endsWith('.path')) { const k = p.split('.')[1]; if (e.target.value) toast([`${k}: ${e.target.value} chosen`, 'Raise its path tier to unlock the path\'s abilities.']); return charView(current.id); }
  if (['level','hpBase','hpOther','armorOther','trin.dmg','trin.a','trin.b','hpCur'].includes(p) || p.startsWith('trin.')) { if (e.target.tagName === 'SELECT') charView(current.id); }
});
document.addEventListener('change', e => {
  const id = e.target.id;
  if (id === 'traitPick' && e.target.value) { const t = D.traits.find(x => x.name === e.target.value); current.traits.push({...t}); toast([`Trait added: ${t.name}`, t.effect, ...(traitFx(t).length ? ['Applied to your stats'] : [])]); return rerender(); }
  if (id === 'abilityPick') { current.abilityPick = e.target.value; return rerender(); }
  if (id === 'kindPick') { const f = $('#equipForm'); const it = current.items.find(i => i.id === f.dataset.id); it.kind = e.target.value; return itemSheet(it.id); }
  if (id === 'matPick') { const o = e.target.selectedOptions[0]; if (o?.dataset.tier !== undefined) $('#tierBox').value = o.dataset.tier; return; }
  if (e.target.dataset.p && ['level','hpBase','hpOther','armorOther','hpCur','hpTemp'].includes(e.target.dataset.p)) charView(current.id);
});
document.addEventListener('submit', e => {
  e.preventDefault(); const f = e.target; const fd = Object.fromEntries(new FormData(f));
  if (f.id === 'newForm') { const c = blank($('#newName').value.trim()); db[c.id] = c; saveNow(); return charView(c.id, 'sheet'); }
  if (f.id === 'itemForm') { current.items.push({id: uid(), name: $('#itemName').value.trim(), desc: $('#itemDesc').value.trim(), qty: Math.max(1, n($('#itemQty').value)), equipped: false}); toast([`Added to pack: ${$('#itemName').value.trim()}`]); return rerender(); }
  if (f.id === 'statForm') return addAug({cat: 'stat', type: `${STATN[fd.stat]} ${n(fd.amount) > 0 ? '+' : ''}${n(fd.amount)}`, stat: fd.stat, amount: n(fd.amount), source: fd.source});
  if (f.id === 'weakForm') return addAug({cat: 'condition', type: 'Weakened', stat: fd.stat, amount: Math.abs(n(fd.amount))});
  if (f.id === 'equipForm') {
    const it = current.items.find(i => i.id === f.dataset.id); const wasEq = it.equipped;
    Object.assign(it, {name: fd.name || it.name, kind: fd.kind, slot: fd.slot, weight: fd.weight, wtype: fd.wtype, material: fd.material, tier: n(fd.tier), armor: fd.armor === '' ? '' : n(fd.armor), ap: fd.ap === '' ? '' : n(fd.ap), cond: fd.cond === '' ? '' : n(fd.cond), special: fd.special, desc: fd.desc});
    if (!fd.kind) { toast(['Choose armor or weapon to equip it']); return itemSheet(it.id); }
    it.equipped = true; sheet.close(); toast([wasEq ? `Saved ${it.name}` : `Equipped ${it.name}`, it.kind === 'armor' && it.slot !== 'Shield' ? `Armor is now ${totals(current).armor}` : `Tier ${it.tier}`]); return rerender();
  }
});
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.open) return charView(d.open, 'overview');
  if (d.delchar) { const c = db[d.delchar]; if (confirm(`Delete ${c.name || 'this character'}? This can not be undone unless you have a backup.`)) { delete db[d.delchar]; saveNow(); toast([`Deleted ${c.name || 'character'}`]); } return listView(); }
  if (d.act === 'editlist') { editList = !editList; return listView(); }
  if (d.tab) return charView(current.id, d.tab);
  if (d.sk) return stepSkill(d.sk, d.kind, Number(d.by));
  if (d.s) { set(current, d.s, n(get(current, d.s)) + Number(d.by)); return rerender(); }
  if (d.hp) { current.hpCur = n(current.hpCur) + Number(d.hp); return rerender(); }
  if (d.tmp) { let r = current.aug.find(a => a.cat === 'stat' && a.stat === d.tmp && a.source === 'Quick adjust');
    if (!r) { r = {id: uid(), cat: 'stat', stat: d.tmp, amount: 0, source: 'Quick adjust'}; current.aug.push(r); }
    r.amount = n(r.amount) + Number(d.by); r.type = `${STATN[d.tmp]} ${r.amount > 0 ? '+' : ''}${r.amount}`; if (!r.amount) current.aug = current.aug.filter(a => a !== r); return rerender(); }
  if (d.recover) return recover(d.recover);
  if (d.aug) { const a = current.aug.find(x => x.id === d.aug); a.count = Math.max(0, n(a.count) + Number(d.by)); if (a.cat === 'stack' && Number(d.by) > 0) { a.need = startNeed(current); capStack(a); } if (!a.count) current.aug = current.aug.filter(x => x !== a); return rerender(); }
  if (d.rmaug) { current.aug = current.aug.filter(x => x.id !== d.rmaug); return rerender(); }
  if (d.death) { current.death = current.death >= Number(d.death) ? Number(d.death) - 1 : Number(d.death); return rerender(); }
  if (d.del) { const [k, i] = d.del.split('.'); current[k].splice(Number(i), 1); return rerender(); }
  if (d.equip) { const it = current.items.find(i => i.id === d.equip); if (it.equipped) { it.equipped = false; toast([`Unequipped ${it.name}`, 'Moved to your pack']); return rerender(); } return itemSheet(it.id); }
  if (d.edititem) { const it = current.items.find(i => i.id === d.edititem); if (it.equipped) return itemSheet(it.id);
    return openSheet(`<h2>Edit ${esc(it.name)}</h2><form id="packForm" data-id="${it.id}"><label class="field"><span>Name</span><input name="name" value="${esc(it.name)}"></label><label class="field"><span>Description</span><input name="desc" value="${esc(it.desc || '')}"></label><label class="field"><span>Quantity</span><input name="qty" type="number" inputmode="numeric" value="${n(it.qty) || 1}"></label><button class="btn">Save</button></form><button class="btn ghost" data-act="closesheet">Cancel</button>`); }
  if (d.rmitem) { const it = current.items.find(i => i.id === d.rmitem); if (confirm(`Remove ${it.name}?`)) { current.items = current.items.filter(i => i !== it); return rerender(); } return; }
  if (d.augcat) return d.augcat === 'stat' ? augStep(2, {cat: 'stat'}) : augStep(2, {cat: d.augcat});
  if (d.augtype) return d.augtype === 'Weakened' ? augStep(3) : addAug({cat: d.cat, type: d.augtype, count: 1});
  switch (d.act) {
    case 'mode': current.mode = current.mode === 'combat' ? 'standard' : 'combat'; return rerender();
    case 'addaug': return augStep(1);
    case 'closesheet': return sheet.close();
    case 'addother': current.abilities.push({name: '', skill: ''}); return rerender();
    case 'endcombat': current.aug = current.aug.filter(a => a.cat === 'stack'); current.death = 0; toast(['Combat ended', 'Resources, conditions, and temporary stat effects cleared. Stacks remain until treated.']); return rerender();
    case 'breather': { const T = totals(current); current.hpCur = Math.min(T.maxhp, n(current.hpCur) + Math.floor(T.maxhp / 4)); current.aug = current.aug.filter(a => a.cat !== 'stack'); current.breather = true; toast(['Breather taken', `+${Math.floor(T.maxhp / 4)} HP, stacks cleared. Recover 8 cards from your discard pile.`]); return rerender(); }
    case 'rest': current.hpCur = totals(current).maxhp; current.hpTemp = 0; current.aug = []; current.death = 0; current.breather = false; current.mode = 'standard'; toast(['Full rest taken', 'HP restored, effects cleared, deck reshuffled, breather ready.']); return rerender();
    case 'delete': if (confirm(`Delete ${current.name || 'this character'}? This can not be undone unless you have a backup.`)) { delete db[current.id]; saveNow(); listView(); } return;
  }
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'packForm') return; const fd = Object.fromEntries(new FormData(e.target)); const it = current.items.find(i => i.id === e.target.dataset.id);
  Object.assign(it, {name: fd.name || it.name, desc: fd.desc, qty: Math.max(1, n(fd.qty))}); sheet.close(); rerender();
});
$('#backBtn').onclick = () => { saveNow(); listView(); };
$('#menuBtn').onclick = () => $('#menu').showModal();
$('#closeMenu').onclick = () => $('#menu').close();
$('#exportBtn').onclick = () => { const blob = new Blob([JSON.stringify(db, null, 1)], {type: 'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `primordium-characters-${new Date().toISOString().slice(0, 10)}.json`; a.click(); };
$('#importFile').onchange = async e => { try { const data = JSON.parse(await e.target.files[0].text()); Object.assign(db, data); saveNow(); $('#menu').close(); listView(); toast([`Imported ${Object.keys(data).length} characters`]); } catch { toast(['That file is not a Primordium backup', 'Choose a file made with Export all characters.']); } };
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
document.addEventListener('toggle', e => { const g = e.target.dataset?.group; if (!g) return; e.target.open ? openGroups.add(g) : openGroups.delete(g); }, true);
listView();
})();
