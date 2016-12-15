# Democratic Ambisonics

## Goal

Let the audience vote how they want a piece to sound! Audience members will use their phones to point where
they want an instrument in a piece to come out in an ambisonics array. To so so, a piece must be exported so
each instrument is in a single channel of a multichannel WAVE file. Thereafter, a web server communicates
gyroscope data from the phones to give each person a vote on how the piece plays.


## Setup

1. Install bower: `npm install -g bower`
2. Install bower requirements: `bower install`
3. Create a virtualenv: `virtualenv env` & enter it `env\Scripts\activate`
4. Install Python requirements: `pip install -r requirements.txt`
5. Install Pure Data requirements (all available on deken):
    - PuREST JSON - https://github.com/residuum/PuRestJson
    - grambilib~ - https://github.com/rickygraham/grambilib
    - cyclone - https://puredata.info/downloads/cyclone
    
    
## Running

1. Export your project so each channel you want to control is a different channel in a multichannel WAVE file.
2. Setup the Pd patch `pd-client/client.pd`  (see Pure Data setup)
3. Run the server with `python run.py` (make sure you're still in the virtualenv)
4. Assure your server and clients are all connected to the same network (or that your server has a public IP)
5. Connect your clients to `http://<YOUR_IP>:5000/<project_name>/<num_channels>`
    - There will probably be KeyError messages in the server console. These are fine (see Known Problems)
6. Set up audio output and enable DSP in PureData
7. Hit the bang to start the file open in PureData
8. Hit the toggle to start the file playing
9. Tell your clients to pick a channel and point a direction. Woo! Democratic ambisonics!


## Pure Data Setup

0. Input has only been tested with multichannel WAVE files, but in theory `[readsf~]` will accept other multichannel files
1. Set the directory to your multichannel WAVE at the top of the file
2. Specify the number of channels as the first argument to `[readsf~]`
3. Set URL to listen for before `[rest]` in the format of `GET http://localhost:5000/<room_name>/<num_channels>/out`
4. For each channel:
    1. Connect a send to the output of `[readsf~]` in the form of `[s~ c<CHANNEL NUM>]`.  
        NOTE: There should be (num channels) + 1 outputs on `[readsf~]` as the last output will send a bang 
        when the file is finished. Assure this is connected to `[s done]`
    2. At the bottom in the ENCODING section, create a `[r~ c<CHANNEL NUM]` and `[r m<CHANNEL NUM>]` that connects to
        a `[grambipan~ 3]` of its own.
    3. Route each output of the new `[grambipan~ 3]` to each of the `[s~ e<1-7>]` at the bottom of the file.
5. Assign the output configuration in `[grambidec~]`, and the output channels in `[dac~]`

NOTE: There are surely better ways of implementing this in Pure Data. My Pure Data skills are not that refined.


# Known Problems

 - While clients are joining, sometimes the WebSocket messages get the wrong priority for modifying GYRO.
 This is likely a result of a global resources shared by many processes.  
 This means votes might send to a room before it is created. If this happens, KeyError messages will appear
 in the console. After the room is created these will stop.
 
 
# Libraries Used

- Python: (see requirements.txt)
    - Flask - http://flask.pocoo.org/
    - SocketIO - https://flask-socketio.readthedocs.io/en/latest/
    - eventlet (for SocketIO) - http://eventlet.net/
- JavaScript:
    - SocketIO-client - https://github.com/socketio/socket.io-client
    - Gyronorm.js (for gyroscope data) - https://github.com/dorukeker/gyronorm.js
    - jQuery (for Gyronorm.js) - https://jquery.com/
- Pure Data:
    - PuREST JSON - https://github.com/residuum/PuRestJson
    - grambilib~ - https://github.com/rickygraham/grambilib
    - cyclone - https://puredata.info/downloads/cyclone
    