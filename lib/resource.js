const {ChainValueError, ChainInvalidRelError, ChainEditError, 
    ChainCreateError} = require('./errors');

async function createResource(data, client, href) {
    let resource;
    if(data._links !== undefined && data._links.items !== undefined) {
        resource = new ChainCollection(client, href);
    } else {
        resource = new ChainResource(client, href);
    }
    await resource.parse(data);
    return resource;
}

class ChainLink {
    constructor(data, client) {
        let self=this;
        self.client = client;
        if(data.href === undefined) {
            throw new ChainValueError("Missing href attribute in link");
        }
        self.href = data.href;
        const validProperties = ['templated', 'type', 'deprecation',
            'name', 'profile', 'title', 'hreflang'];
        for(let i=0; i<validProperties.length; i++) {
            let prop = validProperties[i];
            if(data[prop] !== undefined) {
                self[prop] = data[prop];
            }
        }
    }

    async fetch(force, config) {
        let self=this;

        if(!force && self.resource !== undefined) {
            return self.resource;
        }

        let response = await self.client.axios.get(self.href, config);
        let data = response.data;

        let resource = await createResource(data, self.client, self.href);
        self.resource = resource;
        return resource;
    }
}

class ChainResource {
    constructor(client, href) {
        let self=this;
        self.href = href;
        self.client = client;

        self._setProperties = new Map();
    }

    async parse(data) {
        let self=this;
        self._links = new Map();
        self._embedded = new Map();
        self._properties = new Map();
        
        if(data._links !== undefined) {
            for(let rel in data._links) {
                if(!data._links.hasOwnProperty(rel)) continue;
                let link = data._links[rel];
                if(link instanceof Array) {
                    let links = [];
                    for(let i=0; i<link.length; i++) {
                        links.push(new ChainLink(link[i], self.client));
                    }
                    self._links.set(rel, links);
                } else {
                    self._links.set(rel, new ChainLink(
                        link, self.client));
                }
            }
        }

        if(data._embedded !== undefined) {
            for(let rel in data._embedded) {
                if(!data._embedded.hasOwnProperty(rel)) continue;
                let embeddedData = data._embedded[rel];
                if(embeddedData instanceof Array) {
                    let a = [];
                    for(let i=0; i<embeddedData.length; i++) {
                        a.push(await createResource(embeddedData[i], self.client));
                    }
                    self._embedded.set(rel, a);
                } else {
                    self._embedded.set(rel, await createResource(embeddedData,
                        self.cleint));
                }
            }
        }

        for(let key in data) {
            if(!data.hasOwnProperty(key)) continue;
            if(key == "_links" || key == "_embedded") continue;
            self._properties.set(key, data[key]);
        }

        if(self.href === undefined && self.link("self") !== undefined) {
            self.href = self.link("self").href;
        }
    }

    /** Fetches (resolves) a relation. */
    async rel(r) {
        let self=this;
        if(self._embedded.has(r)) {
            return self._embedded.get(r);
        } else if(self._links.has(r)) {
            let link = self._links.get(r);
            if(link instanceof Array) return link;
            return await link.fetch();
        } else {
            return undefined;
        }
    }

    /** Gets a link for the given relation */
    link(r) {
        let self=this;
        if(self._links.has(r)) {
            return self._links.get(r);
        } else {
            return undefined;
        }
    }

    /** Gets an array of link relation names available for this resource. */
    links() {
        let self=this;
        return self._links.keys();
    }

    /** Gets or sets a property on this resource. */
    prop(key, value) {
        let self=this;
        if(value === undefined) {
            /* get property value */
            if(self._setProperties.has(key)) {
                return self._setProperties(key);
            } else {
                return self._properties.get(key);
            }
        } else {
            if(self.link("editForm") === undefined) {
                throw new ChainEditError("Cannot modify a property on a resource " +
                    "without an editForm relation");
            }
            self._setProperties.set(key, value);
        }
    }
   
    /** Gets an array of property names on this resource. */
    props() {
        let self=this;
        return self._properties.keys();
    }

    /** Saves changes that have been made to this resource */
    async save(config) {
        let self=this;
        if(self._setProperties.size == 0) {
            /* no pending changes to post */
            return;
        }

        let editForm = self.link('editForm');
        if(editForm === undefined) {
            throw new ChainEditError("Cannot save changes to a resource without " +
                "an editForm relation");
        }

        let payload = {};
        for(let [key, value] of self._setProperties) {
            payload[key] = value;
        }
        console.log(payload);
        let result = await self.client.axios.post(editForm.href, payload, config);
        await self.parse(result.data);
        self._setProperties.clear();
    }

    async create(payload, config) {
        let self=this;
        let createForm = self.link('createForm');
        if(createForm === undefined) {
            throw new ChainCreateError("Cannot create a new resource on a resource " +
                "without a createForm relation");
        }

        let result;
        try {
            result = await self.client.axios.post(createForm.href, payload, config);
        } catch(e) {
            throw new ChainCreateError("Failed to create resource: " + e.toString());
        }

        let resource = await createResource(result.data, self.client);

        return resource;
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
        let resource = self;
        while(true) {
            let itemPage = await resource.rel('items');
            for(let i=0; i<itemPage.length; i++) {
                self.items.push(itemPage[i]);
            }
            if(resource.link('next') !== undefined) {
                resource = await resource.rel('next');
            } else {
                break;
            }
        }
    }

    /* allow iteration over the collection */
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
