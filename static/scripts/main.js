var namespace, socket, gyro,
    room_id, num_channels,
    selected_channels = [],
    in_room = false, do_send = false;


function getRoomId() {
    // RoomId is encoded in the URL as /<room_name>/<num_channels>/
    var url_parts = window.location.pathname.split('/');
    if (url_parts.length < 3) {
        room_id = undefined;
    }
    else {
        room_id = url_parts[1] + url_parts[2];
        num_channels = parseInt(url_parts[2]);
        // this should be handled by <int:num_channels> in flask, but juuust in case.
        if (isNaN(num_channels) || num_channels == 0) {
            room_id = undefined;
        }
    }
}


function onNoGyroSupport() {
    // No gyro support, so just tell them they suck.
    document.getElementById('no_gyro').className = '';  // shows
}


function startCalibration() {
    // Gyro check is done by gyro.init(), but that only checks browser support
    // gyro.isAvailable() checks if more than just zeros are received
    if (gyro.isAvailable(GyroNorm.DEVICE_ORIENTATION)) {
        gyro.start(onGyroDataReceive);
        document.getElementById('calibration').className = '';  // shows
        openSocket();  // get the socket opened now so that the room can be joined early.
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
    // we only want elevation -90 < el < 90. The rest is ridiculous.
    var el = gyro_data.do.beta;
    if (el < -90) {
        el = -90.0;
    }
    else if (el > 90) {
        el = 90.0;
    }

    if (!do_send) {
        document.getElementById('az').innerHTML = '' + gyro_data.do.alpha;
        document.getElementById('el').innerHTML = '' + el;
    }
    if (in_room && do_send && selected_channels.length > 0) {
        socket.emit('vote_gyro', {az: gyro_data.do.alpha, el: el, ch: selected_channels});
    }
}


function onRecalibrateClick() {
    // This doesn't seem to have any effect.
    // Might need to clear prior head first.
    gyro.setHeadDirection();
}


function onStartClick() {
    document.getElementById('how_to').className = 'hidden';  // shows
    document.getElementById('vote').className = '';  // shows
    createVoterUI();
    do_send = true;
}


function createVoterUI() {
    // create a roughly even grid of buttons
    var container = document.getElementById('vote_buttons'),
        totalWidth = container.offsetWidth,
        totalHeight = container.offsetHeight,
        numCols = Math.ceil(Math.sqrt(num_channels)),
        numRows = Math.ceil(1.0 * num_channels / numCols),
        width = Math.floor(totalWidth / numRows) - 45,
        height = Math.floor(totalHeight / numCols) - 45,
        selected = Math.floor(Math.random() * num_channels) + 1,
        btn, i = 1;

    // select a random channel so the client always sends something
    selected_channels.push(selected + '');

    // this button creation could be done in Jinja2, but oh well.
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
            if (i > num_channels) {  // stop if we hit the number we need.
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
        // after connection, join the current room.
        socket.emit('join', {room: room_id});
    });

    socket.on('joined', function() {
        in_room = true;
    });

    /*
        Debug and error messages may be sent, but some of them don't mean much
        as there are bugs in the server - so let's just ignore them!
     */
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
        frequency: 200,
        gravityNormalized: true,
        orientationBase: GyroNorm.GAME,
        decimalCount: 4,
        logger: null,
        screenAdjusted: true
    }).then(startCalibration).catch(onNoGyroSupport);
});
