const cds = require('@sap/cds');

module.exports = async srv => {
    const messaging = await cds.connect.to("messaging");

    // Simulate locking of a common resource for one second on each message receipt
    messaging.on('default/my/service/locktest', async msg => {
        const db = await cds.connect.to('db');
        const { Lock, RelatedResource } = db.entities('eventmesh');
        console.log('MSG IN: ', JSON.stringify(msg));
        // Lock a common resource for 1 second, then succeed
        var r = { resource: msg.data.same }
        await INSERT.into(Lock, r);
        await DELETE.from(Lock, r);
        await new Promise((resolve, reject) => setTimeout(resolve, 1000));
    });

    // Emit a bunch of messages
    var payloads = [];
    for (var i = 0; i < 25; i++) payloads.push({ same: 'A', different: i.toString(), often: (i % 3).toString() });
    var promises = payloads.map(x => messaging.emit('default/my/service/locktest', x, x));
    await Promise.all(promises);
}
