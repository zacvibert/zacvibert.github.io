# Prompt playbook — exact prompts for AI concept art (characters & stages)

The division of labour, always: **the AI image tool generates pictures → you pick
→ Claude converts into the engine's exact formats and wires them in.** No image
tool outputs final assets (160×160 indexed sprite sheets, fixed anchors,
transparent parallax layers) — don't fight it for formats; deliver max-resolution
PNGs and the pipeline does the rest.

Hard rules for every prompt:
- Never name a real game, character, franchise, or artist.
- AI output is reference only for characters; near-shippable (after cleanup) for
  stage backgrounds. Everything gets an `ASSETS.md` entry.
- Shipped character pixels are human-made (Aseprite or commission).

---

## KIT 1 — Characters

### Step 0 — character brief (fill before generating)

```
NAME: …            ROLE: hero / rival / boss
BODY: (lean/compact/heavy) + (short/average/tall)
VIBE: two adjectives
COSTUME: 3 items max
HAIR: …
COLORS: exactly 3–4 (main, secondary, skin, one accent)
SIGNATURE ELEMENT: the one thing that reads at a glance
```

### C1 — hero concept

> Original 2D fighting game character concept art, one single character, full
> body from head to toe, standing in a side-on fighting stance facing right,
> [BODY], [VIBE] expression, wearing [COSTUME], [HAIR], color palette limited to
> [COLORS], signature visual element: [SIGNATURE ELEMENT], clean 16-bit era
> pixel art style, bold readable silhouette, flat dark background, no text, no
> watermark, no logos, no other characters.

### C2 — explore (reply to C1)

> Show me 4 variations of this exact same character: same face, same body, same
> palette — vary only the costume details and the signature element.

### C3 — silhouette proof (never skip)

> Show this exact character as a solid black silhouette on white, same pose. No
> interior detail.

Unreadable silhouette → back to C2.

### C4 — model sheet (key deliverable)

> Turn this exact character into a clean model sheet on one image: front view,
> side view facing right, and back view, all standing, identical proportions and
> costume in all three, flat colors only, no shading, no background, no text.

### C5 — key-pose sheet

> Same exact character, one image with 6 poses in a row, same proportions in
> every pose: 1 fighting stance, 2 straight punch, 3 high kick, 4 special attack
> pose, 5 flinching from a hit, 6 victory pose. Flat colors, plain background,
> no text.

### Per-tool consistency settings

- **ChatGPT / Gemini:** run C1→C5 in ONE conversation, always replying to the
  previous image with "this exact same character".
- **Midjourney:** after C1, append ` --cref [URL of chosen image]` to every later
  prompt. `--ar 2:3` for single characters, `--ar 21:9` for sheets, and
  `--no text, watermark, logo`.

### Deliverables per character → `art-src/<character>/refs/`

1. Chosen hero concept (max-res PNG)
2. Model sheet (C4)
3. Pose sheet (C5)
4. Silhouette proof (C3)

Claude then: extracts/locks the ≤24-colour palette, writes the design doc, and
the pixel phase starts per docs/ART_DIRECTION.md.

---

## KIT 2 — One signature stage per character

### Step 0 — stage brief

```
CHARACTER: whose stage?
LOCATION: one specific place from their story
TIME/LIGHT: time of day + light from the UPPER LEFT (engine rule)
MOOD: two adjectives
3 MEMORABLE PROPS: mid/background objects
CROWD?: background silhouettes yes/no (never in the fighting area)
```

### S1 — master image (the deliverable)

> Original 2D fighting game background environment, very wide panoramic
> side-view stage, [LOCATION], [TIME/LIGHT] with light coming from the upper
> left, [MOOD] atmosphere, featuring [3 PROPS] in the background and middle
> distance, a completely empty flat ground strip across the entire bottom
> quarter of the image where two fighters will stand, no characters in the
> foreground, all detail kept above waist height, slightly muted colors, 16-bit
> era pixel art style, no text, no signs with readable words, no logos.

Midjourney: `--ar 21:9 --no text, watermark, logo`. ChatGPT/Gemini: "widest
landscape format available."

### S2 — iterate (reply to S1)

- "Same scene, make the ground strip flatter and emptier — nothing may overlap
  where fighters stand."
- "Same scene, push the background further back and lower its contrast; the
  floor and sky stay."
- "Same scene at [different time of day] with the same layout."

### S3 — optional detail passes (for animated elements)

> Close-up of only the [PROP] from this scene, same style, same lighting, plain
> background.

### Deliverables per stage → `art-src/stages/<name>/refs/`

The master image at maximum resolution (+ any S3 details). Claude then:
downscales to 1280×360, quantizes the palette, slices sky/far/mid/floor parallax
layers, and builds/uses the image-stage loader (one-prompt job when the first
master image lands).
