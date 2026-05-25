local RESOURCE = GetCurrentResourceName()

-- ============================================================
-- In-memory map (mirrors server; reloaded after every save)
-- ============================================================

local map

local function loadMap()
    local chunkText = LoadResourceFile(RESOURCE, 'shared/cloth_map.lua')
    if not chunkText then return end
    local fn = load(chunkText, '@cloth_map.lua', 't', {})
    if not fn then return end
    map = fn()
    map.bares = map.bares or { male = {}, female = {} }
    map.innershirts = map.innershirts or { male = {}, female = {} }
    map.gloveGroups = map.gloveGroups or { male = {}, female = {} }
    map.jacketToArms = map.jacketToArms or { male = {}, female = {} }
    map.topGroups = map.topGroups or { male = {}, female = {} }
    map.innershirtToFallbackTop = map.innershirtToFallbackTop or { male = {}, female = {} }
end

loadMap()

RegisterNetEvent('clothmap:client:mapUpdated', function()
    -- Re-fetch the authoritative map from server (it just hot-reloaded after a save).
    local fresh = lib.callback.await('clothmap:server:getMap', false)
    if fresh then map = fresh end
end)

-- ============================================================
-- Consumer-facing exports (mirror server, client-side)
-- ============================================================

local function IsBareArms(gender, drawable)
    local list = map and map.bares[gender] or nil
    if not list then return false end
    for i = 1, #list do if list[i] == drawable then return true end end
    return false
end
exports('IsBareArms', IsBareArms)

local function GetBareArmsForGlove(gender, drawable)
    if IsBareArms(gender, drawable) then return drawable end
    local groups = map and map.gloveGroups[gender] or nil
    if not groups then return nil end
    for i = 1, #groups do
        local parent = groups[i].members[drawable]
        if parent then return parent end
    end
    return nil
end
exports('GetBareArmsForGlove', GetBareArmsForGlove)

exports('GetBareArmsForJacket', function(gender, jacketDrawable)
    local m = map and map.jacketToArms[gender] or nil
    return m and m[jacketDrawable] or nil
end)

exports('PickGloveForRange', function(gender, range, requiredBare)
    if not range then return nil end
    for i = 1, #range do
        local c = range[i]
        if GetBareArmsForGlove(gender, c) == requiredBare then return c end
    end
    return nil
end)

local function IsInnershirt(gender, drawable)
    local list = map and map.innershirts[gender] or nil
    if not list then return false end
    for i = 1, #list do if list[i] == drawable then return true end end
    return false
end
exports('IsInnershirt', IsInnershirt)

local function GetInnershirtForTop(gender, drawable)
    local groups = map and map.topGroups[gender] or nil
    if not groups then return nil end
    for i = 1, #groups do
        local parent = groups[i].members[drawable]
        if parent then return parent end
    end
    return nil
end
exports('GetInnershirtForTop', GetInnershirtForTop)

exports('PickTopForRange', function(gender, range, requiredInnershirt)
    if not range then return nil end
    for i = 1, #range do
        local c = range[i]
        if GetInnershirtForTop(gender, c) == requiredInnershirt then return c end
    end
    return nil
end)

exports('GetFallbackTopForInnershirt', function(gender, innershirtDrawable)
    local m = map and map.innershirtToFallbackTop[gender] or nil
    return m and m[innershirtDrawable] or nil
end)

-- ============================================================
-- Capture session state
-- ============================================================

local active = false
local cam
local snapshot
local currentGender = 'male'

local FREEMODE = {
    male   = `mp_m_freemode_01`,
    female = `mp_f_freemode_01`,
}

local function loadModel(hash)
    if not IsModelInCdimage(hash) then return false end
    RequestModel(hash)
    local timeout = GetGameTimer() + 5000
    while not HasModelLoaded(hash) and GetGameTimer() < timeout do Wait(0) end
    return HasModelLoaded(hash)
end

local function snapshotPed()
    local ped = cache.ped
    local components = {}
    for compId = 0, 11 do
        components[compId] = {
            drawable = GetPedDrawableVariation(ped, compId),
            texture  = GetPedTextureVariation(ped, compId),
            palette  = GetPedPaletteVariation(ped, compId),
        }
    end
    local props = {}
    for propId = 0, 7 do
        props[propId] = {
            drawable = GetPedPropIndex(ped, propId),
            texture  = GetPedPropTextureIndex(ped, propId),
        }
    end
    return {
        coords = GetEntityCoords(ped),
        heading = GetEntityHeading(ped),
        model = GetEntityModel(ped),
        components = components,
        props = props,
    }
end

local function restoreFromSnapshot(snap)
    if not snap then return end
    if exports['illenium-appearance'] then
        -- Cleanest restore: tell illenium to reload from DB.
        local ok = pcall(function()
            TriggerEvent('illenium-appearance:client:reloadSkin', true)
        end)
        if ok then return end
    end
    -- Fallback: reapply model + components + props from snapshot.
    if loadModel(snap.model) then
        SetPlayerModel(PlayerId(), snap.model)
        SetModelAsNoLongerNeeded(snap.model)
    end
    local ped = PlayerPedId()
    for compId = 0, 11 do
        local c = snap.components[compId]
        if c then SetPedComponentVariation(ped, compId, c.drawable, c.texture, c.palette or 0) end
    end
    for propId = 0, 7 do
        local p = snap.props[propId]
        if p and p.drawable ~= -1 then
            SetPedPropIndex(ped, propId, p.drawable, p.texture, true)
        else
            ClearPedProp(ped, propId)
        end
    end
