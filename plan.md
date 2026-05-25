# `ph-glovemap` — glove-group, jacket↔arms, and top↔innershirt mapping tool

## Context

The user is building an inventory where gloves and tops live as items. Each item carries a *drawable range* (e.g. a glove item with range `[20, 21, 22, 23, 24, 25, 26]`). When the player wears a specific jacket variant, only **one** drawable inside that range will visually fit the player's current arm style — the one whose bare-arms parent matches the bare-arms drawable that jacket demands. The same idea now extends to tops (component 11) needing to match the player's currently-worn innershirt (component 8).

GTA freemode components covered by this tool:

- **Component 3** — Torso/Arms (gloves + bare-arms parents).
- **Component 8** — Undershirt ("innershirt").
- **Component 11** — Torso/Jacket ("top").

To pick the right drawable at equip time, the inventory consumer needs three static lookups:

1. **Glove groups** — a set of drawables that all represent the *same physical glove* but each sits on a different bare-arms style (skin tone × sleeve length). Stock freemode has ~11 bare-arms styles (`0, 1, 2, 4, 5, 6, 8, 11, 12, 14, 15`), so a single glove group has ~11 members. Defined first.
2. **Jacket → required bare-arms** — for each component-11 (jacket) drawable, which component-3 bare-arms drawable is required for the sleeves/cuffs to render correctly. Defined second.
3. **Top ↔ innershirt (bidirectional)** — the new mapping, defined third:
   - **Top → required innershirt (forward)**: same structural pattern as gloves. Tops also live as inventory items with a drawable range; at equip time the consumer picks the drawable whose required innershirt (component 8) matches the player's currently-worn innershirt. Captured as `topGroups` where each group's `members` map is `topDrawable → requiredInnershirtDrawable`.
   - **Innershirt → fallback top (inverse)**: when the player removes their currently-equipped top item, the system swaps component 11 to a top drawable that visually matches their innershirt, so they aren't left with a clipping/empty torso. Stored as `innershirtToFallbackTop[gender][innershirtDrawable] = topDrawable` — a single drawable, not a group.

`qbx_radialmenu/client/clothing.lua` already ships a flat `gloveDrawable → bareArms` table for both genders — that remains the **only** auto-seed source, and only for `gloveGroups`. No qbx-style seed exists for component 8 ↔ 11, so `innershirts`, `topGroups`, and `innershirtToFallbackTop` all start empty and are built entirely in-game. The jacket map likewise starts empty (unchanged from the original plan).

**Deliverable**: a standalone resource `[standalone]/ph-glovemap` (directory on disk: `ph-clothmap`; see Open questions about whether the resource itself should also be renamed) containing the seed data, an in-game React NUI capture tool, and **eight** consumer-facing exports. The "apply on equip" / "swap on unequip" inventory wiring is out of scope — the user will build it on top of these exports.

## Data model (`shared/glove_map.lua`)

```lua
return {
    version = 2,                          -- schema v2: adds innershirts, topGroups, innershirtToFallbackTop
    bares = {                             -- canonical "bare-arms" (component 3) drawable ids per gender
        male   = { 0, 1, 2, 4, 5, 6, 8, 11, 12, 14, 15 },
        female = { 0, 1, 2, 4, 5, 6, 8, 11, 12, 14, 15 },
    },
    innershirts = {                       -- canonical "innershirt" (component 8) drawable ids per gender
        male   = { --[[ captured live; e.g. { 0, 2, 15, 31, 57 } ]] },
        female = { --[[ captured live ]] },
    },
    gloveGroups = {                       -- glove (component 3) → bare-arms parent
        male = {
            { name = "group_1", members = { [19]=0, [20]=1, [21]=2, [22]=4, [23]=5, [24]=6, [25]=8, [26]=11, [27]=12, [28]=14, [29]=15 } },
            { name = "group_2", members = { [30]=0, [31]=1, [32]=2, [33]=4, [34]=5, [35]=6, [36]=8, [37]=11, [38]=12, [39]=14, [40]=15 } },
            -- ... auto-clustered from qbx seed
        },
        female = { -- same shape -- },
    },
    jacketToArms = {                      -- component 11 (jacket) → required component 3 (bare-arms)
        male   = { --[[ [jacketDrawable] = bareArmsDrawable, captured live ]] },
        female = { --[[ ... ]] },
    },
    topGroups = {                         -- top (component 11) → required innershirt (component 8) — NEW
        male = {
            -- captured live (no qbx seed available); example after a session:
            -- { name = "group_1", members = { [15]=2, [16]=0, [17]=15, [18]=31 } },
        },
        female = {},
    },
    innershirtToFallbackTop = {           -- inverse: component 8 → component 11 fallback — NEW
        male   = { --[[ [innershirtDrawable] = topDrawable, captured live; e.g. [2]=15, [0]=16 ]] },
        female = { --[[ ... ]] },
    },
}
```

