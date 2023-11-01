const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const cors = require("cors");

app.use(cors());

const PORT = process.env.PORT || 3001;

const io =  new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
    }
});

// Initialize an object to store users in rooms
const usersInRooms = {};

io.on('connection', (socket) => {
  //console.log(`A user ${socket.id} connected`);

  socket.on('joinRoom', (roomName, userName) => {
    // Joining/creating room with random roomName
    socket.join(roomName);
    console.log(`${userName} (${socket.id})  joined room: ${roomName}`);

    // If there's no list of users for that room, create one
    if (!usersInRooms[roomName]) {
      usersInRooms[roomName] = [];
    }
    // Add the user to the list of users in the room, pushing socket.id, userName and roomName
    usersInRooms[roomName].push({ id: socket.id, userName: userName, roomName: roomName, isReady: false, score: 0 });

    // Emit the updated list of users to all users in the room
    io.to(roomName).emit('updateUserList', usersInRooms[roomName]);
    //console.log(usersInRooms[roomName]);
  });

  socket.on('playerReady', (isReady) => {
    // Find the user in the list by socket.id and set isReady to true
    Object.keys(usersInRooms).forEach((roomName) => {
      const user = usersInRooms[roomName].find((user) => user.id === socket.id);
      if (user) {
        user.isReady = !isReady;
      }
      io.to(roomName).emit('updateUserList', usersInRooms[roomName]);
      //console.log(usersInRooms[roomName]);
    });
  });
  
  socket.on('sendScore', (score) => {
    // Find the user in the list by socket.id and set isReady to true
    Object.keys(usersInRooms).forEach((roomName) => {
      const user = usersInRooms[roomName].find((user) => user.id === socket.id);
      if (user) {
        user.score = score;
      }
      //console.log(usersInRooms[roomName]);
    });
  });

  socket.on('getUsers', (roomName) => {
    if (usersInRooms[roomName]) {
      const userList = usersInRooms[roomName];
      socket.emit('returnUsers', userList); // Emit the list of users back to the client
    } else {
      socket.emit('returnUsers', []); // Return an empty array if the room doesn't exist
    }
  });


  socket.on('disconnect', () => {
    console.log(`User ${socket.id} disconnected`);
    // Handle user removal from all rooms when they disconnect
    Object.keys(usersInRooms).forEach((roomName) => {
      usersInRooms[roomName] = usersInRooms[roomName].filter((user) => user.id !== socket.id);
      // Emit the updated list of users to all users in the room
      io.to(roomName).emit('updateUserList', usersInRooms[roomName]);
      //console.log(usersInRooms[roomName]);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
