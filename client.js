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

    var router = {
        gameover: gameOver,
        tick: updateLog,
        lobbyUpdate: function(){},
        lobbyPool: function(){},
        start: function(){},
    };

    connection.onmessage = function(msg) {
        msg = JSON.parse(msg.data);
        if (router.hasOwnProperty(msg.type)) {
            router[msg.type](msg);
        }
    };

    $(document).on('keyDown', keyListener);


    function updateLog(msg) {
        log.empty();
        log.append($('<span>' + JSON.stringify(msg.state.area) + '</span>'));
        updateStatistics(msg.state);
    }

    function updateStatistics(state){
        var text = state.players.reduce(function(acc, player){
            return acc + 'player' + player.id + ': ' + player.score + '/ ';
        }, '');

        $('#statistics').text(text);
    }

    function keyListener(event) {
        log.append($('<span>Key pressed: ' + event.keyCode + '</span>'));
        connection.send(JSON.stringify({
            type: 'control',
            value: event.keyCode
        }));
    }

    function gameOver(msg) {
        game.hide();
        initLobby(connection, msg.winner);
    }
}
