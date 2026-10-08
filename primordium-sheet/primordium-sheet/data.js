// Game data for Primordium 2.0
window.PD = {
  stats: ['STR','AGI','KNO','SPD','PER','SPE'],
  statNames: {STR:'Strength',AGI:'Agility',KNO:'Knowledge',SPD:'Speed',PER:'Perception',SPE:'Speech'},
  races: {Imperios:[30,-1,1,1,1,0,-1],Etherios:[25,-2,2,0,2,0,1],Lyros:[35,-1,0,1,0,1,2],Magnion:[45,1,1,-2,1,1,-2],Asrahelm:[35,2,-2,1,-1,1,-1],
          Uundrahelm:[35,0,-1,2,-1,0,0],Trin:[40,0,0,0,0,0,0],Kled:[55,1,-1,-1,2,0,-2],Druna:[35,-1,1,0,0,1,0],Avichai:[30,0,-2,2,-1,2,-1],Aquilan:[20,-1,2,1,-2,4,-2]},
  rarities: ['Basic','Common','Uncommon','Rare','Epic','Legendary','Mythic'],
  startDeck: {Basic:22,Common:16,Uncommon:8,Rare:4,Epic:2,Legendary:1,Mythic:0},
  stacks: ['Bleed','Flame','Poison','Acid','Frozen','Static','Paralysis','Calm','Anger','Fear'],
  resources: ['Rage','Fury','Overcharge','Soul Shards'],
  conditions: ['Disoriented','Weakened','Silenced','Immobilized','Invisible'],
  equipSlots: ['Head / Neck','Chest','Arms','Legs / Feet','Misc','Misc'],
  weaponSlots: ['Primary','Off-Hand','Shield','Ranged','Ammunition','Misc'],
  skills: [
    ['Physical',[['Sword','Duelist','Soldier'],['Dagger','Assassin','Blade Dancer'],['One Handed Axe','Berserker','Bloodletter'],['Mace','Gladiator','Inquisitor'],['Spear','Sentinel','Dragoon'],['Greatsword','Knight','Paladin'],['Battle Axe','Executioner','Barbarian'],['Warhammer','Warlord','Juggernaut'],['Bow','Marksman','Ranger'],['Crossbow','Machinist','Heavy Infantry'],['Shield','Guardian','Shieldbreaker']]],
    ['Mental',[['Fire Magic','Anarchist','Incineration Mage'],['Frost Magic','Cryomancer','Cryolancer'],['Shock Magic','Storm Mage','Overcharge Caster'],['Soul Rifting','Summoner','Necromage','Soul Caster'],['Sensory Magic','Emotion Smith','Bolster Mage','Illusionist','Mage Breaker'],['Alteration Magic','Battle Alterer','Transmuter','Nature Breaker'],['Restoration Magic','Healer','Warder']]],
    ['Attribute',[['Strength','Brute','Bulwark'],['Agility','Acrobat','Quickhand'],['Knowledge','Scholar','Iron Mind'],['Speed','Charger','Vanguard'],['Perception','Tracker','Watchman'],['Speech','Diplomat','Intimidator'],['Endurance','Ironhide','Survivor']]],
    ['Other',[['Tactics','Gambler','Strategist','Commander'],['Crafting','Smith','Enchanter'],['Roguery','Shadow','Trickster']]]
  ]
};
