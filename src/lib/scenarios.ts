/**
 * @what - Single source of truth for all scenario metadata (frontend-side)
 * @why - Prevents drift across app.astro, session.astro, liveSession.ts, summary.ts
 * @exports - SCENARIOS_ARRAY, SCENARIO_IDS, PRESET_CHARACTER_NAMES, CALL_LABELS, SCENARIO_SUMMARY_META
 */

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ScenarioPreset {
  topic: string;
  userRole: string;
  characterName: string;
  historicalSetting: string;
  year: string;
  context: string;
  voiceName: string;
  colorPalette: string[];
}

interface ScenarioSummaryMeta {
  title: string;
  role: string;
  summaryFacts: string[];
  actualOutcome: string;
  relatedScenarios: string[];
}

export interface ScenarioInfo {
  id: string;
  person: string;
  era: string;
  teaser: string;
  avatarUrl?: string;
  sceneUrl?: string;
  preset: ScenarioPreset;
}

// ─── Scenario Data ──────────────────────────────────────────────────────────────

export const SCENARIOS_ARRAY: ScenarioInfo[] = [
  {
    id: 'constantinople-1453', person: 'Constantine XI', era: 'Constantinople, 1453', teaser: 'The walls are falling.',
    avatarUrl: '/presets/avatar-constantine.webp', sceneUrl: '/presets/scene-constantinople.webp',
    preset: { topic: 'Fall of Constantinople 1453', userRole: "Emperor's last advisor", characterName: 'CONSTANTINE XI', historicalSetting: 'Constantinople, Byzantine Empire', year: '1453', context: "Mehmed II's Ottoman army has surrounded the city. The harbor chain is your last defense. The walls — unbreached for 1,000 years — are failing. The emperor needs your counsel.", voiceName: 'Achird', colorPalette: ['oklch(12% 0.04 35)', 'oklch(16% 0.04 35)', 'oklch(65% 0.22 35)', 'oklch(88% 0.03 60)', 'oklch(40% 0.04 35)'] },
  },
  {
    id: 'moon-landing-1969', person: 'Gene Kranz', era: 'Apollo 11, 1969', teaser: '25 seconds of fuel.',
    avatarUrl: '/presets/avatar-kranz.webp', sceneUrl: '/presets/scene-apollo.webp',
    preset: { topic: 'Apollo 11 Moon Landing 1969', userRole: 'Student on the line with Mission Control', characterName: 'GENE KRANZ', historicalSetting: 'NASA Mission Control, Houston', year: '1969', context: 'Eagle has only 25 seconds of fuel. The landing site is boulder-strewn. Armstrong is flying manually. You have one call to make — abort or land.', voiceName: 'Charon', colorPalette: ['oklch(10% 0.02 240)', 'oklch(14% 0.02 240)', 'oklch(60% 0.18 240)', 'oklch(90% 0.02 200)', 'oklch(35% 0.03 240)'] },
  },
  {
    id: 'mongol-empire-1206', person: 'Jamukha', era: 'Mongol Steppe, 1206', teaser: 'The khan rides.',
    avatarUrl: '/presets/avatar-jamukha.webp', sceneUrl: '/presets/scene-mongol.webp',
    preset: { topic: 'Rise of the Mongol Empire 1206', userRole: "Rival tribe leader's envoy", characterName: 'JAMUKHA', historicalSetting: 'Mongolian Steppe', year: '1206', context: "Temüjin has united the steppe tribes and taken the name Genghis Khan. Jamukha — his blood brother turned rival — is weighing his final move.", voiceName: 'Charon', colorPalette: ['oklch(11% 0.03 60)', 'oklch(15% 0.03 60)', 'oklch(62% 0.20 60)', 'oklch(88% 0.04 80)', 'oklch(38% 0.03 60)'] },
  },
  {
    id: 'cleopatra-tarsus', person: 'Cleopatra VII', era: 'Tarsus, 41 BC', teaser: 'The golden barge arrives.',
    avatarUrl: '/presets/avatar-cleopatra.webp', sceneUrl: '/presets/scene-cleopatra.webp',
    preset: { topic: 'Cleopatra meets Antony at Tarsus 41 BC', userRole: 'A stranger from the future', characterName: 'CLEOPATRA VII', historicalSetting: 'Tarsus, Roman Cilicia', year: '41 BC', context: 'Mark Antony has summoned Cleopatra to answer for her role in the civil war. She arrives not as a supplicant but as a queen — on a golden barge with purple sails.', voiceName: 'Aoede', colorPalette: ['oklch(10% 0.03 250)', 'oklch(14% 0.04 250)', 'oklch(68% 0.18 70)', 'oklch(90% 0.02 60)', 'oklch(35% 0.03 250)'] },
  },
  {
    id: 'joan-rouen', person: 'Joan of Arc', era: 'Rouen, 1431', teaser: 'The trial begins.',
    avatarUrl: '/presets/avatar-joan.webp', sceneUrl: '/presets/scene-rouen.webp',
    preset: { topic: 'Trial of Joan of Arc at Rouen 1431', userRole: 'A witness at the trial', characterName: 'JOAN OF ARC', historicalSetting: 'Rouen, English-occupied France', year: '1431', context: 'Joan has been captured, sold to the English, and put on trial for heresy. She is 19. She led armies at 17. Now she faces 70 judges.', voiceName: 'Zephyr', colorPalette: ['oklch(10% 0.02 30)', 'oklch(14% 0.02 30)', 'oklch(62% 0.20 30)', 'oklch(88% 0.03 50)', 'oklch(38% 0.03 30)'] },
  },
  {
    id: 'davinci-milan', person: 'Leonardo da Vinci', era: 'Milan, 1490', teaser: 'The notebooks are open.',
    avatarUrl: '/presets/avatar-leonardo.webp', sceneUrl: '/presets/scene-milan.webp',
    preset: { topic: 'Leonardo da Vinci in Milan 1490', userRole: 'A curious apprentice', characterName: 'LEONARDO DA VINCI', historicalSetting: 'Milan, under Ludovico Sforza', year: '1490', context: 'Leonardo is painting The Last Supper, designing war machines, dissecting corpses at night, and filling notebooks with mirror-writing. He never finishes anything.', voiceName: 'Enceladus', colorPalette: ['oklch(12% 0.03 50)', 'oklch(16% 0.04 50)', 'oklch(60% 0.16 50)', 'oklch(88% 0.03 40)', 'oklch(36% 0.03 50)'] },
  },
  {
    id: 'tesla-nyc', person: 'Nikola Tesla', era: 'New York, 1901', teaser: 'The tower will change everything.',
    avatarUrl: '/presets/avatar-tesla.webp', sceneUrl: '/presets/scene-tesla.webp',
    preset: { topic: 'Nikola Tesla and Wardenclyffe Tower 1901', userRole: 'A visiting journalist', characterName: 'NIKOLA TESLA', historicalSetting: 'New York City and Long Island', year: '1901', context: 'Tesla is building Wardenclyffe Tower — a facility meant to transmit wireless energy across the Atlantic. He has 300 patents, a feud with Edison, and a vision no one else can see.', voiceName: 'Algenib', colorPalette: ['oklch(9% 0.04 270)', 'oklch(13% 0.05 270)', 'oklch(65% 0.22 270)', 'oklch(90% 0.02 250)', 'oklch(35% 0.04 270)'] },
  },
  {
    id: 'bolivar-angostura-1819', person: 'Simón Bolívar', era: 'Angostura, 1819', teaser: 'Six countries in one speech.',
    avatarUrl: '/presets/avatar-bolivar.webp', sceneUrl: '/presets/scene-angostura.webp',
    preset: { topic: 'The Angostura Address 1819', userRole: 'A journalist from the future', characterName: 'SIMÓN BOLÍVAR', historicalSetting: 'Angostura, Venezuela', year: '1819', context: 'Bolívar has just delivered the speech proposing a unified republic for six nations. In five months he will cross the flooded Andes in the rainy season with 2,500 men. He is 35, has been exiled twice, and is in a very good mood.', voiceName: 'Enceladus', colorPalette: ['oklch(11% 0.05 75)', 'oklch(17% 0.07 75)', 'oklch(64% 0.19 75)', 'oklch(90% 0.04 65)', 'oklch(38% 0.12 75)'] },
  },
];

