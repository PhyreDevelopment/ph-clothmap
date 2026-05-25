# ph-clothmap

In-game React NUI capture tool that maps **GTA freemode gloves to their
bare-arms parents** (component 3). Pure data resource — no ped manipulation,
no inventory wiring. ph-inventory (or any consumer) reads the answers via
exports and applies them itself.

Run `/clothmap` in-game (requires ACE `command.clothmap`) to capture mappings.
**After each capture session, commit `shared/cloth_map.lua` to git.** Server
redeploys overwrite the resources tree and will erase uncommitted work.

## Exports

| Export | Returns |
|---|---|
| `IsBareArms(gender, drawable)` | bool |
| `GetBareArmsForGlove(gender, drawable)` | drawable or nil |
| `PickGloveForRange(gender, range[], requiredBare)` | drawable or nil |
| `GetClothMap()` | full in-memory map |

`gender` is `'male'` or `'female'`. `drawable` is a component-3 drawable id.
`range` is the array of variants stored in a glove item's metadata.

## Consumer flow

**Equip a glove** (player puts a glove item on):
```lua
local currentBare = readPlayerCurrentBare(ped, gender)  -- your inventory's job
local picked = exports['ph-clothmap']:PickGloveForRange(
    gender, item.metadata.range, currentBare
)
if picked then
    SetPedComponentVariation(ped, 3, picked, 0, 0)
end
```

**Unequip a glove** (player removes the glove item — switch torso back to the
same arm style without the glove):
```lua
local currentGlove = GetPedDrawableVariation(ped, 3)
local bare = exports['ph-clothmap']:GetBareArmsForGlove(gender, currentGlove)
if bare then
    SetPedComponentVariation(ped, 3, bare, 0, 0)
end
```

## Capture workflow (UI)

1. `/clothmap` opens the panel. Ped switches to freemode (male/female toggle in topbar).
2. **Bares** tab: star the comp-3 drawables that are "naked arms" (no glove on them). These populate the swatch on the Gloves tab.
3. **Gloves** tab:
   - Click a glove tile → ped wears it.
   - Click the bare-arms swatch that visually fits → mapping saved (`gloves[d] = bare`).
   - Click the same tile again to toggle the glove off and compare.
   - "clear" pill in the status bar removes a mapping.
4. **Save** writes `shared/cloth_map.lua`, bumps `version`, hot-reloads in-memory.
5. Commit the file.

## Data file shape

```lua
return {
    version = 7,
    bares = {
        male   = { 0, 1, 2, 4, 5, 6, 8, 11, 12, 14, 15 },
        female = { 0, 1, 2, 3, 4, 5, 6, 7, 9, 11, 12, 14, 15 },
    },
    gloves = {
        male   = { [16]=4, [17]=4, ... },  -- gloveDrawable = bareArmsDrawable
        female = { [16]=11, [17]=3, ... },
    },
}
```

Seed values come from `qbx_radialmenu/client/clothing.lua`.
