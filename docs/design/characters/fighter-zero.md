# FIGHTER ZERO — grey-box template character

The reusable skeleton every real character starts from. All numbers live in
`src/characters/fighter-zero.json`; this doc is the design source of truth and
must stay in sync (the frame-data tests check the basics).

- **Visual identity:** none yet — a deliberate grey-box rectangle (P1 teal, P2 orange).
- **Fighting style / archetype:** all-rounder "shoto": fireball zoning, invincible
  reversal uppercut, standard normals. The baseline every other archetype deviates from.
- **Strengths:** complete toolkit, safe jab pressure, meterless reversal.
- **Weaknesses:** nothing exceptional; loses specialist matchups by design.
- **Counterplay:** block the sweep and punish; bait the Rising Fang and punish its
  26f recovery; jump over Zero Shot at range.

## Universal properties

| Property | Value |
|---|---|
| Health | 800 |
| Walk speed (fwd / back) | 2.4 / 1.8 px/tick |
| Prejump | 4f |
| Jump velocity | −11 y, ±2.6 x, gravity 0.6 |
| Throw range | 44 (+ pushbox width) |
| Blocking | hold back = stand block, down-back = crouch block; lows must be crouch-blocked, jump-ins stand-blocked; specials chip 25% |
| Knockdown | 45f down + 15f invulnerable wakeup |

## Move list (60 ticks = 1 second)

| Move | Input | Startup | Active | Recovery | Damage | Hitstun | Blockstun | Level | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Jab | LP | 4 | 3 | 6 | 25 | 14 | 9 | mid | special-cancelable |
| Straight | MP | 6 | 4 | 11 | 50 | 18 | 12 | mid | special-cancelable |
| Overhand | HP | 9 | 4 | 17 | 80 | 22 | 15 | mid | |
| Snap Kick | LK | 5 | 4 | 8 | 25 | 13 | 9 | mid | |
| Side Kick | MK | 8 | 4 | 13 | 50 | 17 | 12 | mid | |
| Roundhouse | HK | 11 | 5 | 19 | 80 | 21 | 15 | mid | |
| Crouch Kick | ↓+LK | 4 | 3 | 7 | 20 | 12 | 8 | **low** | special-cancelable |
| Sweep | ↓+HK | 8 | 4 | 21 | 70 | — | 14 | **low** | knockdown |
| Jump Punch | air P | 5 | 8 | to land | 60 | 18 | 12 | **high** | jump-in starter |
| Jump Kick | air K | 6 | 8 | to land | 65 | 18 | 12 | **high** | more range |
| Zero Shot | ↓↘→+P | 13 | proj. | 26 | 55 | 20 | 16 | mid | one on screen at a time |
| Rising Fang | →↓↘+P | 5 | 10 | 26 | 100 | — | 18 | mid | frames 1–8 invulnerable, knockdown |
| Shoulder Toss | close LP+LK | 3 | 2 | 16 | 110 | — | — | throw | unblockable, hard knockdown |

## Cancel routes

- Jab, Straight, Crouch Kick → Zero Shot or Rising Fang (on hit or block,
  within 6f after active frames).

## Intended combo routes

- Jump Punch → Jab → Straight → Zero Shot (blockstring / hit-confirm)
- Crouch Kick → Rising Fang (low starter into knockdown)
- Jab ×2 → Straight (link practice)

## Balancing notes

- Jab is +8 on hit (14 hitstun − 6 recovery), enabling links by design.
- Rising Fang on block is heavily punishable on purpose — reversal risk/reward.
- Tune pushback before adding a second character; corner pressure is untested.
