const {ChainValueError, ChainInvalidRelError} = require('./errors');

class ChainLink {
    constructor(data, client) {
        let self=this;
        self.client = client;
        if(data.href === undefined) {
            throw new ChainValueError("Missing href attribute in link");
        }
        self.href = data.href;
        if(data.title !== undefined) {
            self.title = data.title;
        }
    }

    async fetch(force) {
        let self=this;

        if(!force && self.resource !== undefined) {
            return self.resource;
        }

        let response = await self.client.axios.get(self.href);
        let data = response.data;

        let resource;
        if(data._links.items !== undefined) {
            resource = new ChainCollection(self.href, self.client);
        } else {
            resource = new ChainResource(self.href, self.client);
        }
        await resource.parse(data);
        self.resource = resource;
        return resource;
    }
}

class ChainResource {
    constructor(href, client) {
        let self=this;
        self.href = href;
        self.client = client;
    }

    async parse(data) {
        let self=this;
        self.links = new Map();
        self.embedded = new Map();
        
        if(data._links !== undefined) {
            for(let rel in data._links) {
                if(!data._links.hasOwnProperty(rel)) continue;
                let link = data._links[rel];
                if(link instanceof Array) {
                    let links = [];
                    for(let i=0; i<link.length; i++) {
                        links.push(new ChainLink(link[i], self.client));
                    }
                    self.links.set(rel, links);
                } else {
                    self.links.set(rel, new ChainLink(
                        link, self.client));
                }
            }
        }

        /* TODO: handle embedded resources */
    }

    /**
     * Fetches (resolves) a relation.
     */
    async rel(r) {
        let self=this;
        if(self.embedded.has(r)) {
            return self.embedded.get(r);
        } else if(self.links.has(r)) {
            let link = self.links.get(r);
            if(link instanceof Array) return link;
            return await link.fetch();
        } else {
            throw new ChainInvalidRelError();
        }
    }

    link(r) {
        if(self.links.has(r)) {
            return self.links.get(r);
        } else {
            return undefined;
        }
    }
}

class ChainCollection extends ChainResource {
    async parse(data) {
        let self=this;
        super.parse(data);

        /* pre-fetch all items in the collection; this is not ideal but
         * should be fine with the current collection sizes in the database.
         * tc39/proposal-async-iteration should make this less necessary. */
        self.items = [];
        for(let resource=self; resource.links.has('next'); 
          resource = await resource.rel('next')) {
            let itemPage = await resource.rel('items');
            for(let i=0; i<itemPage.length; i++) {
                self.items.push(itemPage[i]);
            }
        }
    }

    *[Symbol.iterator]() {
        let self=this;
        for(let i=0; i<self.items.length; i++) {
            yield self.items[i];
        }
    }

   
}

module.exports = {
    ChainResource,
    ChainLink
}
