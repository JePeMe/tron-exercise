var express = require('express');
var ws = require('ws');
var app = express();

app.use(express.static('public'));

app.listen(1338, function () {
  console.log('Tron server listening on port 1338!');
});

var MAX_SCORE = 10;

var wss = new ws.Server({port: 1337});
var games = {};

wss.on('connection', function(client) {
    var router = {
        'create': createGame,
        'join': joinGame,
        'ready': startGameIfReady
    };

    client.on('message', function(message) {
        console.log(message);
        message = JSON.parse(message);

        if (router.hasOwnProperty(message.type)) {
            var doStuff = router[message.type];
            doStuff(message.id, client);
        }
    });
    client.on('close', handleDisconnect);
    sendGamesList(client);

    function createGame(id){
        if (games[id]) {
            client.send(JSON.stringify({
                type: 'error',
                content: 'lobby exists'
            }));
            return;
        }
        games[id] = {
            id: id,
            connections: [],
            players: [],
            running: false
        };
        joinGame(id);
        console.log(games);
        broadCastGamesList();
    }

    function joinGame(id){
        if(games.hasOwnProperty(id)){
            if (games[id].running || games[id].players.length >= 4) {
                client.send(JSON.stringify({
                    type: 'error',
                    content: 'game running'
                }));
                return;
            }
            client.ready = false;
            games[id].connections.push(client);
            var playerId = updatePlayers(id);

            client.on('message', function(message) {
                console.log(message);
                message = JSON.parse(message);

                if (message.type === 'ready') {
                    client.ready = true;
                    startGameIfReady(id);
                }
            });
            client.send(JSON.stringify({
                type: 'ack',
                content: 'joined lobby'
            }));
        }
    }

    function handleDisconnect() {
        console.log('Handle disconnect');
        var gameIds = Object.keys(games);
        for (var i = 0; i < gameIds.length; i++) {
            var game = games[gameIds[i]];
            if (game.connections.indexOf(client) > -1) {
                removeGame(gameIds[i], client);
            }
        }
        broadCastGamesList();
    }
});

function removeGame(gameId, client) {
    console.log('Remove game');
    var game = games[gameId];
    game.winner = game.connections.indexOf(client);
    game.connections.splice(game.winner, 1);
    game.connections.forEach(function(connection) {
        connection.send(JSON.stringify({
            type: 'gameover',
            winner: game.winner
        }));
    });
    delete games[gameId];
}

function sendGamesList(client) {
    var gameList = [];
    for (var game in games) {
        if (!games[game].running) {
            gameList.push(game);
        }
    }
    console.log(gameList);
    client.send(JSON.stringify({type: 'lobbyPool', content: gameList}));
}

function broadCastGamesList(){
    wss.clients.forEach(function each(client) {
        sendGamesList(client);
    });
}

function updatePlayers(gameId) {
    games[gameId].players = games[gameId].connections.map(function(client, index) {
        if (index === 0) {
            return {
                id: index,
                position: {x: 2, y: 24},
                dir: {x: 1, y: 0},
                score: 0
            };
        }
        if (index === 1) {
            return {
                id: index,
                position: {x: 24, y: 2},
                dir: {x: 0, y: 1},
                score: 0
            };
        }
        if (index === 2) {
            return {
                id: index,
                position: {x: 24, y: 47},
                dir: {x: 0, y: -1},
                score: 0
            };
        }
        return {
            id: index,
            position: {x: 47, y: 24},
            dir: {x: -1, y: 0},
            score: 0
        };
    });
    return games[gameId].players.length-1;
}

function startGameIfReady(gameId) {

    var allPlayersAreReady = games[gameId].connections.every(function(player) {
        return player.ready;
    });
    if (allPlayersAreReady && games[gameId].connections.length > 1) {
        startGame(games[gameId]);
        games[gameId].running = true;
        broadCastGamesList();
    }
}

function startGame(game) {
    var clients = game.connections;
    var listeners = [];
    var area = [];
    var players = game.players;
    var gameTimer;
    var directions = {
        "UP": {
            x: 0,
            y: -1
        },
        "DOWN": {
            x: 0,
            y: 1
        },
        "LEFT": {
            x: -1,
            y: 0
        },
        "RIGHT": {
            x: 1,
            y: 0
        }
    };

    start();

    function initArea() {
        area = [];
        for (var i = 0; i < 50; i++) {
            area[i] = [];
            for (var j = 0; j < 50; j++) {
                area[i][j] = -1;
            }
        }
    }

    function start() {
        initArea();

        clients.forEach(function(client, index) {
            var controlListener = client.on('message', function(message) {
                console.log(message);
                message = JSON.parse(message);

                if (message.type === 'control') {
                    players[index].dir = directions[message.direction];
                }
            });
            listeners.push(controlListener);
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
            try {
                connection.send(JSON.stringify({
                    type: 'tick',
                    state: {players: players, area: area}
                }));
            } catch (error) {
                console.log("Could not send tick to client");
                console.log(error);
            }
        });
    }

    function movePlayer(player, index) {
        player.position.x = applyDirection(player.position.x, player.dir.x, area.length);
        player.position.y= applyDirection(player.position.y, player.dir.y, area.length);
        var otherPlayerId = area[player.position.x][player.position.y];

        if (otherPlayerId >= 0) {
            var score = players[otherPlayerId].score++;
            if(score >= MAX_SCORE){
                gameOver(otherPlayerId);
            }
            initArea();
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
                winner: playerId
            }));
        });
    }
}
