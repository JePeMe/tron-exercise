document.addEventListener('DOMContentLoaded', function() {
    var SERVER_WS_URL = 'ws://localhost:1337';

    console.log('starting connection...');
    var connection = new WebSocket(SERVER_WS_URL);

    connection.onopen = function() {
        console.log('connection established');
        initLobby(connection);
    };
});

function initLobby(connection, winner) {
    var lobby = $('#lobby');
    lobby.show();

    $('#createButton').on('click', function() {
        connection.send(JSON.stringify({
            id: 'thebestgameofalltimesever',
            type: 'create'
        }));
        showGame();
    });

    $('#button-ready').on('click', function() {
        connection.send(JSON.stringify({
            id: 'thebestgameofalltimesever',
            type: 'ready'
        }));
        $('#button-ready').hide();
    });

    //TODO show info about who lost last game

    connection.onmessage = function(event) {
        console.log(event.data);
        var message = JSON.parse(event.data);

        if(message.type === 'lobbyPool'){
            updateGamesList(message.content);
        }
    };

    function updateGamesList(games){

        var gamesList = $('#gamesList');
        gamesList.empty();

        games.forEach(function(id){

            var gameButton = $('<li id="'+id+'" class="btn">join game: '+id+'</li>');
            gameButton.on('click', function(){
                joinGame(id);
            });

            gamesList.append(gameButton);
        });
    }

    function joinGame(id){
        connection.send(JSON.stringify({
            id: id,
            type: 'join'
        }));
        showGame();
    }

    function showGame() {
        lobby.hide();
        initGame(connection);
    }
}

function initGame(connection) {
    var game = $('#game');
    game.show();

    var log = $('#log');

    var keyMap = initKeyMap();

    var router = {
        gameover: gameOver,
        tick: updateGame,
        playerJoined: playerJoined,
        lobbyPool: function(){},
        start: displayPlayerColor,
        error: handleError
    };

    connection.onmessage = function(msg) {
        msg = JSON.parse(msg.data);
        if (router.hasOwnProperty(msg.type)) {
            router[msg.type](msg);
        }
    };

    $(document).keydown(keyListener);

    var playerColors = {
        0: 'red',
        1: 'green',
        2: 'blue',
        3: 'black'
    };
    var players = [];
    var playingField = $('#playingField');
    var ctx = playingField[0].getContext('2d');

    function playerJoined(message) {
        players = message.content;
        var $players = $('#playerList');
        $players.empty();
        players.forEach(function(player, index) {
           $players.append(
               $('<span class="player-name" style="color: '+playerColors[index]+'">' + player.name + '</span>')
           );
        });
    }

    function displayPlayerColor(message) {
        $('#playerColor').text(message.message.name);
        $('#playerColor').css('background-color', playerColors[message.message.index]);
    }

    function handleError(msg) {
        game.hide();
        initLobby(connection, msg.content);
    }

    function updateGame(msg) {
        var area = msg.state.area;
        //TODO refactor
        var rectangleWidth = playingField.width()/area[0].length;
        var rectangleHeight = playingField.height()/area.length;
        //updateLog
        log.empty();
        //log.append($('<span>' + JSON.stringify(area) + '</span>'));

        //update visual
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, playingField.width(), playingField.height());
        area.forEach(function(row, x) {
            row.forEach(function(playerId, y) {
                if (playerId > -1) {
                    ctx.fillStyle = playerColors[playerId];
                    ctx.fillRect(x*rectangleWidth, y*rectangleHeight, rectangleWidth, rectangleHeight);
                }
            });
        });
        updateStatistics(msg.state);
    }

    function updateStatistics(state){
        var text = state.players.reduce(function(acc, player){
            return acc + 'player' + player.id + ': ' + player.score + '/ ';
        }, '');

        $('#statistics').text(text);
    }

    function keyListener(event) {
        log.prepend($('<span>Key pressed: ' + event.keyCode + '</span>'));
        var doStuff = keyMap[event.keyCode];
        if (doStuff !== undefined) {
            doStuff();
        }
    }

    function gameOver(msg) {
        game.hide();
        initLobby(connection, msg.winner);
    }

    function initKeyMap() {
        var keyMap = {};
        // move down:
        //      arrow down
        //      key: s
        keyMap["40"] = moveDown;
        keyMap["83"] = moveDown;
        // move up:
        //      arrow up
        //      key: w
        keyMap["38"] = moveUp;
        keyMap["87"] = moveUp;
        // move left:
        //      arrow left
        //      key: a
        keyMap["37"] = moveLeft;
        keyMap["65"] = moveLeft;
        // move right:
        //      arrow right
        //      key: d
        keyMap["39"] = moveRight;
        keyMap["68"] = moveRight;
        return keyMap;
    }

    function moveDown() {
        move('DOWN');
    }
    function moveUp() {
        move('UP');
    }
    function moveLeft() {
        move('LEFT');
    }
    function moveRight() {
        move('RIGHT');
    }

    function move(direction) {
        connection.send(JSON.stringify({
            'type': 'control',
            'direction': direction
        }));
    }
}
