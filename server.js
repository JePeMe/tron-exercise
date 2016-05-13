var http = require('http');
var ws = require('ws');

http.createServer(function() {
    //do stuff, ideally serve html
}).listen(1338, function() {
    console.log('listening on 1338');
});

var wss = new ws.Server({port: 1337});
var games = {};

wss.on('connection', function(client) {
    var router = {
        'create': createGame,
        'join': joinGame
    };

    client.on('message', function(message) {
        console.log(message);
        message = JSON.parse(message);

        if (router.hasOwnProperty(message.type)) {
            var doStuff = router[message.type];
            doStuff(message);
        }
    });
    client.on('close', handleDisconnect);
    sendGamesList(client);

    function createGame(message){
        if (games[message.id]) {
            client.send(JSON.stringify({
                type: 'error',
                content: 'lobby exists'
            }));
            return;
        }
        games[message.id] = {
            players: [client]
        };
        console.log(games);
        broadCastGamesList();
    }

    function joinGame(message){
        if(games.hasOwnProperty(message.id)){
            games[message.id].players.push(client);
            startGame(games[message.id]);
        }
    }

    function handleDisconnect() {
        console.log('Handle disconnect');
        var gameIds = Object.keys(games);
        for (var i = 0; i < gameIds.length; i++) {
            var game = games[gameIds[i]];
            if (game.players.indexOf(client) > -1) {
                removeGame(gameIds[i], client);
            }
        }
        broadCastGamesList();
    }
});

function removeGame(gameId, client) {
    console.log('Remove game');
    var game = games[gameId];
    game.loser = game.players.indexOf(client);
    game.players.splice(game.loser, 1);
    game.players.forEach(function(connection) {
        connection.send(JSON.stringify({
            type: 'gameover',
            loser: game.loser
        }))
    });
    delete games[gameId];
}

function sendGamesList(client){
    client.send(JSON.stringify({type: 'lobbyPool', content: Object.keys(games)}));
}

function broadCastGamesList(){
    wss.clients.forEach(function each(client) {
        sendGamesList(client);
    });
}

function startGame(game) {
    var clients = game.players;
    var area = initArea();
    var players = [];
    var gameTimer;
    start();

    function initArea() {
        var area = [];
        for (var i = 0; i < 50; i++) {
            area[i] = [];
            for (var j = 0; j < 50; j++) {
                area[i][j] = -1;
            }
        }
        return area;
    }

    function start() {
        players = clients.map(function(client, index) {
            if (index === 0) {
                area[2][24] = index;
                return {
                    id: index,
                    position: {x: 2, y: 24},
                    dir: {x: 1, y: 0}
                };
            }
            area[47][24] = index;
            return {
                id: index,
                position: {x: 47, y: 24},
                dir: {x: -1, y: 0}
            };
        });
        gameTimer = setInterval(tick, 500);
        clients.forEach(function(connection) {
            connection.send(JSON.stringify(
                {type: 'start'}
            ));
        });
    }

    function tick() {
        players.forEach(movePlayer);
        clients.forEach(function(connection) {
            connection.send(JSON.stringify({
                type: 'tick',
                state: area
            }));
        });
    }

    function movePlayer(player, index) {
        player.position.x = applyDirection(player.position.x, player.dir.x, area.length);
        player.position.y= applyDirection(player.position.y, player.dir.y, area.length);
        if (area[player.position.x][player.position.y] >= 0) {
            return gameOver(player.id);
        }
        area[player.position.x][player.position.y] = index;
    }

    function applyDirection(pos, dir, max) {
        return (pos + dir + max) % max;
    }

    function gameOver(playerId) {
        clearInterval(gameTimer);
        clients.forEach(function(connection) {
            connection.send(JSON.stringify({
                type: 'gameover',
                loser: playerId 
            }));
        });
    }
}
