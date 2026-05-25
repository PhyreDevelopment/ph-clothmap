# ph-clothmap

In-game React NUI capture tool for FiveM clothing component relationships, plus
runtime exports used by inventory consumers to translate equip/unequip events
into correct ped component state.

Components covered:
- **3** (Torso/Arms): gloves and the bare-arms parents they sit on
- **8** (Undershirt): shirts and the bare-arms parents they sit on
- **11** (Top/Jacket): two flavours — standalone jackets sitting on bare-arms,
  or layered tops sitting on a shirt

Run `/clothmap` in-game (requires ACE `command.clothmap`) to capture mappings.
**After each capture session, commit `shared/cloth_map.lua` to git.** Server
redeploys overwrite the resources tree and will erase uncommitted work.

## Exports (read-only, both client and server)

| Export | Returns |
|---|---|
| `IsBareArms(gender, drawable)` | bool |
| `GetBareArmsForGlove(gender, drawable)` | bare-arms drawable or nil |
| `PickGloveForRange(gender, range[], requiredBare)` | drawable or nil |
| `GetBareArmsForShirt(gender, drawable)` | bare-arms drawable or nil |
| `PickShirtForRange(gender, range[], requiredBare)` | drawable or nil |
| `GetBareArmsForJacket(gender, drawable)` | bare-arms drawable or nil |
| `GetInnershirtForTop(gender, drawable)` | innershirt drawable or nil |
| `PickTopForRange(gender, range[], requiredInner)` | drawable or nil |
| `IsInnershirt(gender, drawable)` | bool (is it a canonical shirt) |
| `GetFallbackTopForInnershirt(gender, drawable)` | fallback top or nil |
| `GetClothMap()` | the full in-memory map |

## Layering model

```
       gloves (comp 3)  → bare-arms (comp 3)
       shirts (comp 8)  → bare-arms (comp 3)
   jacket (comp 11)     → bare-arms (comp 3)
 layered top (comp 11)  → shirts (comp 8) → bare-arms (comp 3)
```

A consumer resolves which bare-arms drawable applies "right now" by walking
the chain top-down. Glove fit is then derived from the resolved bare-arms.

## Cascade reference for inventory consumers

```lua
-- After any clothing change, resolve the right component state.
-- `state` is the player's current intent: { topItem, shirtItem, gloveItem }
-- Each item carries a drawable `range` (array of comp drawables it can map to).
local function applyState(ped, gender, state, naturalBare)
    local bare = naturalBare

    -- 1) Resolve bare-arms from the *upper* layer if present.
    --    shirts win over jackets win over naturalBare.
    if state.shirtItem and state.shirtItem.currentDrawable then
        local shirtBare = exports['ph-clothmap']:GetBareArmsForShirt(gender, state.shirtItem.currentDrawable)
        bare = shirtBare or bare
    end
    if state.topItem and state.topItem.currentDrawable then
        local jacketBare = exports['ph-clothmap']:GetBareArmsForJacket(gender, state.topItem.currentDrawable)
        if jacketBare then bare = jacketBare end
    end

    -- 2) Set comp 3 to the right bare-arms-or-glove drawable.
    if state.gloveItem then
        local pick = exports['ph-clothmap']:PickGloveForRange(gender, state.gloveItem.range, bare) or bare
        SetPedComponentVariation(ped, 3, pick, 0, 0)
    else
        SetPedComponentVariation(ped, 3, bare, 0, 0)
    end

    -- 3) Comp 8: shirt or empty.
    if state.shirtItem then
        local pick = exports['ph-clothmap']:PickShirtForRange(gender, state.shirtItem.range, bare)
        SetPedComponentVariation(ped, 8, pick or 15, 0, 0)
    else
        SetPedComponentVariation(ped, 8, 15, 0, 0)
    end

    -- 4) Comp 11: jacket or layered top or empty.
    if state.topItem then
        local d = state.topItem.currentDrawable
        SetPedComponentVariation(ped, 11, d, 0, 0)
    else
        SetPedComponentVariation(ped, 11, 15, 0, 0)
    end
end
```

For the specific case the user asked about — "ped has top + shirt, removes both":

```lua
-- Pop both items, then re-run applyState with state.topItem = nil,
-- state.shirtItem = nil. The cascade falls through to naturalBare and the
-- glove picker re-resolves automatically.
state.topItem = nil
state.shirtItem = nil
applyState(ped, gender, state, naturalBare)
```

`naturalBare` is the character's stored "true skin" bare-arms drawable (lives
in your appearance system, not in this resource).