// ─── Derived Exports ────────────────────────────────────────────────────────────

export const SCENARIO_IDS: string[] = SCENARIOS_ARRAY.map((s) => s.id);

export const PRESET_CHARACTER_NAMES: Record<string, string> = Object.fromEntries(
  SCENARIOS_ARRAY.map((s) => [s.id, s.preset.characterName]),
);

/** Maps scenarioId → "character · era" string for call screen header */
export const CALL_LABELS: Record<string, string> = Object.fromEntries(
  SCENARIOS_ARRAY.map((s) => [s.id, `${s.person.toLowerCase()} · ${s.era.toLowerCase()}`]),
);

// ─── Summary Metadata ───────────────────────────────────────────────────────────

export const SCENARIO_SUMMARY_META: Record<string, ScenarioSummaryMeta> = {
  'constantinople-1453': {
    title: 'Fall of Constantinople', role: "Emperor's advisor",
    summaryFacts: ['Mehmed II moved 72 Ottoman ships overland on greased logs to bypass the harbor chain.', 'Constantinople had fewer than 7,000 defenders against 80,000 Ottoman troops.', 'The city survived sieges for over a thousand years before falling on May 29, 1453.', 'Emperor Constantine XI died in the final battle — the last Byzantine Emperor.', 'The fall ended the Byzantine Empire and opened Europe to Ottoman expansion.'],
    actualOutcome: 'Constantinople fell on May 29, 1453. Mehmed II entered through the Kerkoporta gate. Constantine XI died fighting. The city became Istanbul, capital of the Ottoman Empire.',
    relatedScenarios: ['moon-landing-1969', 'mongol-empire-1206'],
  },
  'moon-landing-1969': {
    title: 'Apollo 11 Moon Landing', role: 'NASA Mission Control engineer',
    summaryFacts: ['The 1202 alarm meant the guidance computer was shedding low-priority tasks — flight-safe.', 'Neil Armstrong manually flew Eagle past a boulder field, adding 30 seconds to descent.', 'Eagle touched down with only 25-30 seconds of fuel remaining.', "The words 'Tranquility Base here — the Eagle has landed' were heard with 1.3s signal delay.", 'Six hours after landing, Armstrong became the first human to walk on the Moon.'],
    actualOutcome: 'Eagle landed in the Sea of Tranquility on July 20, 1969, with roughly 25 seconds of fuel to spare.',
    relatedScenarios: ['constantinople-1453', 'mongol-empire-1206'],
  },
  'mongol-empire-1206': {
    title: 'Rise of the Mongol Empire', role: "Khan's rival chieftain",
    summaryFacts: ['Temujin was declared Genghis Khan at the kurultai of 1206, uniting all Mongol tribes.', "Jamukha was Temujin's anda (sworn brother) and his most capable rival.", 'Temujin promoted warriors by merit, not bloodline — breaking centuries of clan hierarchy.', 'Jamukha was betrayed by his own men; Genghis Khan had the betrayers executed.', 'The Mongol Empire became the largest contiguous land empire in history.'],
    actualOutcome: 'Temujin was declared Genghis Khan in 1206. Jamukha refused to submit, was captured, and offered an honorable death as respect for a worthy enemy.',
    relatedScenarios: ['constantinople-1453', 'moon-landing-1969'],
  },
  'cleopatra-tarsus': {
    title: 'Cleopatra at Tarsus', role: 'Observer from the future',
    summaryFacts: ['Cleopatra was Macedonian-Greek — first Ptolemaic ruler in 300 years to learn Egyptian.', 'She spoke at least 9 languages and wrote treatises on pharmacology.', "The golden barge at Tarsus was political theater to establish her as Antony's equal.", 'Egypt under Cleopatra was the wealthiest state in the Mediterranean.', 'She was the last active ruler of the Ptolemaic Kingdom before Roman annexation.'],
    actualOutcome: 'The Tarsus meeting began a decade-long alliance between Cleopatra and Antony. It ended at Actium in 31 BC. Cleopatra died in 30 BC — the last pharaoh of Egypt.',
    relatedScenarios: ['constantinople-1453', 'joan-rouen'],
  },
  'joan-rouen': {
    title: 'Trial of Joan of Arc', role: 'Witness at the trial',
    summaryFacts: ['Joan claimed divine visions from age 13 and led an army at 17.', "She lifted the Siege of Orléans in 9 days — turning point in the Hundred Years' War.", 'Captured at Compiègne, sold to the English for 10,000 livres, tried by pro-English court.', 'At trial she answered 70 judges with wit and precision despite no legal training.', 'Burned at stake May 30, 1431. Rehabilitated 1456. Canonized 1920.'],
    actualOutcome: 'Joan was burned at stake in Rouen on May 30, 1431, aged 19. A retrial in 1456 declared her innocent. The French won the Hundred Years\' War partly inspired by her legacy.',
    relatedScenarios: ['cleopatra-tarsus', 'constantinople-1453'],
  },
  'davinci-milan': {
    title: 'Leonardo in Milan', role: 'Apprentice visitor',
    summaryFacts: ['Leonardo was ambidextrous and wrote backwards — possibly to keep notes private.', 'He designed flying machines, tanks, and diving suits 400 years before they were built.', 'He dissected over 30 human bodies to study anatomy by candlelight.', 'The Last Supper took 3 years — he would stare for hours, paint one stroke, then leave.', 'He had 300+ patents and inventions but finished remarkably few projects.'],
    actualOutcome: 'Leonardo spent 17 years in Milan, completed The Last Supper, filled thousands of notebook pages. When France invaded in 1499, he fled. He died in France in 1519.',
    relatedScenarios: ['tesla-nyc', 'cleopatra-tarsus'],
  },
  'tesla-nyc': {
    title: 'Tesla and Wardenclyffe', role: 'Visiting journalist',
    summaryFacts: ['Edison promised Tesla $50,000 to fix his DC generators. Tesla did it. Edison called it a joke.', 'Tesla invented the AC power system that the entire modern world runs on.', 'He could visualize complete machines in his head and "test" them mentally before building.', 'Edison electrocuted an elephant publicly to prove AC was dangerous.', 'Tesla held 300+ patents but died nearly penniless in a New York hotel in 1943.'],
    actualOutcome: 'Wardenclyffe Tower was never completed. J.P. Morgan withdrew funding. The tower was demolished in 1917. Tesla died alone in 1943. His AC power system lights the world.',
    relatedScenarios: ['davinci-milan', 'moon-landing-1969'],
  },
  'bolivar-angostura-1819': {
    title: 'The Angostura Address', role: 'Journalist from the future',
    summaryFacts: [
      'Bolívar delivered the Angostura Address on February 15, 1819, proposing the unified Republic of Gran Colombia.',
      'Five months later he crossed the flooded Andes in the rainy season — an operation he called "the most difficult of the entire war."',
      'The Battle of Boyacá on August 7, 1819 secured Colombian independence just 77 days after he left Angostura.',
      'By 1825 he had liberated six countries: Venezuela, Colombia, Ecuador, Peru, Panama, and Bolivia.',
      'Gran Colombia — the federation he proposed at Angostura — collapsed in 1830, the year he died.',
      'He died at 47 from tuberculosis, in exile, having given away most of his personal fortune to fund the revolutions.',
      'His last letter declared: "Those who serve the revolution plow the sea."',
    ],
    actualOutcome: 'Bolívar crossed the Andes and won independence for six nations by 1825. Gran Colombia, the federated super-state he envisioned at Angostura, fragmented within a decade. He died in 1830 believing the entire project had failed.',
    relatedScenarios: ['constantinople-1453', 'joan-rouen'],
  },
};
