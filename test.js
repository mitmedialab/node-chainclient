const ChainClient = require('./client');

async function test() {
    let cc = new ChainClient();
    let site = await cc.fetchResource('https://chain-api.media.mit.edu/sites/7');
    let devices = await site.rel('ch:devices');
    //console.log(data);
    for(let device of devices) {
        console.log(device.title);
    }
}

test().then(() => {});
