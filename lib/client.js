const axios = require('axios');

const {ChainResource, ChainLink} = require('./resource');

class ChainClient {
    constructor(config) {
        var self=this;
        self.axios = axios.create(config);
    }

    async get(uri, config) {
        var self=this;
        let link = new ChainLink({href: uri}, self);

        let resource = await link.fetch(false, config);
        return resource;
    }

    inspect() {
        return "ChainClient";
    }
}

module.exports = ChainClient;
