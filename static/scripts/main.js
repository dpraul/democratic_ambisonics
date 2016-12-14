var namespace, socket, gyro,
    room_id, num_channels,
    selected_channels = [],
    in_room = false, do_send = false,
    latency_times = [], start_time;


function getRoomId() {
    var url_parts = window.location.pathname.split('/');
    if (url_parts.length < 3) {
        room_id = undefined;
    }
    else {
        room_id = url_parts[1] + url_parts[2];
        num_channels = parseInt(url_parts[2]);
        if (isNaN(num_channels) || num_channels == 0) {
            room_id = undefined;
        }
    }
}


function onNoGyroSupport() {
    document.getElementById('no_gyro').className = '';  // shows
}


function startCalibration() {
    if (gyro.isAvailable(GyroNorm.DEVICE_ORIENTATION)) {
        gyro.start(onGyroDataReceive);
        document.getElementById('calibration').className = '';  // shows
        openSocket();
    }
    else {
        onNoGyroSupport();
    }
}


function onCalibrateClick() {
    document.getElementById('calibration').className = 'hidden';
    gyro.setHeadDirection();
    document.getElementById('how_to').className = '';  // shows
}


function onGyroDataReceive(gyro_data) {
    // we only want elevation -90 < el < 90
    var el = gyro_data.do.beta;
    if (el < -90) {
        el = -90.0;
    }
    else if (el > 90) {
        el = 90.0;
    }

    if (!do_send) {
        document.getElementById('az').innerHTML = '' + gyro_data.do.alpha;
        document.getElementById('el').innerHTML = '' + gyro_data.do.beta;
    }
    if (in_room && do_send && selected_channels.length > 0) {
        socket.emit('vote_gyro', {az: gyro_data.do.alpha, el: el, ch: selected_channels});
    }
}


function onRecalibrateClick() {
    gyro.setHeadDirection();
}


function onStartClick() {
    document.getElementById('how_to').className = 'hidden';  // shows
    document.getElementById('vote').className = '';  // shows
    createVoterUI();
    do_send = true;
}


function createVoterUI() {
    var container = document.getElementById('vote_buttons'),
        totalWidth = container.offsetWidth,
        totalHeight = container.offsetHeight,
        numCols = Math.ceil(Math.sqrt(num_channels)),
        numRows = Math.ceil(1.0 * num_channels / numCols),
        width = Math.floor(totalWidth / numRows) - 45,
        height = Math.floor(totalHeight / numCols) - 45,
        selected = Math.floor(Math.random() * num_channels) + 1,
        btn, i = 1;

    selected_channels.push(selected + '');

    for (var row = 0; row < numRows; row++) {
        for (var col = 0; col < numCols; col++) {
            btn = document.createElement('button');
            btn.innerHTML = i;
            btn.setAttribute('data-channel', '' + i);
            btn.style.width = width + 'px';
            btn.style.height = height + 'px';
            btn.onclick = onChannelSelect;
            if (selected == i) {
                btn.className = 'selected';
            }
            container.appendChild(btn);

            i++;
            if (i > num_channels) {
                return;
            }
        }
    }
}


function onChannelSelect() {
    var channel = this.getAttribute('data-channel');

    if (this.className.indexOf('selected') < 0) {  // not selected
        this.className = 'selected';
        selected_channels.push(channel);
    }
    else {
        this.className = '';
        selected_channels.splice(selected_channels.indexOf(channel), 1);  // remove from selections
    }
}


function openSocket() {
    namespace = '/voter';

    socket = io.connect(namespace);
    socket.on('connected', function () {
        socket.emit('join', {room: room_id});
    });

    socket.on('joined', function() {
        in_room = true;
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
        // msg.m
    });
    socket.on('error', function (msg) {
        // msg.m
    });
}


$(document).ready(function() {
    getRoomId();

    if (room_id == undefined) {  // invalid room
        document.getElementById('bad_room').className = '';  // show
        return;
    }

    document.getElementById('btn_calibrate').onclick = onCalibrateClick;
    document.getElementById('btn_start').onclick = onStartClick;
    document.getElementById('btn_recalibrate').onclick = onRecalibrateClick;

    gyro = new GyroNorm();
    gyro.init({
        frequency: 100,
        gravityNormalized: true,
        orientationBase: GyroNorm.GAME,
        decimalCount: 4,
        logger: null,
        screenAdjusted: true
    }).then(startCalibration).catch(onNoGyroSupport);
});