Schema notes:

- `gloveGroups[g][n].members` and `topGroups[g][n].members` are *flat* `childDrawable → parentDrawable` lookups. Grouping is purely an editing convenience exposed in the UI. The consumer never needs to know group names — it iterates `.members` on each group.
- `innershirts` plays the exact role for tops that `bares` plays for gloves/jackets: the canonical-parent set used by the swatch strip and by `IsInnershirt`.
- `innershirtToFallbackTop` is a flat lookup (no groups) because the inverse direction is one drawable per innershirt.
- `version` is bumped on every save; consumers can use it to invalidate any cache. The seed jump from `1` to `2` reflects the three new fields.

## Resource layout

```
I:\FIVEM\Servers\RealServer\txData\Server\resources\[standalone]\ph-glovemap\
├── fxmanifest.lua
├── README.md                  -- 5 lines: "commit shared/glove_map.lua after each session"
├── shared/
│   └── glove_map.lua          -- data, rewritten via SaveResourceFile
├── client/
│   └── main.lua               -- /glovemap, NUI focus, ped/component application, NUI callbacks
├── server/
│   └── main.lua               -- save callback (ACE-gated), file serialiser
└── web/
    ├── package.json, vite.config.ts, tsconfig.json, index.html
    └── src/
        ├── main.tsx, App.tsx, Nui.ts
        ├── theme.ts                       -- PH navy-gold tokens (copy of illenium App.tsx 18-48)
        ├── styles/global.ts
        ├── utils/thumbnails.ts            -- buildThumbUrl(gender, component, drawable) → uz_AutoShot URL
        ├── hooks/useGloveMap.ts           -- holds all 6 collections: bares, innershirts, gloveGroups, jacketToArms, topGroups, innershirtToFallbackTop
        ├── components/
        │   ├── Topbar.tsx                 -- gender toggle, [Gloves | Jackets | Tops | Innershirts] tabs, save button, "Saved HH:MM:SS" badge
        │   ├── DrawablePreview.tsx        -- live tile, uz_AutoShot src with #N fallback
        │   ├── BareSwatchStrip.tsx        -- horizontal strip of the canonical bare-arms styles, clickable
        │   ├── InnershirtSwatchStrip.tsx  -- NEW; horizontal strip of canonical innershirts, clickable
        │   ├── gloves/
        │   │   ├── GroupsPanel.tsx        -- list of groups, rename inline, add/remove members
        │   │   └── DrawableScroll.tsx     -- all drawables, highlight in-group/unassigned, click to add to active group
        │   ├── jackets/
        │   │   └── JacketMap.tsx          -- live jacket cycler, current `jacketToArms[d]` swatch + pick bare-arms
        │   ├── tops/                                -- NEW
        │   │   ├── TopGroupsPanel.tsx     -- mirrors gloves/GroupsPanel for component 11
        │   │   └── TopDrawableScroll.tsx  -- mirrors gloves/DrawableScroll, click → pick innershirt from InnershirtSwatchStrip
        │   └── innershirts/                         -- NEW
        │       ├── InnershirtList.tsx     -- DrawableScroll of canonical innershirts on the left
        │       ├── FallbackTopPicker.tsx  -- thumbnail picker of component-11 drawables for the selected innershirt
        │       └── CanonicalManager.tsx   -- "Mark as canonical" toggle sub-mode for declaring which component-8 drawables populate `innershirts`
        └── styles.ts                      -- the flat dark-navy chrome reused from illenium
```

## Step-by-step build

