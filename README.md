# Leonida Trophy Ledger — GTA VI Trophy Guide & Tracker

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Dvifnyz/makefun-gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Dvifnyz/makefun-gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline guide and tracker for all **55 PlayStation 5 trophies of Grand Theft Auto VI**:
1 platinum, 2 gold, 6 silver and 46 bronze — 0 online trophies.

## What it is

A static web app under `app/` — no build step, no network. Open `app/index.html`
in a desktop browser (or serve `app/` with any static server) and it works with the
network off.

- **Tracker**: every trophy with its official name, description and grade as
  PlayStation publishes them; a checklist saved in `localStorage`, exportable to
  a file and importable back; filters by kind (story, missable, collectibles,
  activities, online) plus search; a spoiler setting that hides story trophy
  names and descriptions until they are earned.
- **Guides**: a guide in our own words for each trophy, with its sources named
  beside it — the official list (Exophase / PSNProfiles) and PowerPyx's
  launch-day trophy guide. Four hidden trophies have no confirmed unlock method
  at launch; the guide says so plainly instead of guessing.
- **Roadmap to the platinum**: three stages built from the official descriptions
  and PowerPyx's roadmap (story 60–80h, 100% checklist ~100h, cleanup ~10h;
  difficulty 4/10, about 200 hours, one playthrough).
- **Missable flags**: only one trophy is reported as potentially missable —
  Positive Mental Attitude, because of the Chapter 1 balcony meditation.

## Try it

```sh
python3 -m http.server 8080 --directory app
# open http://localhost:8080
```

Deep links: `?view=roadmap|missable|sources`, `?detail=<trophy id>`,
`?seed=<n>` seeds the first n trophies as earned (demo screenshots).

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, stdlib only) copies `app/` and `screenshots/` to the
output directory and writes `dossier.json` with the vendored make.fun library
(`vendor/makefun-frontend.ts`, unchanged from the kit).

## Sources

- Official trophy list: https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/
- Names, grades and PSN targets: https://psnprofiles.com/trophies/43531-grand-theft-auto-vi
- How-to detail: https://www.powerpyx.com/gta-6-grand-theft-auto-vi-trophy-guide-roadmap/

Full research notes: `../makefun/state/gta6-trophies-research.md` (in the
builder's workspace, not part of this repo).

## License

MIT — see [LICENSE](LICENSE). This is an unofficial fan guide. Grand Theft Auto
and GTA are trademarks of Take-Two Interactive; the guide uses no Rockstar logo,
artwork, box art or game screenshots.

Built for the [make.fun](https://make.fun/bounty/gta6-trophy-guide-01) bounty
`gta6-trophy-guide-01`. Referral code: `b8pznreq`.
