# Spatial renders — Content, binaural (results/)

The 9 `(prompt, generated)` mono pairs in `../ori/` are **split across the three motion
types** — random 3 pairs render as `static`, 3 as `move`, 3 as `orbit` — and the three
pairs inside a motion **share one sampled spatial parameter set**, so they can be compared
under an identical spatial condition.

```
../ori/  9 pairs
   |  random partition (fixed seed)
   +--> static : slots 01, 02, 05          <- ONE static position
   +--> move   : slots 07, 09, 06          <- ONE move trajectory
   +--> orbit  : slots 04, 03, 08          <- ONE orbit trajectory

results/  18 wavs = 9 pairs x (prompt + generated)
```

## Provenance

| | |
|---|---|
| Speech under test | the same 9 samples as `../ori/` (model + provenance in `../ori/README.md`) |
| Renderer | `/data/spatialdata/spatialdata` (`BinauralRenderer` + KEMAR sofa HRTF), driven through the reference wrapper `speecheditbench_spatial/render_spatial.py` |
| HRTF | `/data/spatialdata/hrtf_data/kemar.sofa` — native 48 kHz, 192 taps, resampled to the render rate |
| Script | `/mnt/ttsjfs/yjchen/render_demo_spatial.py` (writes this README) |
| Output | 16 kHz stereo, 32-bit float, 2 ch |

## Files

```
<motion>_<NN>_<item_id>_prompt.wav       binaural render of ../ori/<NN>_<item_id>_prompt.wav
<motion>_<NN>_<item_id>_generated.wav    binaural render of ../ori/<NN>_<item_id>_generated.wav
<motion>_<NN>_<item_id>_edit.txt         the edit instruction, copied verbatim from ../ori/
manifest.jsonl                            partition + params + levels
```

`<motion>` ∈ static / move / orbit, `<NN>` is the slot number in `../ori/`. The three files of
a pair share a stem, so they sort together; `_edit.txt` is **one file per pair**, not per wav —
both wavs come from the same instruction. A given pair appears under **exactly one** motion,
so `static_03_…` and `move_…` never refer to the same pair. `manifest.jsonl` records, per
render, the motion, the group position, the slot, the `edit_file` name, the full parameter
set, the mono source, the duration, and levels before/after normalization.

## Spatial parameters

Ranges match the bench's own spatial set: az 0–360°, el −40…60°, dist 0.3–5 m.

| motion | shared params for this folder |
|---|---|
| static | az=353.842, el=41.889, dist=4.162 |
| move | az0=211.178, el0=38.23, d0=1.366, el1=8.243, d1=1.325, daz=126.33, h0=0.225, h1=0.197 |
| orbit | el=-7.569, dist=3.161, az0=85.146, revs=1.178, direction=1.0 |

- **static** — one fixed `(az, el, dist)`.
- **move** — a straight sweep between two `(az, el, dist)` points, with 10–25 % holds at each
  end (`h0/h1`).
- **orbit** — circles the listener at constant `el`/`dist`, 0.5–2.0 revolutions, random
  direction (`direction ±1`).

Because the whole clip is the trajectory, `move`/`orbit` travel for the entire duration: a
5 s pair moves fast, a 20 s pair moves slowly relative to its content — the trajectory is not
tied to word or sentence boundaries.

## Levels

Normalized exactly like the sibling `../ori/` folders: **RMS −20 dBFS target, peak capped at
−1 dBFS**, one plain per-file gain (no compression, dynamics untouched). Gains applied ran
**+0.7 to +16.4 dB**; realized generated RMS **-31.9 to
-24.3 dBFS**, all peaks ≤ −1.0 dBFS.

⚠️ **This levels out the distance loudness cue** — every render is about equally loud. Good
for A/B listening (volume differences would otherwise confound it), but *not* what the
bench's spatial set does: it keeps the raw distance gain, which in an unnormalized render
spanned a 13 dB RMS range with the far end at −45 dBFS RMS and the near end hitting the clip
guard at +5.4 dBFS peak. **Direction cues are unaffected** — measured mean |ILD| over the 9
generated renders here is **2.79 dB** (range 0.79 to 5.56 dB; low for
frontal positions, high for lateral ones). Re-render with `--no-normalize` for the raw bench
behaviour.

## Caveats worth knowing when listening

- **Each pair exists under only one motion.** If a page wants to compare the same edit across
  static/move/orbit, that comparison does not exist in this folder — the re-partition makes
  the three motions cover disjoint pairs. Re-run with a different seed to reshuffle.
- **The three pairs in a motion sit at the same place.** That is the point (comparable
  condition), but it also means you cannot tell position and content apart *within* a motion —
  use `../ori/` to hear the content change cleanly.
- **Distance now reads as timbre, not loudness**, because of the normalization — a close
  source sounds brighter/dryer rather than louder.
- **Spatialization does not fix the speech.** Whatever `../ori/README.md` flags as the
  weakness of a sample (misplaced insert, noisy source, near-vacuous removal) is still true
  here, and a binaural image can make the edit harder to judge, not easier.
- Renders are 16 kHz by request (bench-consistent). The HRTF is native 48 kHz, so 16 kHz
  limits usable directional cues to below 8 kHz; 24 kHz would preserve more of the
  elevation-relevant high band.
