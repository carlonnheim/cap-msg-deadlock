const cds = require('@sap/cds');

module.exports = async srv => {
    const messaging = await cds.connect.to("messaging");

    // Process incoming messages by passing them through an express router
    messaging.on('default/my/service/locktest', async msg => {
        const db = await cds.connect.to('db');
        const { Lock, RelatedResource } = db.entities('eventmesh');
        console.log('MSG IN: ', JSON.stringify(msg));
        switch (process.env.SCENARIO) {
            case 'A':
                // No action, succeed after 1 second
                await new Promise((resolve, reject) => setTimeout(resolve, 1000));
                break;
            case 'B':
                // No action, fail after 1 second without any error content
                await new Promise((resolve, reject) => setTimeout(reject, 1000));
                break;
            case 'C':
                // No action, fail after 1 second with some error content
                await new Promise((resolve, reject) => setTimeout(() => reject("some error"), 1000));
                break;
            case 'D':
                // Lock an independent resource for 1 second, then succeed
                var r = { resource: msg.data.different }
                await INSERT.into(Lock, r);
                await DELETE.from(Lock, r);
                await new Promise((resolve, reject) => setTimeout(resolve, 1000));
                break;
            case 'E':
                // Lock a common resource for 1 second, then succeed
                var r = { resource: msg.data.same }
                await INSERT.into(Lock, r);
                await DELETE.from(Lock, r);
                await new Promise((resolve, reject) => setTimeout(resolve, 1000));
                break;
            case 'F':
                // Lock an independent resource for 1 second, then fail
                var r = { resource: msg.data.different }
                await INSERT.into(Lock, r);
                await DELETE.from(Lock, r);
                await new Promise((resolve, reject) => setTimeout(() => reject("some error"), 1000));
                break;
            case 'G':
                // Lock a common resource for 1 second, then fail
                var r = { resource: msg.data.same }
                await INSERT.into(Lock, r);
                await DELETE.from(Lock, r);
                await new Promise((resolve, reject) => setTimeout(() => reject("some error"), 1000));
                break;
            case 'H':
                // Lock a common resource for 1 second, then trigger a consistency error
                var r = { resource: msg.data.same }
                await INSERT.into(Lock, r);
                await DELETE.from(Lock, r);
                await INSERT.into(RelatedResource, { Resource_Resource: 'notfound' });
                await new Promise((resolve, reject) => setTimeout(async () => {
                    resolve();
                }, 1000));
                break;
            default:
            // No action, process successfully
        }
    });

    // Emit a bunch of messages
    var payloads = [];
    for (var i = 0; i < 25; i++) payloads.push({ same: 'A', different: i.toString(), often: (i % 3).toString() });
    var promises = payloads.map(x => messaging.emit('default/my/service/locktest', x, x));
    await Promise.all(promises);
}
