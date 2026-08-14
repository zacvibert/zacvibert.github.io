# Asset provenance manifest

Every sprite, sound and music track shipped with this game is logged here with its
author, tool and licence. Nothing may be committed to `public/assets/` or drawn by
the renderer without an entry.

| Asset | Type | Author | Tool | Licence | Notes |
|---|---|---|---|---|---|
| Articulated fighter renderer (poses, gi, headband) | procedural gfx | Zac Vibert (via Claude Code) | Canvas 2D code | project-original | original design; upgradeable to pixel sprites per docs/CUSTOMIZING.md §4 |
| Sunset rooftop stage (sky, skyline, floor) | procedural gfx | Zac Vibert (via Claude Code) | Canvas 2D code | project-original | |
| Energy-orb projectile + hit/block sparks | procedural gfx | Zac Vibert (via Claude Code) | Canvas 2D code | project-original | |
| "Dockside" night stage painting | AI-generated image, converted | Zac Vibert (AI image tool) | ChatGPT image generation + engine conversion | project asset (AI-generated; original composition) | art-src/stages/dockside/refs/master.png -> public/assets/stages/dockside/painting.png |
| Dockside rain overlay (3-frame strip) | procedural gfx | Zac Vibert (via Claude Code) | Canvas 2D generator script | project-original | |
| VIKTOR V character poses (21 stills) | AI-generated images, converted to sprite sheet | Zac Vibert (AI image tool) | ChatGPT image generation + tools/ingest-character.mjs | **UNLICENSED PITCH DEMO** — design depicts a real artist's persona/mask; created to pitch a licensed game to the rights holders. Not cleared for public release. | art-src/viktor-v/poses/ -> public/assets/characters/viktor-v/ |

Rules (see docs/FIGHTING_GAME_PLAN.md §2):

- No sprites, sounds, music or names from any commercial game — ever.
- No downloaded MUGEN/community fighting-game content.
- AI-generated images may be used as *concept references only*; shipped art is
  hand-made (pixelled) and logged here.

## Release status

**This build is a PITCH DEMO, not a public release.** The VIKTOR V character
depicts a real recording artist's persona and mask, used without a licence for
the sole purpose of pitching a licensed game to the rights holders. Do not
merge to `main` / publish to zacvibert.github.io unless and until the estate
grants permission. Demo it from a local build (`npm run dev`) or a private
preview. If the pitch does not proceed, replace the mask design (see
docs/design/characters/fighter-zero-visual-identity.md) before any release.
