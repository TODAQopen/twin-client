import express from "express"

function twinApp() {
    return express()
}

function start(app, {port}) {
    let server;
    return new Promise((resolve, reject) => {
        server = app.listen(port, (err) => {
            if (err) reject(err);
            console.log(`Twin mock server listening on: ${port}`)
            resolve(server);
        });
    });
}

function stop(server) {
    return new Promise((resolve, reject) => {
        server.close((err) => {
            if (err) reject(err);
            console.log("Twin mock server stopped");
            resolve();
        });
    });
}

function addInfo(app, info) {
    return app.get("/info", function(_, res) {
        return res.json(info);
    })
}

function addMicropayBadRequest(app) {
    app.all("/pay/:destAddr/:type/:quantity/*", function(_, res) {
        res.status(400).json({error: "Any bad micropay request"});
    });

    return app;
}

export {
    twinApp,
    start,
    stop,
    addInfo,
    addMicropayBadRequest
};
