local RESOURCE = GetCurrentResourceName()

-- ============================================================
-- In-memory map (loaded at start + after each save)
-- ============================================================

local map

local function loadMap()
    local chunkText = LoadResourceFile(RESOURCE, 'shared/cloth_map.lua')
    if not chunkText then
        error('[ph-clothmap] failed to load shared/cloth_map.lua')
    end
    local fn, err = load(chunkText, '@cloth_map.lua', 't', {})
    if not fn then
        error(('[ph-clothmap] cloth_map.lua syntax error: %s'):format(err))
    end
    map = fn()
    -- Defensive defaults so consumer exports never crash on a malformed file.
    map.bares = map.bares or { male = {}, female = {} }
    map.innershirts = map.innershirts or { male = {}, female = {} }
    map.gloveGroups = map.gloveGroups or { male = {}, female = {} }
    map.jacketToArms = map.jacketToArms or { male = {}, female = {} }
    map.topGroups = map.topGroups or { male = {}, female = {} }
    map.innershirtToFallbackTop = map.innershirtToFallbackTop or { male = {}, female = {} }
    map.version = map.version or 0
end

loadMap()

-- ============================================================
-- Consumer-facing exports (8 total)
-- ============================================================

local function IsBareArms(gender, drawable)
    local list = map.bares[gender]
    if not list then return false end
    for i = 1, #list do
        if list[i] == drawable then return true end
    end
    return false
end
exports('IsBareArms', IsBareArms)

local function GetBareArmsForGlove(gender, drawable)
    if IsBareArms(gender, drawable) then return drawable end
    local groups = map.gloveGroups[gender]
    if not groups then return nil end
    for i = 1, #groups do
        local parent = groups[i].members[drawable]
        if parent then return parent end
    end
    return nil
end
exports('GetBareArmsForGlove', GetBareArmsForGlove)

local function GetBareArmsForJacket(gender, jacketDrawable)
    local m = map.jacketToArms[gender]
    return m and m[jacketDrawable] or nil
end
exports('GetBareArmsForJacket', GetBareArmsForJacket)

local function PickGloveForRange(gender, range, requiredBare)
    if not range then return nil end
    for i = 1, #range do
        local candidate = range[i]
        if GetBareArmsForGlove(gender, candidate) == requiredBare then
            return candidate
        end
    end
    return nil
end
exports('PickGloveForRange', PickGloveForRange)

local function IsInnershirt(gender, drawable)
    local list = map.innershirts[gender]
    if not list then return false end
    for i = 1, #list do
        if list[i] == drawable then return true end
    end
    return false
end
exports('IsInnershirt', IsInnershirt)

local function GetInnershirtForTop(gender, drawable)
    local groups = map.topGroups[gender]
    if not groups then return nil end
    for i = 1, #groups do
        local parent = groups[i].members[drawable]
        if parent then return parent end
    end
    return nil
end
exports('GetInnershirtForTop', GetInnershirtForTop)

local function PickTopForRange(gender, range, requiredInnershirt)
    if not range then return nil end
    for i = 1, #range do
        local candidate = range[i]
        if GetInnershirtForTop(gender, candidate) == requiredInnershirt then
            return candidate
        end
    end
    return nil
end
exports('PickTopForRange', PickTopForRange)

local function GetFallbackTopForInnershirt(gender, innershirtDrawable)
    local m = map.innershirtToFallbackTop[gender]
    return m and m[innershirtDrawable] or nil
end
exports('GetFallbackTopForInnershirt', GetFallbackTopForInnershirt)

-- Convenience export so the client can hot-fetch the full map after a save
-- without needing to re-read the file itself.
exports('GetClothMap', function() return map end)

-- ============================================================
-- Hand-rolled Lua serialiser (numeric-key safe)
-- ============================================================

local function isArray(t)
    local n = 0
    for k in pairs(t) do
        if type(k) ~= 'number' then return false end
        n = n + 1
    end
    -- Treat as array only if keys are 1..n contiguous; otherwise emit numeric-keyed map.
    for i = 1, n do
        if t[i] == nil then return false end
    end
    return true, n
end

local function escapeStr(s)
    return ('%q'):format(s):gsub('\\\n', '\\n')
end

