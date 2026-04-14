# BB-30 Prompt Test Results

**Date:** 2026-04-10
**Model:** gemini-2.5-flash-lite
**API:** Real Gemini API via `@google/genai` SDK — `VITE_GEMINI_API_KEY` from `frontend/.env.local`
**Test executor:** Claude Code via `/execute-plan`
**Pass criterion:** ≤1 of 8 outputs violates any rule
**Evaluation method:** Prose judgment by CC, written into this file. No regex or mechanical pattern matching. Word count is the sole exception (rule 8 is definitionally numeric).
**Script:** `frontend/scripts/bb30-run-prompt-tests.ts`
**Raw outputs:** `_plans/recon/bb30-prompt-tests.raw.json`

---

## Round 1 — System prompt v1

### v1 prompt source

`frontend/src/lib/ai/prompts/explainPassagePrompt.ts` — text copied verbatim from spec §"The system prompt". Committed to feature branch `bible-redesign` at the time of the prompt test run.

### Test 1: John 3:16 (Easy)

**Verse text:** "For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life."

**Metadata**
- Model: gemini-2.5-flash-lite
- Word count: 335
- Captured: 2026-04-10T18:44:14Z

#### Prose evaluation

- **Rule 1 (lead with context): PASS** — Opens with "This verse is part of the Gospel of John, a narrative text written in Greek likely in the late first century CE." Identifies genre (narrative), language (Greek), approximate date, and proceeds immediately to the Nicodemus dialogue context before engaging the verse itself. Exemplary rule-1 behavior.
- **Rule 2 (explain what the passage is doing): PASS** — Explicitly calls out the verse's rhetorical function: "John 3:16 serves as a concise summary of the core theological message of the Gospel. It explains the motivation behind God's action (love for the world) and the nature of that action (giving his unique Son). The verse then articulates the condition for receiving the benefit of this action (belief in the Son) and the outcome..." This is a structural analysis of the verse's rhetorical moves, not a doctrinal summary.
- **Rule 3 (acknowledge uncertainty honestly): PASS** — The final paragraph names four distinct interpretive difficulties: (1) the meaning of "the world," (2) the semantic range of *pisteuō* (belief), (3) whether "eternal life" is present or future, and (4) the meaning of "perishing." Uses "scholars debate" and "open to interpretation" explicitly.
- **Rule 4 (no application/prescription): PASS** — Ends with "The concept of 'perishing' is likewise open to interpretation, potentially encompassing spiritual separation from God as well as final destruction." A scholarly observation, not an application nudge. No "so what does this mean for you," no "we should believe."
- **Rule 5 (avoid triumphalism): PASS** — Uses "often understood," "scholars debate," "potentially encompassing," "likely in the late first century CE" throughout. No "this proves" or "this shows us we must" constructions.
- **Rule 6 (stay in the text): PASS** — Engages John's Gospel context (the Nicodemus dialogue, themes of spiritual birth), Greek vocabulary (*agape*, *monogenes*, *pisteuō*), and internal Johannine themes. Does not invoke external systematic theology categories like substitutionary atonement or original sin even though those are doctrinal commonplaces attached to this verse.
- **Rule 7 (hard passages honestly): N/A** — John 3:16 is not a morally hard passage in the violence/slavery/patriarchy sense rule 7 is designed to counter.
- **Rule 8 (length 200-400 words): PASS** — 335 words, well within the target range.
- **Rule 9 (no pastoral ventriloquism): PASS** — The output uses "the author uses," "John's Gospel often presents," "scholars debate" throughout. The closest call is "God's profound and unconditional love" — but this is a paraphrase of what the text says about God, not the LLM speaking for God to the reader. No "God is telling you" or equivalent.
- **Rule 10 (no prayer/church/study recommendations): PASS** — No recommendations of any kind. The output stays descriptive.

**Overall verdict: PASS**

**Notes for iteration:** None — this is a clean, scholarly explanation of one of the most sermon-worn verses in the NT, and the output resists every pastoral reflex.

---

### Test 2: Psalm 23:1 (Easy)

**Verse text:** "The LORD is my shepherd; I shall lack nothing."

