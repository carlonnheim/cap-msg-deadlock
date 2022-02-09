const cds = require('@sap/cds');
const express = require('express');

module.exports = async srv => {
    const messaging = await cds.connect.to("messaging");
    
    // Set up an express app for use as message router
    exp = express();

    // Use express routing capability to treat the message
    exp.use('action/:type', processor);

    // Error handling
    exp.use(function (err, req, res, next) {
        // Cause a small delay after failures to avoid surging
        setTimeout(() => {
            req.reject(err);
            next(err);
        }, 500);
    });

    // Process incoming messages by passing them through an express router
    messaging.on('default/my/service/locktest', msg => {
        // Prepare a log message and start a timer
        let sLogMessage = JSON.stringify(msg.headers);
        console.time(sLogMessage);
        console.timeLog(sLogMessage, "Routing Started");

        // Build a request-like structure which can be passed through the express router
        var req = {
            url: 'action/' + msg.headers.same, // Route based on some value in the message
            method: "POST", // Prevent to be a POST
            event: msg // Pass along the payload
        }

        // Set up a response structure to be used by the route handlers
        var res = {
            setHeader: (header, value) => { } // A dummy setHeader routine. Express routing fails without it
        }

        // Let the express router handle the message, wrapped in a promise
        let oPromise = new Promise((resolve, reject) => {
            // Store the resolve and reject methods for use in the handlers
            req.reject = reject;
            req.resolve = resolve;
            // Provide a logger
            req.log = (...args) => console.timeLog(sLogMessage, ...args);
            // Run the express router
            exp.handle(req, res, (a, b, c) => {
                // Resolve the promise when done. This has no effect if an error already rejected it
                resolve();
            });
        });

        // Add closing log information
        return oPromise.then(() => {
            console.timeLog(sLogMessage, "Routing Completed")
            console.timeEnd(sLogMessage);
        }).catch(err => {
            console.timeLog(sLogMessage, "***** Routing Failed *****", err.message);
            console.timeEnd(sLogMessage);
            throw err;            
        });        
    });

    // Emit a bunch of messages
    var payloads = [];
    for (var i = 0; i < 25; i++) payloads.push({ same: 'A', different: i.toString(), often: (i%3).toString() });
    var promises = payloads.map(x => messaging.emit('default/my/service/locktest', x, x));
    await Promise.all(promises);
}

// Payload function to simulate different scenarios
async function processor(req, res, next) {
    var msg = req.event;
    const db = await cds.connect.to('db');
    const { Lock, RelatedResource } = db.entities('eventmesh');
    try {
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

        next();
    } catch (err) {
        next(err);
    }
}