### 1. Scaffold + seed

- Create `fxmanifest.lua`:
  ```lua
  fx_version 'cerulean'
  game 'gta5'
  lua54 'yes'
  shared_scripts { '@ox_lib/init.lua', 'shared/glove_map.lua' }
  client_scripts { 'client/main.lua' }
  server_scripts { 'server/main.lua' }
  files { 'web/dist/index.html', 'web/dist/assets/*' }
  ui_page 'web/dist/index.html'
  ```
- **Seed `shared/glove_map.lua`** by running an offline one-shot Node/Lua script (kept in the repo as a comment, not part of the resource): read `[qbx]\qbx_radialmenu\client\clothing.lua` lines 8–~210 (`gloves.male` and `gloves.female`), then auto-cluster:
  - Walk the flat table in ascending drawable id.
  - Track which bare-arms values have appeared in the current group. As soon as the same bare-arms value appears a second time, close the group and start a new one.
  - Name groups sequentially `group_1`, `group_2`, …
  - Result: ~10–12 groups for male, similar for female, every drawable bucketed exactly once. The user will rename them in-game.
- `bares` lists come from the unique values of each gender's qbx map (`{0, 1, 2, 4, 5, 6, 8, 11, 12, 14, 15}` — verify by sorting the unique-set of qbx values).
- `jacketToArms` starts as `{ male = {}, female = {} }`.
- **New (schema v2)** — the following start empty for both genders and are built entirely in-game; **no qbx seed exists for component 8 ↔ 11**:
  - `innershirts = { male = {}, female = {} }`
  - `topGroups = { male = {}, female = {} }`
  - `innershirtToFallbackTop = { male = {}, female = {} }`

### 2. Client Lua (`client/main.lua`)

- Register `/glovemap` (gated client-side by `IsPlayerAceAllowed(..., 'command.glovemap')`; server enforces too).
- On invoke:
  - Snapshot the player's current model + appearance (`cache.ped`, `GetEntityModel`, and the result of `exports['illenium-appearance']:getPedAppearance` or equivalent — fallback to model-only if illenium isn't loaded).
  - Set model to `mp_m_freemode_01`. Disable damage / fall, freeze position; lift a simple front cam (no orbit needed — copy the static-cam pattern from `[standalone]/illenium-appearance/game/customization.lua` `setupCamera`).
  - `SetNuiFocus(true, true)`, `SendNuiMessage` with the loaded `shared/glove_map.lua` table.
- NUI callbacks the panel can invoke:
  - `glovemap:setGender { gender }` — swap model between freemode m/f, reset component 3, 8, 11 to drawable 0.
  - `glovemap:previewDrawable { component, drawable }` — `SetPedComponentVariation(cache.ped, component, drawable, 0, 0)`. Works for component 3 (gloves), 8 (innershirts), and 11 (jackets/tops).
  - `glovemap:previewBare { drawable }` — shorthand for `SetPedComponentVariation(cache.ped, 3, drawable, 0, 0)` (Jackets tab).
  - `glovemap:previewInnershirt { drawable }` — **NEW**, shorthand for `SetPedComponentVariation(cache.ped, 8, drawable, 0, 0)` (Tops + Innershirts tabs). Mirrors `previewBare` exactly.
  - `glovemap:save { fullMapPayload }` — fire-and-forget to `lib.callback.await('glovemap:server:saveMap', false, payload)`; resolves with `{ ok, version, savedAt }` so the NUI can update the status badge inline. After a successful save, also live-rebuild the resource's in-memory copy of `shared/glove_map.lua` so the exports return fresh data without a restart. The payload now carries the three new fields (`innershirts`, `topGroups`, `innershirtToFallbackTop`); nothing else changes about the save flow.
  - `glovemap:close` — release NUI focus, destroy cam, restore the snapshotted model + appearance. If illenium is loaded, call `TriggerEvent('illenium-appearance:client:reloadSkin', true)` (defined in `[standalone]/illenium-appearance/client/client.lua` ~L712) to bring back the original outfit cleanly.
- Eight exports (see step 4).

### 3. Server Lua (`server/main.lua`)

