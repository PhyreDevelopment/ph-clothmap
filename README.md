# ph-clothmap

In-game React NUI capture tool for FiveM clothing component relationships:
gloves (comp 3), jackets (comp 11 → comp 3), tops (comp 11 → comp 8), and
innershirt → fallback top (comp 8 → comp 11).

**After each capture session, commit `shared/cloth_map.lua` to git. Server
redeploys overwrite the resources tree and will erase uncommitted work.**

Run `/clothmap` in-game (requires ACE `command.clothmap`).