local function serialise(value, indent)
    local t = type(value)
    if t == 'number' or t == 'boolean' then
        return tostring(value)
    elseif t == 'string' then
        return escapeStr(value)
    elseif t == 'nil' then
        return 'nil'
    elseif t == 'table' then
        local nextIndent = indent .. '    '
        local array, n = isArray(value)
        if array then
            if n == 0 then return '{}' end
            local parts = {}
            for i = 1, n do
                parts[i] = serialise(value[i], nextIndent)
            end
            return '{ ' .. table.concat(parts, ', ') .. ' }'
        else
            -- Sort keys: strings first (alpha), then numbers (asc).
            local strKeys, numKeys = {}, {}
            for k in pairs(value) do
                if type(k) == 'string' then strKeys[#strKeys + 1] = k
                elseif type(k) == 'number' then numKeys[#numKeys + 1] = k end
            end
            table.sort(strKeys)
            table.sort(numKeys)
            if #strKeys == 0 and #numKeys == 0 then return '{}' end
            local lines = { '{' }
            for _, k in ipairs(strKeys) do
                lines[#lines + 1] = ('%s%s = %s,'):format(nextIndent, k, serialise(value[k], nextIndent))
            end
            for _, k in ipairs(numKeys) do
                lines[#lines + 1] = ('%s[%d] = %s,'):format(nextIndent, k, serialise(value[k], nextIndent))
            end
            lines[#lines + 1] = indent .. '}'
            return table.concat(lines, '\n')
        end
    end
    return 'nil'
end

local function serialiseMap(m)
    return '-- ph-clothmap data file (schema v2) — auto-generated by /clothmap save\n'
        .. '-- Commit this file to git after every capture session.\n'
        .. 'return ' .. serialise(m, '') .. '\n'
end

-- ============================================================
-- Shape validation
-- ============================================================

local function isListOfNumbers(t)
    if type(t) ~= 'table' then return false end
    local _, n = isArray(t)
    if n == nil then n = #t end
    for i = 1, n do
        if type(t[i]) ~= 'number' then return false end
    end
    return true
end

local function isNumberMap(t)
    if type(t) ~= 'table' then return false end
    for k, v in pairs(t) do
        if type(k) ~= 'number' or type(v) ~= 'number' then return false end
    end
    return true
end

local function isGroupList(t)
    if type(t) ~= 'table' then return false end
    for i = 1, #t do
        local g = t[i]
        if type(g) ~= 'table' or type(g.name) ~= 'string' or not isNumberMap(g.members) then
            return false
        end
    end
    return true
end

local function validatePayload(p)
    if type(p) ~= 'table' then return false, 'root' end
    for _, gender in ipairs({ 'male', 'female' }) do
        if not (p.bares and isListOfNumbers(p.bares[gender])) then
            return false, 'bares.' .. gender
        end
        if not (p.innershirts and isListOfNumbers(p.innershirts[gender])) then
            return false, 'innershirts.' .. gender
        end
        if not (p.gloveGroups and isGroupList(p.gloveGroups[gender])) then
            return false, 'gloveGroups.' .. gender
        end
        if not (p.topGroups and isGroupList(p.topGroups[gender])) then
            return false, 'topGroups.' .. gender
        end
        if not (p.jacketToArms and isNumberMap(p.jacketToArms[gender])) then
            return false, 'jacketToArms.' .. gender
        end
        if not (p.innershirtToFallbackTop and isNumberMap(p.innershirtToFallbackTop[gender])) then
            return false, 'innershirtToFallbackTop.' .. gender
        end
    end
    return true
end

-- ============================================================
-- Save callback (ACE-gated)
-- ============================================================

lib.callback.register('clothmap:server:saveMap', function(source, payload)
    if not IsPlayerAceAllowed(source, 'command.clothmap') then
        return { ok = false, error = 'permission' }
    end

    local ok, where = validatePayload(payload)
    if not ok then
        return { ok = false, error = 'shape:' .. tostring(where) }
    end

    payload.version = (map.version or 0) + 1

    local serialized = serialiseMap(payload)
    local wrote = SaveResourceFile(RESOURCE, 'shared/cloth_map.lua', serialized, -1)
    if not wrote then
        return { ok = false, error = 'write' }
    end

    -- Hot-reload in-memory map so exports return fresh data without restart.
    map = payload

    -- Inform clients so their cached map (and any NUI subscribers) refresh.
    TriggerClientEvent('clothmap:client:mapUpdated', -1, { version = map.version })

    return {
        ok = true,
        version = map.version,
        savedAt = os.date('%H:%M:%S'),
    }
end)

-- Allow the client to fetch the full map (used right after a save to refresh
-- its local cache via lib.callback).
lib.callback.register('clothmap:server:getMap', function() return map end)
