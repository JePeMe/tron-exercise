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
    document.getElementById('createButton')
        .addEventListener('click', function() {
            connection.send(JSON.stringify({
                id: 'thebestgameofalltimesever',
                type: 'create'
            }));
        });

    connection.onmessage = function(event) {
        var message = JSON.parse(event.data);
        console.log(message);

        if(message.type === 'lobbyPool'){
            updateLobbyDisplay(message.content, connection);
        }
    };
}

function updateLobbyDisplay(games, connection){

    var gamesList = $('#gamesList');
    gamesList.empty();

    games.forEach(function(id){

        var gameButton = $('<li id="'+id+'" class="btn">join game: '+id+'</li>');
        gameButton.on('click', function(){
            joinGame(id, connection);
        });

        gamesList.append(gameButton);
    });
}

function joinGame(id, connection){
    connection.send(JSON.stringify({
        id: id,
        type: 'join'
    }));
}