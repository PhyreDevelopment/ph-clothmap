fx_version 'cerulean'
game 'gta5'

name 'ph-clothmap'
description 'Glove-group, jacket->arms, and top<->innershirt mapping tool (in-game React NUI capture)'
author 'Phyre Development'
version '1.0.0'

lua54 'yes'

shared_scripts {
    '@ox_lib/init.lua',
    'shared/cloth_map.lua',
}

client_scripts {
    'client/main.lua',
}

server_scripts {
    'server/main.lua',
}

ui_page 'web/dist/index.html'

files {
    'web/dist/index.html',
    'web/dist/assets/*',
}