- `lib.callback.register('glovemap:server:saveMap', function(source, payload) ... end)`:
  - Reject if `not IsPlayerAceAllowed(source, 'command.glovemap')`.
  - Shape-validate (any violation → `return { ok = false, error = 'shape' }`):
    - `payload.bares.male/female` is `{ number, ... }`.
    - `payload.innershirts.male/female` is `{ number, ... }`. **NEW.**
    - Every `gloveGroups[g][n].members` is `{ [number] = number, ... }`.
    - Every `topGroups[g][n].members` is `{ [number] = number, ... }`. **NEW.**
    - Every `jacketToArms[g][drawable] = bareArms` is `number → number`.
    - Every `innershirtToFallbackTop[g][innershirt] = top` is `number → number`. **NEW.**
  - Bump `payload.version = (currentVersion or 1) + 1`.
  - Serialise to Lua source via the small hand-rolled writer (header `return {`, then nested numeric-key tables, recursive). The writer is the same one already required for `gloveGroups` and `jacketToArms`; the three new fields hit the exact same code paths (list of numbers, list of named tables with numeric-keyed `members`, flat numeric-keyed map). Don't use `lib.table.serialize` if it doesn't preserve numeric keys cleanly — verify on a small fixture before committing to it.
  - `SaveResourceFile(GetCurrentResourceName(), 'shared/glove_map.lua', serialized, -1)`.
  - Return `{ ok = true, version, savedAt = os.date('%H:%M:%S') }`.
- ACE gate, validation, and hot-reload behavior are identical for all three mappings — there is no per-field special-casing.

### 4. Consumer-facing exports (live in `client/main.lua` and `server/main.lua`)

Re-load `shared/glove_map.lua` on every resource start AND after every successful save. The public contract grows from four to **eight** exports — the original four are unchanged:

```lua
local map -- module-local, populated at load + after save

-- ===== Existing four =====

-- Returns true if `drawable` is a bare-arms variant for this gender.
local function IsBareArms(gender, drawable)
    for _, id in ipairs(map.bares[gender] or {}) do if id == drawable then return true end end
    return false
end
exports('IsBareArms', IsBareArms)

-- Given a glove drawable, return its bare-arms parent (or `drawable` itself if it IS a bare-arms).
local function GetBareArmsForGlove(gender, drawable)
    if IsBareArms(gender, drawable) then return drawable end
    for _, group in ipairs(map.gloveGroups[gender] or {}) do
        local parent = group.members[drawable]
        if parent then return parent end
    end
    return nil
end
exports('GetBareArmsForGlove', GetBareArmsForGlove)

-- Jacket drawable → required bare-arms.
local function GetBareArmsForJacket(gender, jacketDrawable)
    return (map.jacketToArms[gender] or {})[jacketDrawable]
end
exports('GetBareArmsForJacket', GetBareArmsForJacket)

-- Pick the right glove from an inventory item's range given the required bare-arms.
local function PickGloveForRange(gender, range, requiredBare)
    for _, candidate in ipairs(range) do
        if GetBareArmsForGlove(gender, candidate) == requiredBare then return candidate end
    end
    return nil
end
exports('PickGloveForRange', PickGloveForRange)

-- ===== New four (top ↔ innershirt) =====

-- Returns true if `drawable` is a canonical innershirt for this gender.
local function IsInnershirt(gender, drawable)
    for _, id in ipairs(map.innershirts[gender] or {}) do if id == drawable then return true end end
    return false
end
exports('IsInnershirt', IsInnershirt)

-- Given a top (component 11) drawable, return its required innershirt (component 8).
-- Mirrors GetBareArmsForGlove: walks every topGroups[gender][n].members.
local function GetInnershirtForTop(gender, drawable)
    for _, group in ipairs(map.topGroups[gender] or {}) do
        local parent = group.members[drawable]
        if parent then return parent end
    end
    return nil
end
exports('GetInnershirtForTop', GetInnershirtForTop)

-- Pick the right top from an inventory item's range given the player's currently-worn innershirt.
-- Mirrors PickGloveForRange exactly.
local function PickTopForRange(gender, range, requiredInnershirt)
    for _, candidate in ipairs(range) do
        if GetInnershirtForTop(gender, candidate) == requiredInnershirt then return candidate end
    end
    return nil
end
exports('PickTopForRange', PickTopForRange)

-- Inverse direction: given the player's currently-worn innershirt, what fallback top should we
-- equip when the player removes their top item?
local function GetFallbackTopForInnershirt(gender, innershirtDrawable)
    return (map.innershirtToFallbackTop[gender] or {})[innershirtDrawable]
end
exports('GetFallbackTopForInnershirt', GetFallbackTopForInnershirt)
```