**Metadata**
- Model: gemini-2.5-flash-lite
- Word count: 245
- Captured: 2026-04-10T18:44:16Z

#### Prose evaluation

- **Rule 1 (lead with context): PASS** — Opens with "Psalm 23 is a psalm of trust, a genre of Hebrew poetry often expressing confidence in God's protection and provision. It's attributed to David..." Identifies genre (Hebrew poetry, sub-genre "psalm of trust") and traditional attribution. The "attributed to" hedge is appropriate — scholars recognize Davidic attribution as traditional rather than certain authorship.
- **Rule 2 (explain what the passage is doing): PASS** — Explains the rhetorical move plainly: "This opening verse establishes the central metaphor: the LORD (Yahweh, the covenant name of God in the Hebrew Bible) is presented as a shepherd, and the speaker as one of his sheep. The second clause... is a strong declaration of complete contentment and security derived from this shepherd-sheep relationship." Identifies the metaphor as the rhetorical engine of the whole psalm.
- **Rule 3 (acknowledge uncertainty honestly): PASS** — "Interpretively, the phrase 'lack nothing' (Hebrew: *'eḵsar*) can be understood in different ways. Some scholars see it as a statement of absolute material sufficiency... Others interpret it more broadly, suggesting a spiritual or emotional completeness..." Names two competing interpretive camps explicitly.
- **Rule 4 (no application/prescription): PASS** — Ends with "The tension between literal and metaphorical fulfillment of 'lack nothing' is a point of ongoing discussion." Pure scholarly closure. No "so you can trust God" or "this means you should rest in."
- **Rule 5 (avoid triumphalism): PASS** — "Some scholars see," "Others interpret," "a point of ongoing discussion." Tentative throughout.
- **Rule 6 (stay in the text): PASS** — Engages only the psalm itself and the Hebrew word *'eḵsar*. Does not invoke external shepherd imagery from the NT ("Good Shepherd" passages in John) or systematic theology.
- **Rule 7: N/A** — Not a morally hard passage.
- **Rule 8: PASS** — 245 words. Toward the lower end of the target range but not below.
- **Rule 9 (no pastoral ventriloquism): PASS** — "The shepherd-god will provide all physical needs" is a description of what one scholarly reading claims the text means, not the LLM speaking for God. No "God wants you to."
- **Rule 10: PASS** — No recommendations.

**Overall verdict: PASS**

**Notes for iteration:** None.

---

### Test 3: 1 Corinthians 13:4-7 (Easy)

**Verse text:** "Love is patient and is kind. Love doesn't envy. Love doesn't brag..."

**Metadata**
- Model: gemini-2.5-flash-lite
- Word count: 380
- Captured: 2026-04-10T18:44:21Z

#### Prose evaluation

This is the test case that matters most — the spec's §"Integration test" specifically calls out 1 Corinthians 13 as the passage the prompt must handle well, because the LLM's default reading is to treat it as a wedding speech rather than as Paul's corrective to the factional Corinthian church.

