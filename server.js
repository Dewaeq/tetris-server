const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {},
});

const Room = require("./room.js");

/** @type {Object.<number, Room>} */
let rooms = {};

io.on("connection", (socket) => {
  console.log(`${socket.id} connected`);

  socket.on("disconnect", () => {
    console.log(`${socket.id} disconnected`);
  });

  socket.on("joinRoom", (data) => {
    const code = data.code;
    const userName = data.userName;

    if (rooms[code] === undefined) {
      rooms[code] = new Room(code);
    }

    const succes = rooms[code].addUser(socket, userName);

    if (succes) {
      console.log(`${userName} joined room ${code}`);
      socket.emit("joined", code);

      if (rooms[code].full()) {
        rooms[code].start();
      }
    }

  });
});

app.get('/', (req, res) => {
  let obj = {};
  for (code in rooms) {
    obj[code] = rooms[code].toJson();
  }

  res.json(obj);
});

app.get("/joinRoom", (req, res) => {
  if (typeof (req.query.code) === "undefined" || typeof (parseInt(req.query.code)) === "undefined") {
    return res.send({ error: "Provide a valid room code!" });
  }

  const code = parseInt(req.query.code);
  if (rooms[code] === undefined) {
    return res.send({ error: `Failed to join room ${code}! Room does not exist.` });
  }
  else if (rooms[code].full) {
    return res.send({ error: `Failed to join room ${code}! Room is already at max capacity.` });
  }

  rooms[code] = new Room(code);
  res.send({ code: parseInt(req.query.code) });
});

server.listen(process.env.PORT || 3000, () => {
  console.log('listening on *:', process.env.PORT || 3000);
});