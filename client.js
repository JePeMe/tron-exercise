document.addEventListener('DOMContentLoaded', function() {
    var SERVER_WS_URL = 'ws://localhost:1337';

    console.log('starting connection...');
    var connection = new WebSocket(SERVER_WS_URL);

    connection.onopen = function() {
        console.log('connection established');
        initLobby(connection);
    };
});

function initLobby(connection) {
    var lobby = $('#lobby');

    $('#createButton').on('click', function() {
        connection.send(JSON.stringify({
            id: 'thebestgameofalltimesever',
            type: 'create'
        }));
        showGame();
    });

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

    connection.onmessage = updateLog;

    $(document).on('keyDown', keyListener);

    function updateLog(event) {
        console.log(event.data);
        var message = JSON.parse(event.data);
        log.append($('<span>' + event.data + '</span>'));
    }

    function keyListener(event) {
        log.append($('<span>Key pressed: ' + event.keyCode + '</span>'));
        connection.send(JSON.stringify({
            type: 'control',
            value: event.keyCode
        }));
    }
}