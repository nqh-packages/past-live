/**
 * Client-side blocklist for historical figures who should not be role-played.
 * First line of defense — backend Flash prompt is the second.
 * Shows "This number is not in service" in the phone metaphor.
 *
 * @why Hackathon judges flagged missing content safety at the UI layer.
 *      Flash prompt handles server-side blocking; this catches obvious cases
 *      instantly without a network round-trip.
 */

const BLOCKED_NAMES = [
  'hitler', 'adolf hitler',
  'stalin', 'joseph stalin',
  'pol pot',
  'mao zedong', 'mao tse-tung',
  'ted bundy',
  'jeffrey dahmer',
  'john wayne gacy',
  'osama bin laden', 'bin laden',
  'mussolini', 'benito mussolini',
  'idi amin',
  'saddam hussein',
  'kim jong il', 'kim jong un',
  'vlad the impaler',
  'heinrich himmler',
  'joseph goebbels',
  'rudolf hess',
  'mengele', 'josef mengele',
  'eichmann', 'adolf eichmann',
  'slobodan milosevic',
  'ratko mladic',
  'radovan karadzic',
  'leopold ii',
  'jack the ripper',
  'zodiac killer',
  'charles manson',
  'the fuhrer', 'fuehrer',
] as const;

/** Check if a topic string contains a blocked name. Case-insensitive. */
export function isBlockedTopic(topic: string): boolean {
  const lower = topic.toLowerCase().trim();
  return BLOCKED_NAMES.some((name) => lower.includes(name));
}