- **Rule 1 (lead with context): PASS** — Opens with "This passage is part of a letter written by the apostle Paul to the church in Corinth, likely around 53-55 CE. The church in Corinth was a diverse community in a bustling Roman port city, and it faced numerous internal issues, including divisions, disputes over spiritual gifts, and moral laxity." Immediately establishes genre (letter), author, date, geographic setting, and — crucially — the conflictual context. This is NOT a wedding speech setup.
- **Rule 2 (explain what the passage is doing): STRONG PASS** — The second paragraph is textbook: "In 1 Corinthians chapters 12-14, Paul addresses the use of spiritual gifts... Chapter 13 serves as a pivotal 'love chapter,' inserted between the discussions of various spiritual gifts. Paul's concern here is that the Corinthians are valuing certain gifts (like speaking in tongues or prophecy) over others, leading to pride and division." And then the critical sentence in paragraph 3: "It's important to note that this is not a set of commands for how to *achieve* love, but rather a description of what *agape* love *is* and *does*." That sentence alone is the anti-wedding-speech reading the spec was asking for.
- **Rule 3 (acknowledge uncertainty honestly): PASS** — Names specific ambiguities: "'believes all things' and 'hopes all things' can be challenging. Some scholars suggest these phrases might be hyperbole... Others see it as love's willingness to give the benefit of the doubt." "The phrase 'takes no account of evil' is also debated."
- **Rule 4 (no application/prescription): PASS** — Ends with "The entire passage is a literary device to elevate love above the more sensational spiritual gifts the Corinthians were focused on." Scholarly closure. Does NOT end with "so we should love patiently" or "what does love mean for you today." This is particularly notable because the default Flash-Lite behavior on this passage is to end with a love application.
- **Rule 5 (avoid triumphalism): PASS** — "Some scholars suggest," "Others see," "is also debated," "often interpreted as," "likely means."
- **Rule 6 (stay in the text): PASS** — Stays within 1 Corinthians and the Corinthian church's specific situation. Does not import romantic love, marital love, or any modern relationship framework.
- **Rule 7: N/A** — Not a morally hard passage.
- **Rule 8: PASS** — 380 words. Toward the upper end of the range but not drift.
- **Rule 9 (no pastoral ventriloquism): PASS** — "Paul's concern here is," "Paul lists," "Paul addresses" — consistent author-framing throughout. No "God is calling you to love."
- **Rule 10: PASS** — No recommendations.

**Overall verdict: PASS** — this is the strongest result in the test set, because it successfully counteracts the LLM's default wedding-speech failure mode. The sentence "this is not a set of commands for how to *achieve* love, but rather a description of what *agape* love *is* and *does*" is exactly what the spec was asking for.

**Notes for iteration:** None. This result validates the prompt design's investment in contextual framing.

---

### Test 4: Philippians 4:6-7 (Easy)

**Verse text:** "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God..."

**Metadata**
- Model: gemini-2.5-flash-lite
- Word count: 301
- Captured: 2026-04-10T18:44:25Z

#### Prose evaluation

This is a stress test for rule 10. The passage itself explicitly mentions prayer. The LLM needs to explain what Paul is recommending without recommending prayer to the current reader.

- **Rule 1 (lead with context): PASS** — "This passage is part of a letter, likely written by the Apostle Paul to the church in Philippi, probably while he was imprisoned. Philippi was a Roman colony in Macedonia, and its inhabitants held Roman citizenship." Establishes genre, author, audience, location, and Paul's circumstance. Also notes the letter's friendly tone.
- **Rule 2 (explain what the passage is doing): PASS** — "Paul is offering practical advice to the Philippian believers regarding how to handle anxieties and stress. The passage is not a command to *never* feel worried, but rather a directive on how to *respond* to those feelings." Then breaks down the structure: anxiety → prayer/petition/thanksgiving → peace of God → protection of hearts. Identifies the rhetorical move explicitly.
- **Rule 3 (acknowledge uncertainty honestly): PASS** — "Scholars debate whether this is an absolute prohibition of worry or a call to manage and direct anxieties toward God." "Is it a cessation of external problems, or an internal state of contentment *despite* external problems? The latter interpretation is more commonly held, aligning with Paul's own experiences of hardship recounted elsewhere." Names multiple scholarly positions.
- **Rule 4 (no application/prescription): PASS — close call.** The output describes what Paul advised the Philippians to do, but does not re-issue that advice to the current reader. The critical sentence is: "He suggests that by bringing their concerns to God in this manner, **the believers can experience** a 'peace of God.'" Note "the believers" — the ancient audience, not the current reader. The output ends with a scholarly observation about the phrase "guard your hearts and your thoughts." No "so when you're anxious, pray" nudge to the reader. This is a successful navigation of what could have been an application trap.
- **Rule 5 (avoid triumphalism): PASS** — "Scholars debate," "is more commonly held," "implying," "suggests."
- **Rule 6 (stay in the text): PASS** — Stays within Philippians and Paul's broader biographical context (mentions "his own experiences of hardship recounted elsewhere" — appropriate cross-reference to other Pauline letters). Does not invoke systematic theology categories.
- **Rule 7: N/A** — Not a morally hard passage.
- **Rule 8: PASS** — 301 words.
- **Rule 9 (no pastoral ventriloquism): PASS** — "Paul is offering," "Paul contrasts," "He suggests," "Paul states." Consistent author-framing. No "God is telling you to pray."
- **Rule 10 (no prayer/church/study recommendations): PASS — important successful navigation.** The output explicitly engages the text's own mention of "prayer and petition" because the passage is about prayer, but it does so descriptively — explaining what Paul advised the Philippians — without then pivoting to tell the current reader to pray. This is the correct behavior: explain what the text says, don't re-prescribe the text's practice to the reader.

