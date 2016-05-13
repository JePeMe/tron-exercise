document.addEventListener('DOMContentLoaded', function() {
    var SERVER_WS_URL = 'ws://localhost:1337';

    console.log('starting connection...');
    var connection = new WebSocket(SERVER_WS_URL);

    connection.onopen = function() {
        console.log('connection established');
    };

    connection.onmessage = function(event) {
        console.log(event.data);
        connection.send(JSON.stringify({
            id: 'thebestgameofalltimesever',
            type: 'create'
        }));
    };
});
