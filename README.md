# matrix-appservice-pstn
Bridges matrix calls <-> SIP with the help of freeswitch

**Note:** it is in an early state. don't use it in production!

## Requirements
- installed synapse
- docker
- docker-compose
- nodejs
- yarn

## Setup
```bash

git clone https://github.com/matrix-org/matrix-appservice-pstn.git

cd matrix-appservice-pstn

# copy and adjust the configs
cp config.yml.example config.yml
cp registration.yml.example registration.yml
vim config.yml
vim registration.yml

# generate freeswitch config files after config.yml change
yarn generate-fs-config

# copy registration.yml to synapse
sudo cp config/registration.yml /etc/matrix-synapse/matrix-appservice-pstn.yml

# add '/etc/matrix-synapse/matrix-appservice-pstn.yml' to `app_service_config_files` in the synapse config
sudo vim /etc/matrix-synapse/homeserver.yaml

# restart synapse
systemctl restart matrix-synapse
```

## Start
#### Start freeswitch
`$ docker-compose up -d`

#### Start matrix-appservice-pstn
`$ yarn start`


