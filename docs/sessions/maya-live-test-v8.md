## Maya's Live Test -- Bolivar Call (v8)

**Score: 3/10**

I tried to call Bolivar four times. Four. The app crashed three of those times. And the one time I actually got a response, Bolivar thought he was Cleopatra. I'm not even being dramatic. He literally quoted Cleopatra lines back at me.

---

### What Happened (4 Attempts)

**Attempt 1:**
- Opener: "Hello? Who is this disturbing my eternal rest?" -- actually pretty good.
- I said I'm Maya and know nothing about him.
- He said: "Knowing nothing? Oh, darling, that's practically a tragedy. But don't worry, I find my own legacy quite entertaining to correct."
- I asked what he actually did.
- Page went BLANK. about:blank. Session dead.

**Attempt 2:**
- Opener: just "Hello?" -- less interesting than attempt 1.
- I introduced myself.
- He said: "I suppose 22 years on the throne could be considered adequate. Most people don't get 22 minutes of real power."
- **That is Cleopatra's line. Verbatim. Bolivar did not have a throne. He was a general.**
- I challenged him on the throne thing.
- Page went BLANK again.

**Attempt 3:**
- Opener: "Hello?" again.
- I asked for a mind-blowing fact.
- He said: "Despite what the Romans wrote, I likely looked more like a dusty coin than Elizabeth Taylor."
- **WHAT. Bolivar is talking about Romans, coins, and Elizabeth Taylor. He thinks he's Cleopatra.**
- I called him out on it.
- Page went BLANK again.

**Attempt 4:**
- Opener: "Hello?" again.
- I asked "Who are you?"
- He said: "Oh, heavens. You called me, darling. But I suppose I am rather unforgettable."
- Then "[28.2s] WebSocket closed" -- connection dropped.
- At least the page didn't go blank this time, it just showed "WebSocket closed" in the transcript.

---

### The Two Big Problems

#### 1. BOLIVAR THINKS HE'S CLEOPATRA

This is not a subtle personality issue. He is literally using Cleopatra's material:
- "22 years on the throne" -- Cleopatra
- "dusty coin than Elizabeth Taylor" -- Cleopatra
- "despite what the Romans wrote" -- Cleopatra
- "darling" -- Cleopatra's verbal tic from the dream conversation

If I called George Washington and he started talking about crossing the Alps on elephants, I would close the app immediately. This is that level of wrong. The story script is feeding the wrong character's hooks/facts to Bolivar.

#### 2. THE SESSION CRASHES CONSTANTLY

3 out of 4 calls crashed within 30 seconds. The page literally goes to about:blank -- not an error message, not a "connection lost" screen, just... nothing. If this happened to me on my phone I would think the app is broken and delete it.

The one time it didn't crash to blank, the WebSocket closed after one exchange anyway. So effectively: I cannot have a conversation. At all. The maximum I got was ONE back-and-forth before something died.

---

### What IS Working (Being Fair)

**The timer counting up is nice.** It actually feels like a phone call. I like seeing 00:38 instead of a countdown. That detail is right.

**The first opening from attempt 1 was good.** "Who is this disturbing my eternal rest?" -- that's personality. That's a hook. If the REST of the conversation matched that energy, I'd be interested. But it didn't because... he was Cleopatra.

**Response time is fast.** 2-3 seconds after I type, Bolivar responds. That feels real-time. In a voice call that would feel like natural phone pacing.

**He used my name.** "Maya, 15? Knowing nothing?" -- he picked up on what I said and reflected it back. That's good conversational behavior.

**The transcript format works.** Color-coded, timestamped, readable. I can follow the conversation. The YOU (typed) vs BOLIVAR labels are clear.

---

### What's Missing vs. My Dream Conversation

| My Dream | Reality |
|----------|---------|
| Character leads with an arc -- carpet to Caesar to choice to barge to ending | Character gives one response then crashes |
| Myth-busting that genuinely surprises | Wrong character's myths (Cleopatra facts from Bolivar's mouth) |
| Images appear mid-conversation | No images at all |
| Choice cards at key decision moments | No choices at all |
| 3-5 minute conversation with emotional build | Maximum 30 seconds before crash |
| Closing line that hits emotionally | "WebSocket closed" |
| Character has consistent personality | Character has WRONG personality |
| Phone call pacing, interruptions, energy | Text-only mode (mic denied), which is fine for testing but no energy matching |

---

### UX Issues I Noticed

**"Mic denied: Permission denied. Text-only mode."** This shows up in the actual chat transcript alongside the conversation. That's a system message mixed into what should be MY conversation with a historical figure. It breaks the immersion immediately. Like imagine calling someone and the first thing you see is "BLUETOOTH PAIRING FAILED." It should be hidden or shown separately.

**"Dialing SIMON BOLIVAR -- story script test (no tools)..."** Also in the chat log. Also breaks immersion. I don't want to see debug messages. I want to see Bolivar talking.

**"Connected! Testing story framing..."** Same problem. Three lines of technical stuff before the character even speaks.

**No error recovery.** When the WebSocket dies, there's no "Call dropped. Reconnect?" button. The page either goes blank or just says "WebSocket closed" in the chat. A real phone app would show "Call ended unexpectedly. Call back?"

**Timer keeps running after crash.** The timer said 00:39 even after WebSocket closed. If the call is over, the timer should stop.

---

### Would I Show This to My Friends?

No. Not a chance. If I showed this to my friend and Bolivar started talking about Elizabeth Taylor and then the app crashed, they would laugh AT the app, not WITH it. And then they would never try it again.

---

### What Would Make This a 7/10

1. **Bolivar needs to be Bolivar.** He should talk about liberating five countries, crossing the Andes, being exiled three times, dying at 47 thinking his life's work was ruined. Not Elizabeth Taylor.
2. **The session needs to survive more than one exchange.** Three crashes in four tries means the app is not testable, let alone usable.
3. **Hide the debug messages.** I should see BOLIVAR: "Hello?" as the first thing. Not four lines of connection status.
4. **Show an error state when it crashes.** "WebSocket closed" is developer language. "The call dropped -- try again?" is human language.
5. **Images and choices.** The dream version's magic was the images appearing mid-story and the choice card at the assassination. Without those, this is just a chatbot with timestamps.

---

### Bottom Line

I can't really review the CONVERSATION quality because I never got to HAVE a conversation. The character identity is wrong (Cleopatra material in Bolivar's mouth) and the connection dies before anything meaningful happens. It's like reviewing a restaurant where the kitchen caught fire before the food arrived. I'm sure the chef is talented but I can't tell because I'm standing outside watching smoke.

Fix the crashes. Fix the character identity. Then I'll come back and actually test whether Bolivar can make me FEEL something.
