# ph-clothmap

In-game React NUI capture tool for FiveM clothing component relationships,
plus runtime exports used by inventory consumers to translate equip/unequip
events into correct ped component state.

Components covered:
- **3** (Torso/Arms): gloves and the bare-arms (skin) drawables they sit on
- **8** (Undershirt): inert here — the player either wears one (any drawable
  that's not `empty.shirt`) or doesn't (drawable equals `empty.shirt`)
- **11** (Top/Jacket): two flavours — standalone jackets sitting on bare-arms,
  or layered tops sitting on an innershirt

Run `/clothmap` in-game (requires ACE `command.clothmap`) to capture mappings.
**After each capture session, commit `shared/cloth_map.lua` to git.** Server
redeploys overwrite the resources tree and will erase uncommitted work.

## Config blocks

```lua
empty = {
    shirt = 15,  -- component 8 drawable that means "no shirt"
    top   = 15,  -- component 11 drawable that means "no top/jacket"
}

defaultBare = {
    male   = 0,
    female = 0,
}
```

- `empty` is read via `GetEmptyDrawable(component)`.
- `defaultBare` is read via `GetDefaultBare(gender)`. It's the bare-arms
  drawable used as the "fallback torso" when an item's range has no member
  fitted to the player's natural bare-arms. Set it on the **Bares** tab via
  the ⌂ button (only enabled on canonical bares).

## Exports (read-only, both client and server)

| Export | Returns |
|---|---|
| `IsBareArms(gender, drawable)` | bool |
| `GetBareArmsForGlove(gender, drawable)` | bare-arms drawable or nil |
| `PickGloveForRange(gender, range[], requiredBare)` | drawable or nil |
| `GetBareArmsForJacket(gender, drawable)` | bare-arms drawable or nil |
| `GetInnershirtForTop(gender, drawable)` | innershirt drawable or nil |
| `PickTopForRange(gender, range[], requiredInner)` | drawable or nil |
| `IsInnershirt(gender, drawable)` | bool (is it a canonical shirt) |
| `GetFallbackTopForInnershirt(gender, drawable)` | fallback top or nil |
| `GetEmptyDrawable(component)` | drawable or nil (component 8 / 11) |
| `GetDefaultBare(gender)` | drawable |
| `PickGloveWithFallback(gender, range, requiredBare)` | drawable, bareUsed, status |
| `PickJacketWithFallback(gender, range, requiredBare)` | drawable, bareUsed, status |
| `PickTopWithFallback(gender, range, requiredInner)` | drawable, innerUsed, status |
| `GetClothMap()` | the full in-memory map |

`status` returned by `*WithFallback` is `'exact'`, `'default'`, or `'mismatch'`.
- `'exact'`: a range member matched the player's bare-arms — use as-is.
- `'default'`: no member matched the natural bare, but one matches the
  configured `defaultBare`. The consumer should swap the player's bare-arms
  (comp 3) to `bareUsed` (the second return) before applying the picked
  drawable, so the layered fit is correct.
- `'mismatch'`: nothing matches even the default. The consumer was returned
  `range[1]` as a last resort; it'll look off.

## Layering model

Bare-arms (component 3) is a property of the character — their natural skin.
It does not change with clothes. Gloves are skin-tone-matched, so glove fit
always resolves from the character's `naturalBare`, regardless of what shirt
or top is currently on.

```
   gloves (comp 3)     → bare-arms (comp 3) = character.naturalBare
   shirts (comp 8)     → worn or not, but does not change bare-arms
   jacket (comp 11)    → bare-arms (comp 3)  (standalone)
   top    (comp 11)    → innershirts (comp 8) (layered)
```

## Cascade reference for inventory consumers

When the player removes a t-shirt (sets comp 8 to anything that isn't
`empty.shirt`), the torso must stay complete with the correct gloves:

```lua
local clothmap = exports['ph-clothmap']
local EMPTY_SHIRT = clothmap:GetEmptyDrawable(8)
local EMPTY_TOP   = clothmap:GetEmptyDrawable(11)

-- After any clothing change, resolve the right component state.
-- `state` is the player's current intent: { topItem, shirtItem, gloveItem }
-- Each item carries a drawable `range` (array of comp drawables it can map to).
local function applyState(ped, gender, state, naturalBare)
    -- Bare-arms (the skin) never changes. Glove fit always resolves from it.
    local bare = naturalBare

    -- Comp 3: gloved variant of bare-arms, or just bare-arms.
    if state.gloveItem then
        local pick = clothmap:PickGloveForRange(gender, state.gloveItem.range, bare) or bare
        SetPedComponentVariation(ped, 3, pick, 0, 0)
    else
        SetPedComponentVariation(ped, 3, bare, 0, 0)
    end

    -- Comp 8: shirt or empty.
    if state.shirtItem then
        -- Inventory consumer decides which drawable in the range to equip.
        SetPedComponentVariation(ped, 8, state.shirtItem.currentDrawable, 0, 0)
    else
        SetPedComponentVariation(ped, 8, EMPTY_SHIRT, 0, 0)
    end

    -- Comp 11: jacket or layered top or empty.
    if state.topItem then
        SetPedComponentVariation(ped, 11, state.topItem.currentDrawable, 0, 0)
    else
        SetPedComponentVariation(ped, 11, EMPTY_TOP, 0, 0)
    end
end

-- Equip path with auto-fallback when no item variant fits the player's skin.
-- If the item's range has no member fitted to naturalBare, the consumer falls
-- back to defaultBare: swap the torso to defaultBare and use the matched
-- variant for that.
local function equipJacket(ped, gender, item, naturalBare)
    local pick, bare, status = clothmap:PickJacketWithFallback(gender, item.range, naturalBare)
    if not pick then return end
    if status == 'default' then
        SetPedComponentVariation(ped, 3, bare, 0, 0)  -- torso swap
    end
    SetPedComponentVariation(ped, 11, pick, 0, 0)
    -- (Re-apply gloves so they match the now-current bare.)
end

-- "Player removes the shirt" -> drop shirtItem, re-run applyState.
-- The torso (comp 3) stays on the same bare-arms and the gloves remain valid.
state.shirtItem = nil
applyState(ped, gender, state, naturalBare)
```

`naturalBare` is the character's stored "true skin" bare-arms drawable (lives
in your appearance system, not in this resource).