end

local function setupCamera(ped)
    DestroyAllCams(true)
    local coords = GetEntityCoords(ped)
    local heading = GetEntityHeading(ped)
    local rad = math.rad(heading)
    local fx, fy = -math.sin(rad), math.cos(rad)
    local camCoords = vec3(coords.x + fx * 1.6, coords.y + fy * 1.6, coords.z + 0.2)
    cam = CreateCam('DEFAULT_SCRIPTED_CAMERA', true)
    SetCamCoord(cam, camCoords.x, camCoords.y, camCoords.z)
    PointCamAtEntity(cam, ped, 0.0, 0.0, 0.1, true)
    SetCamFov(cam, 40.0)
    SetCamActive(cam, true)
    RenderScriptCams(true, false, 0, true, true)
end

local function destroyCamera()
    if cam then
        RenderScriptCams(false, false, 0, true, true)
        DestroyCam(cam, false)
        cam = nil
    end
end

local function applyFreemodeAndReset(gender)
    currentGender = gender
    local hash = FREEMODE[gender]
    if not loadModel(hash) then
        lib.notify({ type = 'error', description = '[ph-clothmap] failed to load freemode model' })
        return
    end
    SetPlayerModel(PlayerId(), hash)
    SetModelAsNoLongerNeeded(hash)
    local ped = PlayerPedId()
    SetPedDefaultComponentVariation(ped)
    -- Reset the three components we mutate so previews start clean.
    SetPedComponentVariation(ped, 3, 0, 0, 0)
    SetPedComponentVariation(ped, 8, 0, 0, 0)
    SetPedComponentVariation(ped, 11, 0, 0, 0)
    FreezeEntityPosition(ped, true)
    SetEntityInvincible(ped, true)
    setupCamera(ped)
end

local function closeSession()
    if not active then return end
    active = false
    SetNuiFocus(false, false)
    destroyCamera()
    local ped = PlayerPedId()
    FreezeEntityPosition(ped, false)
    SetEntityInvincible(ped, false)
    restoreFromSnapshot(snapshot)
    snapshot = nil
end

-- ============================================================
-- /clothmap command
-- ============================================================

-- The /clothmap command is registered server-side with `restricted = true`,
-- which auto-requires the `command.clothmap` ACE. The server triggers this
-- event after the gate passes.
RegisterNetEvent('clothmap:client:open', function()
    if active then return end
    active = true
    snapshot = snapshotPed()
    applyFreemodeAndReset(currentGender)
    SetNuiFocus(true, true)
    SendNUIMessage({ type = 'clothmap:open', payload = { map = map, gender = currentGender } })
end)

-- ============================================================
-- NUI callbacks
-- ============================================================

RegisterNUICallback('clothmap:setGender', function(data, cb)
    local gender = data and data.gender or 'male'
    if gender ~= 'male' and gender ~= 'female' then gender = 'male' end
    applyFreemodeAndReset(gender)
    cb({ ok = true, gender = gender })
end)

RegisterNUICallback('clothmap:previewDrawable', function(data, cb)
    local ped = PlayerPedId()
    local compId = tonumber(data and data.component)
    local drawable = tonumber(data and data.drawable)
    if compId and drawable and compId >= 0 and compId <= 11 then
        SetPedComponentVariation(ped, compId, drawable, 0, 0)
    end
    cb({ ok = true })
end)

RegisterNUICallback('clothmap:previewBare', function(data, cb)
    local ped = PlayerPedId()
    local drawable = tonumber(data and data.drawable) or 0
    SetPedComponentVariation(ped, 3, drawable, 0, 0)
    cb({ ok = true })
end)

RegisterNUICallback('clothmap:previewInnershirt', function(data, cb)
    local ped = PlayerPedId()
    local drawable = tonumber(data and data.drawable) or 0
    SetPedComponentVariation(ped, 8, drawable, 0, 0)
    cb({ ok = true })
end)

RegisterNUICallback('clothmap:getNumDrawables', function(data, cb)
    local ped = PlayerPedId()
    local compId = tonumber(data and data.component) or 3
    cb({ ok = true, count = GetNumberOfPedDrawableVariations(ped, compId) })
end)

RegisterNUICallback('clothmap:save', function(payload, cb)
    local response = lib.callback.await('clothmap:server:saveMap', false, payload)
    if response and response.ok then
        -- Mirror the new map locally too (the broadcast event will also fire,
        -- but doing it here avoids a race for our own UI).
        map = payload
        map.version = response.version
    end
    cb(response or { ok = false, error = 'no-response' })
end)

RegisterNUICallback('clothmap:close', function(_, cb)
    closeSession()
    cb({ ok = true })
end)

-- Safety: if the resource stops while a session is open, restore the player.
AddEventHandler('onResourceStop', function(name)
    if name == RESOURCE and active then closeSession() end
end)
