var http = require('http');
var ws = require('ws');

http.createServer(function() {
    //do stuff, ideally serve html
}).listen(1338, function() {
    console.log('listening on 1338');
});

var wss = new ws.Server({port: 1337});
wss.on('connection', function(client) {
    client.on('message', function(message) {
        console.log(message);
        message = JSON.parse(message);
        if (message.type === 'create') {
            games[message.id] = {
                players: [client]
            };
            console.log(games);
        }
        //if (message.type === 'join')
    });
    client.send(JSON.stringify({type: 'lobbyPool', content: games}));
});

var games = {};
