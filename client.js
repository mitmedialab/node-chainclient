const axios = require('axios');

const {ChainResource, ChainLink} = require('./resource');

class ChainClient {
    constructor(opts) {
        var self=this;
        self.axios = axios.create();
    }

    async fetchResource(uri, config) {
        var self=this;
        let link = new ChainLink({href: uri}, self);

        let resource = await link.fetch(config);
        return resource;
    }

    inspect() {
        return "ChainClient";
    }
}

module.exports = ChainClient;
