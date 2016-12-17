import six

from flask import Flask, render_template, request, make_response, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room, rooms

if six.PY2:
    range = xrange

app = Flask(__name__)
app.config['SECRET_KEY'] = 'this_is_totally_a_secret'  # required to let WebSockets work.
sock = SocketIO(app, async_mode=None)  # async_mode=threading, eventlet, gevent, or None to let application pick
GYRO = {}


def get_room_id(room_name, num_channels):
    return '%s%s' % (room_name, num_channels)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/<room_name>/<int:num_channels>')
def serve_room(room_name, num_channels):
    global GYRO
    room_id = get_room_id(room_name, num_channels)
    GYRO.setdefault(room_id, {})
    return render_template('room.html', room_id=room_id)


@app.route('/<room_name>/<int:num_channels>/out')
def get_votes(room_name, num_channels):
    global GYRO
    room_id = get_room_id(room_name, num_channels)
    votes = GYRO.get(room_id, {})

    az, el, count = ([0.0] * num_channels for _ in range(3))  # generate all three empty lists at once
    for sid, vote in six.iteritems(votes):
        for channel in vote['ch']:
            ch = int(channel) - 1  # usually a 1-indexed string
            az[ch] += vote['az']
            el[ch] += vote['el']
            count[ch] += 1

    return make_response(jsonify(list(gen_channels(az, el, count))))


def gen_channels(az, el, count):
    # done as generator for efficiency to avoid making multiple list objects
    # grambilib~ uses a range of 0.0 to 1.0 for azimuth and elevation. Input from mobile is scaled accordingly
    for ch in range(len(count)):
        if count[ch] > 0:
            yield [
                az[ch] / count[ch] / 360.0,  # input comes in range of 0 to 360 degrees
                ((el[ch] / count[ch]) + 90.0) / 180.0  # input comes in range of -45 to 45 degrees
            ]
        else:
            # default for no votes is front of room and eye level
            yield [0.0, 0.5]


@sock.on('connect', namespace='/voter')
def connect():
    emit('connected')


@sock.on('join', namespace='/voter')
def voter_join(message):
    global GYRO
    if len(rooms()) > 1:
        emit('error', {'m': 'Cannot join multiple rooms.'})
        return

    room = message.get('room', None)
    if room is None:
        emit('error', {'m': "Invalid room."})
    else:
        join_room(room)
        GYRO.setdefault(room, {})
        emit('joined', {'m': 'Joined room %s' % room})


@sock.on('vote_gyro', namespace='/voter')
def vote_gyro(message):
    global GYRO
    room = rooms()[0]

    if room is None or room == request.sid:
        print(room, request.sid)
        return
    GYRO[room][str(request.sid)] = {
        'az': message.get('az', 0.0), 'el': message.get('el', 0.0), 'ch': message.get('ch', [])
    }


@sock.on('disconnect', namespace='/voter')
def disconnect():
    global GYRO
    room = rooms()[0]
    GYRO[room].pop(request.sid)
    leave_room(room)
    if len(GYRO[room]) == 0:  # if this was the last user in the room, delete the room entirely.
        GYRO.pop(room)


if __name__ == '__main__':
    # normally debug only allows localhost to connect - not useful for testing rotation from a phone
    # host=0.0.0.0 allows any client to connect (not just localhost) even if debug is True
    sock.run(app, debug=False, host='0.0.0.0')