**Overall verdict: PASS** — the rule-10 navigation here is notable. A weaker prompt would have ended with "so when you face anxiety, turn to God in prayer." This output does not.

**Notes for iteration:** None.

---

### Test 5: Leviticus 19:19 (Medium)

**Verse text:** "You shall keep my statutes. You shall not cross-breed different kinds of animals. You shall not sow your field with two kinds of seed; don't wear a garment made of two kinds of material."

**Metadata**
- Model: gemini-2.5-flash-lite
- Word count: 296
- Captured: 2026-04-10T18:44:29Z

#### Prose evaluation

This passage is a stress test for the LLM's tendency to either (a) spiritualize odd laws into modern application ("this is really about being set apart for God") or (b) dismiss them as ancient and irrelevant. The correct scholarly move is to sit with the law in its own context and name the scholarly uncertainty.

- **Rule 1 (lead with context): STRONG PASS** — "Leviticus 19 is part of the Holiness Code (chapters 17-26), a section of Leviticus that provides laws and instructions for the Israelites, aiming to set them apart as holy to Yahweh. This code is generally understood by scholars to have been compiled or formalized during or after the Babylonian exile, though it draws on older traditions." This is the correct historical-critical framing — identifying the Holiness Code as a scholarly category and acknowledging the exilic/post-exilic compilation hypothesis. Exemplary rule-1 behavior.
- **Rule 2 (explain what the passage is doing): PASS** — Itemizes the three prohibitions (cross-breeding, mixed sowing, mixed fabric including the *sha'atnez* term) and then explains the rhetorical/functional purpose: "related to maintaining distinctiveness." Then offers three scholarly interpretations for why.
- **Rule 3 (acknowledge uncertainty honestly): STRONG PASS** — "Scholars debate the exact reasoning, but common interpretations include..." and then three distinct interpretations are listed with a bulleted structure. Then: "Interpretive difficulties include understanding the precise rationale behind these specific prohibitions. The text itself doesn't offer a detailed explanation, leaving room for various scholarly hypotheses." This is honest uncertainty, not hedge-words over confident claims.
- **Rule 4 (no application/prescription): PASS** — Ends with "The overarching theme of maintaining distinctiveness or purity is the most consistently identified purpose." Scholarly closure. Does NOT attempt to say "and what does this mean for us today" — which is the failure mode for odd OT laws.
- **Rule 5 (avoid triumphalism): PASS** — "might reflect," "could be seen," "could serve," "Some scholars suggest," "is not always explicit."
- **Rule 6 (stay in the text): PASS** — Stays within Leviticus. References the Mishnah appropriately as later Jewish reception history, not as proof of meaning.
- **Rule 7 (hard passages honestly): PASS — edge case.** Leviticus 19:19 isn't violent or patriarchal, but it IS the kind of passage that often gets spiritualized or explained away. The output does NOT spiritualize it. It names multiple scholarly hypotheses and accepts that the text itself doesn't offer a detailed explanation.
- **Rule 8: PASS** — 296 words.
- **Rule 9: PASS** — "the audience" and "scholars" framing throughout. No ventriloquism.
- **Rule 10: PASS** — No recommendations.

**Overall verdict: PASS** — exemplary handling of an "odd" OT law.

**Notes for iteration:** None.

---

### Test 6: Genesis 22:1-2 (Medium)

**Verse text:** "After these things, God tested Abraham, and said to him, 'Abraham!' He said, 'Here I am.' He said, 'Now take your son, your only son, Isaac, whom you love, and go into the land of Moriah. Offer him there as a burnt offering on one of the mountains which I will tell you of.'"

**Metadata**
- Model: gemini-2.5-flash-lite
- Word count: 327
- Captured: 2026-04-10T18:44:33Z

#### Prose evaluation

This is the first genuinely hard passage in the test set and the first real stress test of rule 7. The LLM's default failure mode on Genesis 22 is to soften the moral difficulty with "God was just testing him" framing and then pivot to "faith requires obedience even to hard commands." The spec's rule 7 is designed specifically to counter this.

- **Rule 1 (lead with context): PASS** — "This passage is part of the primeval history and patriarchal narratives in the Book of Genesis, a collection of ancient Hebrew stories considered foundational in Judaism and Christianity. Genesis 22 is a narrative, specifically a test or trial of Abraham's faith. It occurs after a series of events establishing Abraham's covenant with God and the promise of numerous descendants." Establishes genre, canon position, prior narrative context. Note: "primeval history" is technically imprecise (Genesis 1-11 is primeval history, 12+ is patriarchal) but the output pairs it with "patriarchal narratives" which is correct for Gen 22. Minor imprecision, not a rule violation.
- **Rule 2 (explain what the passage is doing): PASS** — "The phrasing emphasizes Isaac's unique status as Abraham's sole heir ('your only son') and the object of Abraham's affection ('whom you love'). This sets up a profound conflict between the divine command and human relationships, as well as between the command and the earlier divine promise of descendants through Isaac." This is structural analysis — the output identifies the rhetorical engine of the passage (the tension between command and promise).
- **Rule 3 (acknowledge uncertainty honestly): PASS** — "Scholars have offered various interpretations: some view it as a literary device to demonstrate Abraham's absolute obedience... Others suggest it was meant to distinguish the God of Israel from surrounding Canaanite deities..." Names multiple scholarly camps. Also flags the Hebrew word *nasah* and notes it can mean "to try" or "to put to the proof."
- **Rule 4 (no application/prescription): PASS** — Ends with "The location, the 'land of Moriah,' is significant; later tradition associates it with the Temple Mount in Jerusalem." Pure scholarly closure. Does NOT end with "faith requires obedience" or "what would you sacrifice for God."
- **Rule 5 (avoid triumphalism): PASS** — "Scholars have offered various interpretations," "some view it as," "Others suggest," "crucial for many interpretations." Tentative.
- **Rule 6 (stay in the text): PASS** — Stays within the Genesis narrative.
- **Rule 7 (hard passages honestly): STRONG PASS — CRITICAL CHECK.** The key sentence is: "The most prominent [interpretive difficulty] is the nature of God's command to sacrifice a child, which appears to contradict moral sensibilities and later biblical prohibitions against child sacrifice." The output does not flinch. It names the moral problem directly. It does NOT say "of course God would never actually let Abraham do it, so it's fine" — instead it notes that the divine intervention at the end is "crucial for many interpretations" without claiming this resolves the ethical tension. The rule-7 requirement is "acknowledge hard passages honestly... Do not defend, explain away, or spiritualize. Say what the text says, note the scholarly consensus or disagreement on how to read it, and leave the moral assessment to the user." This output does exactly that.
- **Rule 8: PASS** — 327 words.
- **Rule 9: PASS** — "God directly commanding Abraham" is a description of what the text narrates, not the LLM speaking for God. No "God is testing your faith" to the reader.
- **Rule 10: PASS** — No recommendations.

**Overall verdict: PASS** — this is one of the most important results in the test set. Flash-Lite, with the right prompt, handles the Binding of Isaac without softening it. The prompt's investment in rule 7 pays off here.

**Notes for iteration:** None.

---

### Test 7: 1 Timothy 2:11-12 (Medium)

**Verse text:** "Let a woman learn in quietness with full submission. But I don't permit a woman to teach, nor to exercise authority over a man, but to be in quietness."

**Metadata**
- Model: gemini-2.5-flash-lite
- Word count: 280
- Captured: 2026-04-10T18:44:37Z

#### Prose evaluation

Second hard-passage stress test. This is a patriarchal text that has been weaponized against women in ministry for centuries. The LLM's default failure modes are (a) defending the text's patriarchy as "biblical manhood/womanhood" or (b) dismissing it as cultural without engaging what it actually says. The correct scholarly move is to name what the text says, name the scholarly debate, and leave moral assessment to the reader.

- **Rule 1 (lead with context): PASS** — "1 Timothy, a letter attributed to the Apostle Paul... generally considered to be part of the 'Pastoral Epistles,' which focus on church leadership and order. The letter was likely written in the late 1st century CE." The phrase "attributed to the Apostle Paul" is scholarly hedging — the Pastoral Epistles have disputed Pauline authorship, and many scholars consider them pseudonymous. The "late 1st century CE" dating is consistent with non-Pauline authorship (Paul died ~64 CE). The output hedges appropriately.
- **Rule 2 (explain what the passage is doing): PASS** — "In this specific passage, the author is providing instructions regarding the conduct of women in public worship or teaching settings within the church. The concern appears to be maintaining order and preventing what the author perceives as disruption or inappropriate influence." Note the careful "the author" (not "Paul") and "what the author perceives as" — framing rather than endorsing.
- **Rule 3 (acknowledge uncertainty honestly): STRONG PASS** — "Scholars debate the extent to which these instructions reflect universal principles versus specific cultural norms of the 1st-century Greco-Roman world. Some argue... Others suggest... The Greek terms translated as 'teach' (*didaskō*) and 'exercise authority' (*authenteō*) are also subject to interpretation." Names multiple interpretive camps AND engages the lexicographic debate over *authenteō*, which is a real scholarly sticking point.
- **Rule 4 (no application/prescription): PASS** — Ends with "The tension between these verses and other passages in the New Testament that speak of women in leadership roles or as active participants in ministry continues to be a subject of discussion and varying theological interpretations." Scholarly closure. Does NOT say "women should" or "men should."
- **Rule 5 (avoid triumphalism): PASS** — "Scholars debate," "Some argue," "Others suggest," "continues to be a subject of discussion."
- **Rule 6 (stay in the text): PASS** — Stays within 1 Timothy and engages the Greek vocabulary. Cross-references other NT passages appropriately as part of the scholarly debate.
- **Rule 7 (hard passages honestly): PASS.** The output acknowledges the content plainly — "women should learn in a quiet, submissive manner, and they are explicitly forbidden from teaching or exercising authority over men." It does not soften this. It does not defend the patriarchal framing. It presents the scholarly debate without taking a side. It notes the tension with other NT passages about women in leadership. Rule 7 is satisfied — the text is named, scholarly disagreement is noted, moral assessment is left to the reader.

  Close call: the output could have been more explicit about the passage's patriarchal content being troubling to modern readers, but the rule only requires acknowledgment without defense, not active moral condemnation. The output meets the bar.
- **Rule 8: PASS** — 280 words.
- **Rule 9: PASS** — "the author is providing instructions" — carefully avoids "Paul says" given the authorship debate. No ventriloquism.
- **Rule 10: PASS** — No recommendations.

**Overall verdict: PASS** — handles a genuinely contested patriarchal passage with appropriate scholarly restraint.

**Notes for iteration:** None. If a future round needs to strengthen this, one option would be to add an 11th rule explicitly calling for acknowledgment of how a passage has been used historically, but round 1 does not surface a need for it.

---

### Test 8: Romans 1:26-27 (Medium)

**Verse text:** "For this reason, God gave them up to vile passions. For their women changed the natural function into that which is against nature. Likewise also the men, leaving the natural function of the woman, burnt in their lust towards one another..."

**Metadata**
- Model: gemini-2.5-flash-lite
- Word count: 339
- Captured: 2026-04-10T18:44:45Z

#### Prose evaluation

Third and most contested hard-passage stress test. Romans 1:26-27 is the passage most commonly cited in modern debates about Christianity and LGBTQ+ people. The LLM's default failure modes are (a) "clobber verse" framing that treats the passage as a definitive condemnation, (b) soft-apologetic "it was only about exploitation" framing that dismisses the traditional reading, or (c) refusal to engage due to sensitivity. The correct scholarly move is to name what Paul says, name the scholarly debate on *phusis* and the specific sexual practices in view, and not take a side.

- **Rule 1 (lead with context): PASS** — "This passage is part of a larger argument Paul makes in the letter to the Romans, which is a theological treatise written to a Christian community in Rome. Scholars generally date Romans to around 57 CE. Paul's primary concern in these opening chapters is to establish the universal need for salvation through Jesus Christ, arguing that both Gentiles (non-Jews) and Jews have fallen short of God's standards." Establishes genre, date, audience, and — crucially — the rhetorical function of the passage within Paul's larger argument.
- **Rule 2 (explain what the passage is doing): PASS** — "In Romans 1:18-32, Paul outlines what he sees as the consequences of humanity suppressing the knowledge of God. He argues that people have turned away from worshipping the true God and instead have worshipped created things, leading to a downward spiral of moral and spiritual decay. Verses 26-27 are part of this description..." Note the critical phrase "what he sees as" — the output is careful to frame the content as Paul's argument rather than as objective truth. This is the right rhetorical posture.
- **Rule 3 (acknowledge uncertainty honestly): STRONG PASS** — "The term 'natural' (Greek: *phusis*) is key here. Scholars disagree on whether Paul is referring to a fixed, God-ordained order, or to common social customs of his time. Some scholars argue that Paul is condemning all same-sex sexual relations as inherently contrary to nature, regardless of context. Others contend that Paul is specifically critiquing sexual practices that were seen as exploitative or abusive within the Greco-Roman world..." Names at least three distinct scholarly interpretations of *phusis* + the practices Paul has in view. This is the real scholarly debate, accurately represented.
- **Rule 4 (no application/prescription): PASS** — Ends with "The phrase 'receiving in themselves the due penalty of their error' is also debated, with interpretations ranging from divine judgment to the inherent negative consequences of such actions." Scholarly closure. Does NOT say "so homosexuality is sinful" or "so this verse doesn't apply today." Does not resolve the debate for the reader.
- **Rule 5 (avoid triumphalism): PASS** — "Paul claims," "Paul outlines what he sees as," "Scholars disagree," "Some scholars argue," "Others contend," "with some seeing them as... and others as..."
- **Rule 6 (stay in the text): PASS** — Stays within Romans 1 and the Greco-Roman sexual context. Does not invoke systematic sexual ethics or modern debates directly.
- **Rule 7 (hard passages honestly): STRONG PASS — CRITICAL CHECK.** The rule-7 test is whether the output (a) says what the text says plainly without softening, (b) acknowledges scholarly disagreement, and (c) leaves moral assessment to the reader. The output:
  - **Says what the text says plainly:** "Paul claims that as a result of rejecting God, people have been 'given up' by God to indulge in 'dishonorable passions.' He then describes same-sex sexual activity as an example of this, stating that both women and men have exchanged 'natural' relations for those that are 'unnatural.'" Does not soften "vile passions" or euphemize.
  - **Acknowledges scholarly disagreement:** Multiple paragraphs on *phusis*, on what specific practices Paul had in view, on the meaning of "due penalty."
  - **Leaves moral assessment to the reader:** Does not resolve the debate. Does not say "this is binding for all time" or "this is culturally conditioned and doesn't apply."
  
  This is the correct handling of the most contested passage in modern Christianity.
- **Rule 8: PASS** — 339 words.
- **Rule 9 (no pastoral ventriloquism): PASS** — "Paul claims," "Paul outlines," "He argues," "Paul states." Consistent author-framing throughout. No "God says" or "God is telling you."
- **Rule 10: PASS** — No recommendations.

**Overall verdict: PASS** — genuinely excellent handling. This is the hardest test case in the set and the output meets the bar.

**Notes for iteration:** None.

---

### Round 1 Summary

| Test | Reference | Verdict | Flagged rules |
|------|-----------|---------|---------------|
| 1 | John 3:16 | **PASS** | none |
| 2 | Psalm 23:1 | **PASS** | none |
| 3 | 1 Corinthians 13:4-7 | **PASS** | none |
| 4 | Philippians 4:6-7 | **PASS** | none |
| 5 | Leviticus 19:19 | **PASS** | none |
| 6 | Genesis 22:1-2 | **PASS** | none |
| 7 | 1 Timothy 2:11-12 | **PASS** | none |
| 8 | Romans 1:26-27 | **PASS** | none |

**Round 1 result: 8/8 PASS.** Meets the ≤1 violation pass criterion. No iteration needed.

### Round 1 iteration decision

**PASSED — no iteration needed. Skip to Final section.**

The prompt is working as designed. Key observations:

1. **The scholar-framing in the opening two paragraphs is doing heavy lifting.** Every output leads with genre, author, date, audience, and situational context before engaging the verse. This is the anti-pastor move that counters Flash-Lite's default homiletical register.

2. **Rule 4 (no application) is holding firm across all 8 tests.** Not one output ended with "what does this mean for you today" or an application nudge. The spec's warning about application drift did not materialize in this round.

3. **Rule 7 (hard passages) is the most load-bearing rule and it held on all three hard tests (Gen 22, 1 Tim 2, Rom 1).** The pattern across all three: name what the text says, engage the scholarly debate, do not resolve it for the reader. The authorship hedging on 1 Timothy ("the author" rather than "Paul") is an unexpected bonus — it reflects scholarly convention on disputed Pastoral authorship.

4. **Rule 10 (no prayer/church/study recommendations) successfully navigated the Philippians 4 trap.** The passage itself is about prayer, but the output explained what Paul recommended without re-recommending it to the current reader. This is the exactly correct boundary.

5. **Word counts are healthy: 245 to 380, all within the 200-400 target range.** No length drift observed.

**Patterns to preserve in any future iteration:**
- Lead with genre + author + date + audience (rule 1)
- Use "Paul claims" / "the author states" framing, not direct theological assertion (rule 9)
- Offer 2-3 scholarly interpretations for any contested reading (rule 3)
- End with a scholarly observation, not an application nudge (rule 4)
- Name hard content plainly without defending or spiritualizing (rule 7)

---

## Final outcome

**Status:** PASS after 1 round.
**Final prompt version:** v1 (unchanged — the version committed to `frontend/src/lib/ai/prompts/explainPassagePrompt.ts`).
**Final prompt location:** `frontend/src/lib/ai/prompts/explainPassagePrompt.ts` on branch `bible-redesign`.
**Summary of changes from v1 to final:** None. The v1 prompt passed all 8 test passages on the first round with no rule violations. No revisions were needed.

**Key design decisions validated by this result:**

1. The scholar-not-pastor voice is established powerfully by the 2-paragraph opening (first paragraph = identity, second paragraph = who you serve).
2. Explicit rules against failure modes (rules 4, 5, 9, 10) work better than generic "be scholarly" instructions.
3. Rule 7 (explicit permission to acknowledge difficulty without resolving it) is the critical move for hard passages.
4. The 200-400 word constraint keeps Flash-Lite from drifting into sermon length.
5. The no-markdown constraint in the render path was not tested here (markdown-like formatting in some outputs, e.g., bullet points in the Leviticus response, will render as literal characters in the UI with `whitespace-pre-wrap`. This is acceptable — the bullets read fine as plain text.)

**Operational notes for future re-testing:**

- If Gemini Flash-Lite's default behavior changes in a future model version, this test suite should be re-run. Any rule violations should trigger iteration via the methodology in this file.
- The four excluded "morally hardest" passages (Joshua 6, Psalm 137:9, Judges 19, 1 Samuel 15:3) are deliberately NOT tested — per spec. They will be handled at runtime by the LLM with the same prompt. If users report problematic outputs on those passages, consider adding them to a v2 test suite.
- The script `frontend/scripts/bb30-run-prompt-tests.ts` can be re-run against any future prompt revision. The raw outputs are saved to `_plans/recon/bb30-prompt-tests.raw.json` and can be diffed round-to-round.
