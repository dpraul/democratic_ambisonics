var namespace, socket,
    latency_times = [], start_time;


function getRoomId() {
    var url_parts = window.location.pathname.split('/');
    if (url_parts.length < 3) {
        return undefined;
    }
    return url_parts[1] + url_parts[2];
}


function openSocket(room) {
    namespace = '/voter';

    var socket = io.connect(namespace);
    socket.on('connected', function () {
        socket.emit('join', {room: room});
    });

    socket.on('joined', function() {
        gyro.startTracking(function (gyro_data) {
            var b = document.getElementById('example'),
                f = document.getElementById('features');
            f.innerHTML = gyro.getFeatures();
            b.innerHTML = "<p> x = " + gyro_data.x + "</p>" +
                "<p> y = " + gyro_data.y + "</p>" +
                "<p> z = " + gyro_data.z + "</p>" +
                "<p> alpha = " + gyro_data.alpha + "</p>" +
                "<p> beta = " + gyro_data.beta + "</p>" +
                "<p> gamma = " + gyro_data.gamma + "</p>";
            start_time = (new Date).getTime();
            socket.emit('vote_gyro', {gyro: gyro_data});
        });
    });

    socket.on('pong', function () {
        var latency = (new Date).getTime() - start_time;
        latency_times.push(latency);
        if (latency_times.length > 30) {
            latency_times.shift(); // remove oldest sample
        }
        var sum = latency_times.reduce(function(a, b) { return a + b; }, 0);
        $('#ping-pong').text(Math.round(10 * sum / latency_times.length) / 10);
    });

    socket.on('debug', function (msg) {
        $('#log').append('<br>' + $('<div/>').text('Debug:' + msg.m).html());
    });
    socket.on('error', function (msg) {
        $('#log').append('<br>' + $('<div/>').text('Error:' + msg.m).html());
    });
}


$(document).ready(function() {
    var room = getRoomId();

    if (room == undefined) {
        return;
    }
    openSocket(room);
});
