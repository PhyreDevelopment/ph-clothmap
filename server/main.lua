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
    map.bares = map.bares or { male = {}, female = {} }
    map.innershirts = map.innershirts or { male = {}, female = {} }
    map.gloves = map.gloves or { male = {}, female = {} }
    map.jacketToArms = map.jacketToArms or { male = {}, female = {} }
    map.tops = map.tops or { male = {}, female = {} }
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
    local m = map.gloves[gender]
    return m and m[drawable] or nil
end
exports('GetBareArmsForGlove', GetBareArmsForGlove)

exports('GetBareArmsForJacket', function(gender, jacketDrawable)
    local m = map.jacketToArms[gender]
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
    local list = map.innershirts[gender]
    if not list then return false end
    for i = 1, #list do
        if list[i] == drawable then return true end
    end
    return false
end
exports('IsInnershirt', IsInnershirt)

local function GetInnershirtForTop(gender, drawable)
    local m = map.tops[gender]
    return m and m[drawable] or nil
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
    local m = map.innershirtToFallbackTop[gender]
    return m and m[innershirtDrawable] or nil
end)

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
    return '-- ph-clothmap data file (schema v3) — auto-generated by /clothmap save\n'
        .. '-- Commit this file to git after every capture session.\n'
        .. 'return ' .. serialise(m, '') .. '\n'
end

-- ============================================================
-- Shape validation
-- ============================================================

local function isListOfNumbers(t)
    if type(t) ~= 'table' then return false end
    for i = 1, #t do
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

local function validatePayload(p)
    if type(p) ~= 'table' then return false, 'root' end
    for _, gender in ipairs({ 'male', 'female' }) do
        if not (p.bares and isListOfNumbers(p.bares[gender])) then
            return false, 'bares.' .. gender
        end
        if not (p.innershirts and isListOfNumbers(p.innershirts[gender])) then
            return false, 'innershirts.' .. gender
        end
        if not (p.gloves and isNumberMap(p.gloves[gender])) then
            return false, 'gloves.' .. gender
        end
        if not (p.tops and isNumberMap(p.tops[gender])) then
            return false, 'tops.' .. gender
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

    map = payload
    TriggerClientEvent('clothmap:client:mapUpdated', -1, { version = map.version })

    return {
        ok = true,
        version = map.version,
        savedAt = os.date('%H:%M:%S'),
    }
end)

lib.callback.register('clothmap:server:getMap', function() return map end)

-- ============================================================
-- /clothmap command (restricted → auto-requires command.clothmap ACE)
-- ============================================================

RegisterCommand('clothmap', function(source)
    if source == 0 then
        print('[ph-clothmap] /clothmap must be run by a player, not the console.')
        return
    end
    if not IsPlayerAceAllowed(source, 'command.clothmap') then
        TriggerClientEvent('chat:addMessage', source, {
            args = { '[ph-clothmap]', 'You do not have access to /clothmap.' },
        })
        return
    end
    TriggerClientEvent('clothmap:client:open', source)
end, true)
