const gbxremote = require('gbxremote'),
    async = require('async');

class Nadeo extends require('./core') {
    constructor() {
        super();
        this.options.port = 2350;
        this.options.port_query = 5000;
        this.gbxclient = false;
    }

    reset() {
        super.reset();
        if(this.gbxclient) {
            this.gbxclient.terminate();
            this.gbxclient = false;
        }
    }

    run(state) {
        const cmds = [
            ['Connect'],
            ['Authenticate', this.options.login,this.options.password],
            ['GetStatus'], // 1
            ['GetPlayerList',10000,0], // 2
            ['GetServerOptions'], // 3
            ['GetCurrentMapInfo'], // 4
            ['GetCurrentGameInfo'], // 5
            ['GetNextMapInfo'] // 6
        ];
        const results = [];

        async.eachSeries(cmds, (cmdset,c) => {
            const cmd = cmdset[0];
            const params = cmdset.slice(1);

            if(cmd === 'Connect') {
                const client = this.gbxclient = gbxremote.createClient(this.options.port_query,this.options.host, (err) => {
                    if(err) return this.fatal('GBX error '+JSON.stringify(err));
                    c();
                });
                client.on('error',() => {});
            } else {
                this.gbxclient.methodCall(cmd, params, (err, value) => {
                    if(err) return this.fatal('XMLRPC error '+JSON.stringify(err));
                    results.push(value);
                    c();
                });
            }
        }, () => {
            let gamemode = '';
            const igm = results[5].GameMode;
            if(igm === 0) gamemode="Rounds";
            if(igm === 1) gamemode="Time Attack";
            if(igm === 2) gamemode="Team";
            if(igm === 3) gamemode="Laps";
            if(igm === 4) gamemode="Stunts";
            if(igm === 5) gamemode="Cup";

            state.name = this.stripColors(results[3].Name);
            state.password = (results[3].Password !== 'No password');
            state.maxplayers = results[3].CurrentMaxPlayers;
            state.maxspectators = results[3].CurrentMaxSpectators;
            state.currmap_name = this.stripColors(results[4].Name);
            state.currmap_uid = results[4].UId;
            state.gametype = gamemode;
            state.players = results[2];
            state.mapcount = results[5].NbChallenge;
            state.nextmap_name = this.stripColors(results[6].Name);
            state.nextmap_uid = results[6].UId;

            this.finish(state);
        });
    }

    stripColors(str) {
        return str.replace(/(\$[0-9a-f|A-F]{3}|\$[a-z|A-Z]{1})/g,'');
    }

}

module.exports = Nadeo;
