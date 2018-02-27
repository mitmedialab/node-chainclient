# node-chainclient

**node-chainclient** is a JavaScript client for [Chain
API](https://www.github.com/resenv/chain-api), analogous in function to
[chainclient.py](https://www.github.com/ssfrr/chainclient.py).

## Basic usage

```javascript
const {ChainClient} = require('chainclient');

let client = new ChainClient();
let site = await client.get('https://chain-api.media.mit.edu/sites/1');
```

### Retrieving Resources

Any object (not limited to sites) may be retrieved directly by its URL using
the `.get()` method of the client:

```javascript
let device = await client.get('http://chain-api.media.mit.edu/devices/25143');
let temperature = await client.get('http://chain-api.media.mit.edu/scalar_sensors/7571');
```

### Following links

Links to other resources may be followed using the `.rel()` method on the
resource, which will resolve with the resource referred to by the relation:

```javascript
let devices = await site.rel('ch:devices');
```

It is also possible to get just the link object without resolving it by using
the `.link()` method, allowing the properties of the link itself to be
inspected:

```javascript
let devicesLink = site.link('ch:devices');
console.log(devicesLink.title);
```

If one then wants to actually retrieve the resource that a link obtained
through the `.link()` method points to, the `.fetch()` method on the link
object may be called:

```javascript
let devices = await devicesLink.fetch();
```

Resource objects also have a `.links()` method that will return an array of
link relation names for the object.

### Accessing resource properties

Any properties on a resource may be accessed with the `.prop()` method:

```javascript
let name = device.prop('name');
console.log("Device name: ", name);
```

If a resource has an `editForm` link, properties may be modified by passing a
second argument to `.prop()`.

The changes will not be pushed to the API until the `.save()` method on the
resource is called.

```javascript
device.prop('name', 'fooDevice');
await device.save();
```

### Collections

Resources with an `items` link that is an array of links to other resources
support iteration over these links:

```javascript
let devices = await site.rel('ch:devices');
for(let link of devices) {
    console.log("Link title: ", link.title);
}
```

Note that this iterates over the *links*, not the resources themselves
(avoiding expensive fetching of every resource in the collection during
iteration).  Remember that links may be resolved into resources with the
`.fetch()` method when desired:

```javascript
for(let link of devices) {
    if(link.title == '0x8123') {
        let device = await link.fetch();
        console.log('Description of 0x8123: ', device.prop('description'));
        return device;
    }
}
```

### Resource creation

If a resource has a `createForm` link, it may be used via the `.create()`
method:

```javascript
let devices = await site.rel('ch:devices');
let device = await devices.create({
    name: "fooDevice",
    description: "A test device"
});

// devices.create() resolved to the newly created resource, so we can now use it
// to do further things, like adding a new sensor metric to it:
let sensors = await device.rel('ch:sensors');
let sensor = await sensors.create({
    "sensor-type": "scalar",
    metric: "temperature",
    unit: "°C"
});

let history = await sensor.rel('ch:dataHistory');
let sample = await history.create({
    timestamp: new Date(),
    value: 25.3
});
```

## Authentication

Options may be passed to the underlying [HTTP
library](https://github.com/axios/axios) when the `ChainClient` instance is
created:

```javascript
let client = new ChainClient({
    auth: {
        username: "someone",
        password: "password"
    }
});
```

Additionally, most methods that perform HTTP requests (e.g. `.save()`,
`.create()`, `.get()`, `.fetch()`) take an optional `config` argument that can
be used to pass in credentials or other options to the HTTP library.

## Caveats

This is still a work in progress and there are likely some rough edges.  In
particular:

  - There is currently no cache invalidation strategy; resources may get
    stale if they were modified elsewhere after they were retrieved.
  - Collections of links are fetched in their entirety (all pages are loaded
    until there are no more 'next' link rels).  This allows simpler (and
    synchronous) iteration and reduces some issues with caching paginated
    resources, but is not ideal for large collections.
  - Embedded resources may not work entirely as expected; however the current
    implementation of Chain API apperas not to make much use of them.
  - Relation names are currently not expanded.
  - Reltaive URLs are currently not handled correctly.