These eight exports are the entire public contract. No database, no events, no inventory wiring lives in this resource.

### 5. NUI (`web/src/`)

- Vite + React + styled-components + `@tabler/icons-react`. Copy the PH navy-gold theme tokens from `[standalone]/illenium-appearance/web/src/App.tsx:18-48` into `theme.ts` so the new tool visually matches the rest of the project.
- Reuse the uz_AutoShot URL convention from `[standalone]/illenium-appearance/web/src/utils/thumbnails.ts:10-21`, parameterised so we can hit any component (`shots/${gender}/${component}/${drawable}.png`). Components 3, 8, and 11 are all addressable by the same builder. Use the `onError → setBroken` placeholder pattern from `[standalone]/illenium-appearance/web/src/components/Appearance/components/ThumbnailGrid.tsx:108-141`.
- Layout (flat dark-navy chrome — same minimal aesthetic the user just dialled in for illenium):

#### Topbar

- Gender toggle (`Male | Female`).
- Tab toggle with **four** segments: `Gloves | Jackets | Tops | Innershirts`. (Renamed "Glove groups" → "Gloves" for parity with "Tops"; "Innershirts" is the inverse-mapping tab.)
- `Save` button → shows `Saved 14:32:08` inline after success. One save persists *all* four sections.

#### Gloves tab (unchanged from original plan)

- Left column: list of groups. Click to make active. Inline-rename. `+ New group`.
- Right column top: `BareSwatchStrip` showing the canonical bare-arms styles for the gender.
- Right column main: `DrawableScroll` — every drawable in component 3 from 0 to ~150. Tiles in the active group glow gold; tiles in other groups are dimmed and tagged with their group name; unassigned tiles are neutral. Click an unassigned tile → "Which bare-arms is this glove built on?" → user picks from the swatch strip → drawable joins the active group with that mapping. Clicking a tile already in the active group removes it.
- Live ped previews whatever tile the user hovers (debounced 150ms) via `glovemap:previewDrawable { component=3, drawable=N }`.

#### Jackets tab (unchanged from original plan)

- Left column: every component-11 drawable as a scrollable column (thumbnail tile + drawable id).
- Right column top: the same `BareSwatchStrip`.
- Click a jacket → ped puts on the jacket (`previewDrawable { component=11, drawable=N }`). User clicks bare-arms swatches to preview each (`previewBare`). Click "Lock as required bare-arms" → records `jacketToArms[gender][jacketDrawable] = bareArms`. Inline readout shows current assignment per jacket.

#### Tops tab (NEW — mirrors Gloves)

- Left column: list of top groups. Click to make active. Inline-rename. `+ New group`. Starts empty (no seed).
- Right column top: `InnershirtSwatchStrip` showing the canonical innershirts for the gender (populated from `innershirts[gender]` — empty until the user marks some on the Innershirts tab).
- Right column main: `TopDrawableScroll` — every drawable in component **11** from 0 to ~200, each as a tile. Same glow/dim/neutral states as the Gloves tab (in active top group / in another top group / unassigned).
- **Click flow** (mirrors gloves):
  1. User clicks an unassigned top tile.
  2. Prompt: *"Which innershirt is this top built on?"* — user picks from the `InnershirtSwatchStrip`.
  3. Drawable joins the active top group with `members[topDrawable] = chosenInnershirt`.
- **Live preview behavior** (the only divergence from gloves):
  - Hovering a top tile fires `previewDrawable { component=11, drawable=N }` so the ped wears the top.
  - Simultaneously, hovering a swatch in the `InnershirtSwatchStrip` fires `previewInnershirt { drawable=S }` so the ped's component 8 changes underneath. This lets the user judge fit by hovering across the strip while the top stays on.
  - Both work independently — a top tile click sets the equipped top; swatch hovers cycle the innershirt below it.
