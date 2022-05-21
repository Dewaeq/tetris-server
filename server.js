// Use the port provided by heroku on production
// and fall back to 3000 when developping
const PORT = process.env.PORT || 3000;

const Room = require("./room.js");
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, { cors: {} });


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
    let isHost = false;

    if (!rooms[code] || rooms[code].isEmpty()) {
      rooms[code] = new Room(code, socket.id);
      isHost = true;
    }

    const succes = rooms[code].addUser(socket, userName);

    if (succes) {
      console.log(`${userName} joined room ${code}`);
      socket.emit("joined", { code: code, isHost: isHost, users: rooms[code].usersJson() });
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
  if (!req.query.code || isNaN(req.query.code)) {
    return res.send({ error: "Provide a valid room code!" });
  }

  const code = parseInt(req.query.code);

  if (!rooms[code]) {
    return res.send({ error: `Failed to join room ${code}! Room does not exist.` });
  }
  else if (rooms[code].isFull()) {
    return res.send({ error: `Failed to join room ${code}! Room is already at max capacity.` });
  }

  rooms[code] = new Room(code);
  res.send({ code: parseInt(req.query.code) });
});

server.listen(PORT, () => {
  console.log('listening on *:', PORT);
});