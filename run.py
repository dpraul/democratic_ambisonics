from flask import Flask, render_template, session, request
from flask_socketio import SocketIO, emit, join_room, leave_room, close_room, rooms


app = Flask(__name__)
app.config['SECRET_KEY'] = 'this_is_totally_a_secret'
sock = SocketIO(app, async_mode=None)  # threading, eventlet, gevent, or None to let application pick
thread = None
GYRO = {}
started = False


def get_room_id(room_name, room_size):
    return '%s%s' % (room_name, room_size)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/<room_name>/<room_size>')
def serve_room(room_name, room_size):
    global GYRO
    room_id = get_room_id(room_name, room_size)
    GYRO.setdefault(room_id, {})
    return render_template('room.html', room_id=room_id)


@sock.on('connect', namespace='/voter')
def connect():
    emit('connected')


@sock.on('join', namespace='/voter')
def voter_join(message):
    if len(rooms()) > 1:
        emit('error', {'m': 'Cannot join multiple rooms.'})
        return

    room = message.get('room', None)
    if room is None:
        emit('error', {'m': "Invalid room."})
    else:
        join_room(room)
        emit('joined', {'m': 'Joined room %s' % room})


@sock.on('vote_gyro', namespace='/voter')
def vote_gyro(message):
    global GYRO
    room = rooms()[0]
    gyro = message.get('gyro', 0)
    GYRO[room][request.sid] = gyro
    emit('pong')


@sock.on('disconnect', namespace='/voter')
def disconnect():
    global GYRO
    room = rooms()[0]
    GYRO[room].pop(request.sid)
    leave_room(room)
    if len(GYRO[room]) == 0:
        GYRO.pop(room)


if __name__ == '__main__':
    sock.run(app, debug=True)