- Clicking a tile already in the active group removes it (same as gloves).

#### Innershirts tab (NEW — inverse mapping + canonical declaration)

Two sub-modes selectable via a small inner toggle at the top of the tab: **Manage fallbacks** (default) and **Manage canonicals**.

- **Manage fallbacks** (default sub-mode):
  - Left column: `InnershirtList` — a `DrawableScroll` of every drawable already in `innershirts[gender]` (i.e. only the user's declared canonical innershirts; no point listing every component-8 drawable here because the inverse map is by definition over the canonical set).
  - Selecting an innershirt on the left fires `previewInnershirt { drawable=S }` and equips component 11 with the currently recorded fallback (if any) so the user sees the pair live.
  - Right column: `FallbackTopPicker` — a thumbnail grid of every component-11 drawable. Hover fires `previewDrawable { component=11, drawable=N }`. Click → records `innershirtToFallbackTop[gender][selectedInnershirt] = N`. The currently-recorded fallback tile glows gold.
  - Inline readout per innershirt: `innershirt 2 → fallback top 15`. Click an "X" beside it to clear.
- **Manage canonicals** sub-mode:
  - Left column collapses; right column becomes a full-width `DrawableScroll` of every component-8 drawable from 0 to ~150 (same tile style used elsewhere).
  - Each tile has a "Mark as canonical" toggle (a small star icon in the corner, gold when marked). Clicking the tile body previews it on the ped via `previewInnershirt`; clicking the star toggles membership in `innershirts[gender]`.
  - When the user toggles a drawable *off* canonical, the UI warns if it currently has a fallback recorded (`innershirtToFallbackTop[gender][drawable]` exists) or is referenced by any `topGroups` member — confirms before discarding to keep the dataset consistent.
  - Switching back to **Manage fallbacks** automatically refreshes the `InnershirtList` from the updated canonical set.

The reason canonical declaration lives on the Innershirts tab (rather than the Tops tab where the strip is consumed) is that the canonicals are the *anchor* of the inverse map — they are the only innershirts the user will care to define fallbacks for, and they are also the only ones that should appear in the `InnershirtSwatchStrip` on the Tops tab. Co-locating with the inverse map keeps the data-declaration UX in one place.

#### Cross-tab data flow

- `useGloveMap.ts` is the single in-memory source of truth: `{ version, bares, innershirts, gloveGroups, jacketToArms, topGroups, innershirtToFallbackTop }`. Each tab mutates its slice.
- `Save` always serialises the *full* in-memory map (all six collections) and posts to Lua. The save badge updates from the response's `savedAt`.
- No reopen-to-verify flow: edits stay in memory; Save persists; the badge is the only feedback channel.

## Critical files referenced (read-only sources)

- `[qbx]\qbx_radialmenu\client\clothing.lua` lines 2–~210 (male + female `gloves` tables) — **seed data**, run the offline clustering script against this once. No equivalent seed exists for tops/innershirts.
- `[standalone]\illenium-appearance\web\src\App.tsx:18-48` — PH navy-gold theme tokens, copy into `theme.ts`.
- `[standalone]\illenium-appearance\web\src\utils\thumbnails.ts:10-21` — uz_AutoShot URL builder, generalise to take a `component` parameter (used for 3, 8, and 11).
- `[standalone]\illenium-appearance\web\src\components\Appearance\components\ThumbnailGrid.tsx:108-141` — broken-image `#N` placeholder pattern, reused for the component-8 and component-11 grids.
- `[standalone]\illenium-appearance\web\src\Nui.ts` — NUI `post()` helper pattern.
- `[standalone]\illenium-appearance\game\customization.lua` (`setupCamera`, `client.setPlayerModel`) — static-cam helper pattern.
- `[standalone]\illenium-appearance\client\client.lua` ~L712 (`illenium-appearance:client:reloadSkin`) — clean restore on close.

## Files to be created (no existing files modified)

- `[standalone]\ph-glovemap\fxmanifest.lua`
- `[standalone]\ph-glovemap\README.md`
- `[standalone]\ph-glovemap\shared\glove_map.lua`
- `[standalone]\ph-glovemap\client\main.lua`
- `[standalone]\ph-glovemap\server\main.lua`
- `[standalone]\ph-glovemap\web\package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- `[standalone]\ph-glovemap\web\src\` tree as listed in the layout, including the new `components/tops/` and `components/innershirts/` subtrees and `components/InnershirtSwatchStrip.tsx`.

`qbx_radialmenu/client/clothing.lua` is read once for the offline seed, never modified.

## Verification (single-session, no reopen loop)

1. **Boot** — `ensure ph-glovemap` in `server.cfg`; no Lua errors at start, no NUI 404s. Schema version on disk reports `2`.
2. **Seed sanity (no UI needed)** — from `txAdmin live console`:
   - `exports['ph-glovemap']:IsBareArms('male', 4)` → `true`
   - `exports['ph-glovemap']:GetBareArmsForGlove('male', 20)` → `1` (matches qbx seed)
   - `exports['ph-glovemap']:GetBareArmsForGlove('male', 0)` → `0` (bare → itself)
   - `exports['ph-glovemap']:PickGloveForRange('male', {20,21,22,23,24,25,26}, 4)` → `22` (whichever drawable in that range maps to bare-4 per the qbx seed)
   - `exports['ph-glovemap']:GetBareArmsForJacket('male', 5)` → `nil` (Phase B not captured yet — expected)
   - `exports['ph-glovemap']:IsInnershirt('male', 2)` → `false` (canonicals empty — expected)
   - `exports['ph-glovemap']:GetInnershirtForTop('male', 15)` → `nil` (topGroups empty — expected)
   - `exports['ph-glovemap']:GetFallbackTopForInnershirt('male', 2)` → `nil` (inverse map empty — expected)
3. **Phase A round-trip in one session** — admin with the ACE flag runs `/glovemap`. Panel opens on `Gloves`. Rename `group_1` to `tactical_black`. Move drawable 50 from `group_4` into `tactical_black`, picking bare-5 as its parent. Click `Save` → "Saved 14:32:08" badge appears. From another console window, `cat [standalone]/ph-glovemap/shared/glove_map.lua` → drawable `[50] = 5` lives inside the `tactical_black` group block.
4. **Phase B round-trip in same session** — switch to `Jackets` tab, click jacket drawable 12. Ped puts the jacket on. Cycle bare-arms swatches; click "Lock" on the one that fits → readout shows `jacket 12 → arms 8`. Click `Save`. File contains `jacketToArms.male[12] = 8`.
5. **Phase C round-trip — innershirts canonical declaration** — switch to `Innershirts` tab, flip into `Manage canonicals` sub-mode. Mark drawables 0, 2, and 15 as canonical (star toggles gold). Flip back to `Manage fallbacks`. The left list now shows three rows: `0, 2, 15`. Click `Save` → file contains `innershirts.male = { 0, 2, 15 }`. From console: `exports['ph-glovemap']:IsInnershirt('male', 2)` → `true`.
6. **Phase C round-trip — top groups forward map** — switch to `Tops` tab. Create `tee_white`. Click top drawable 15 → prompt asks for innershirt → pick `2` from the swatch strip → drawable 15 joins `tee_white` with `members[15] = 2`. Add drawables 16, 17, 18 mapping to innershirts 0, 15, 2 respectively (16 and 18 deliberately overlap on innershirt-2 to test `PickTopForRange` resolution). Click `Save`. From console:
   - `exports['ph-glovemap']:GetInnershirtForTop('male', 15)` → `2`
   - `exports['ph-glovemap']:GetInnershirtForTop('male', 17)` → `15`
   - `exports['ph-glovemap']:PickTopForRange('male', {15, 16, 17, 18}, 2)` → `15` (first match in the range with innershirt 2)
   - `exports['ph-glovemap']:PickTopForRange('male', {16, 17}, 2)` → `nil` (no member in that range maps to innershirt 2)
7. **Phase C round-trip — innershirt → fallback top inverse map** — back on `Innershirts` tab in `Manage fallbacks`. Select innershirt `2` on the left; click top drawable `15` in the `FallbackTopPicker` on the right (gold border appears). Select innershirt `0`; click top `16`. Click `Save`. From console:
   - `exports['ph-glovemap']:GetFallbackTopForInnershirt('male', 2)` → `15`
   - `exports['ph-glovemap']:GetFallbackTopForInnershirt('male', 0)` → `16`
   - `exports['ph-glovemap']:GetFallbackTopForInnershirt('male', 99)` → `nil`
8. **Live exports reflect saves** — without restarting the resource, all of the above values are already returning post-save (the save callback hot-reloaded the in-memory map). Re-run any export from step 5/6/7 to confirm.
9. **Clean close** — click the close button (or press Escape). The player's pre-`/glovemap` ped + outfit comes back unchanged; no NUI focus is stuck.
10. **Survives resource restart** — `restart ph-glovemap`. Repeat steps 5–7 — all values remain (read from disk on start). `cat shared/glove_map.lua` shows `version = 5` (one for each of the four saves in this session).

## Operational notes

- `SaveResourceFile` writes to the live resource folder on the host disk. The `README.md` will state in one sentence: *"After each capture session, commit `shared/glove_map.lua` to git. Server redeploys overwrite the resources tree and will erase uncommitted work."*
- Thumbnails will be patchy because uz_AutoShot on this server only generated `shots/male/{1,2,3,4,5,7}/` (prior session finding). Components 8 and 11 may have similarly incomplete coverage; the `#N` placeholder tile is sufficient for all four tabs. If the user later runs `/shotmaker` for components 3, 8, and 11, prettier tiles will appear automatically with no code change.
- ACE gate enforced **server-side** in the save callback, not just at the command. Payload shape-validated before file write to prevent a malformed-client write from corrupting `shared/glove_map.lua`. The three new fields use the same validators (`number → number` map; list-of-numbers; list-of-named-tables-with-numeric-keyed-members).
- The tool intentionally does not depend on illenium-appearance at runtime. The `illenium-appearance:client:reloadSkin` restore is best-effort; if illenium isn't loaded, fallback is a plain `SetPlayerModel(originalModel)` plus restoring components 0–11 (covers 3, 8, and 11 inclusively) from the snapshot taken on `/glovemap` open.
- The hand-rolled serialiser is the load-bearing piece for schema v2: verify on a small fixture that an empty `topGroups.male = {}` round-trips as `topGroups = { male = {}, female = {} }` and not as `topGroups = {}`, otherwise the consumer exports' `or {}` guards mask a silent data loss.

## Open questions

1. **Resource rename**: the directory on disk is `ph-clothmap` to reflect the broader scope (gloves + jackets + tops + innershirts), but every plan/code reference still says `ph-glovemap` (resource name, exports namespace `exports['ph-glovemap']`, command `/glovemap`, callback `glovemap:server:saveMap`, NUI message keys `glovemap:previewBare` etc.). Should the resource itself, the exports namespace, the command, and the callback/message prefixes all be renamed from `ph-glovemap` / `glovemap:` to `ph-clothmap` / `clothmap:` now, before any consumer wiring is built on top? Doing it later means an export-name migration in the inventory consumer; doing it now is one find-and-replace before the first save.
2. **Tops `DrawableScroll` upper bound**: gloves scan component 3 from 0 to ~150. Component 11 (tops) has noticeably more drawables on freemode peds (often 200+). Confirm whether the scroll should hard-cap at a known max or query `GetNumberOfPedDrawableVariations(cache.ped, 11)` once on tab open and use that.
3. **Canonical innershirts before tops are captured**: the Tops tab depends on `innershirts[gender]` being non-empty to populate its swatch strip. Should the Tops tab show a "Mark canonicals first" empty-state and link to the Innershirts tab, or silently render an empty strip and let the user discover the dependency? (Recommendation: the empty-state with a link — same affordance other PH tools use.)
4. **`GetInnershirtForTop` self-identity behavior**: `GetBareArmsForGlove` returns the drawable itself when the drawable *is* a bare-arms (treats canonicals as their own parent). Should `GetInnershirtForTop` do the analogous thing — i.e. if a drawable id happens to be both a canonical innershirt id *and* a top drawable id (numerically), return it unchanged? Components 8 and 11 are independent index spaces, so the analogy may not hold and this is probably a no-op, but worth confirming before shipping the export.
