const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const cors = require("cors");
const path = require("path");

app.use(cors());

const PORT = process.env.PORT || 3001;

// Serve static assets (e.g., CSS, images, etc.) directly
app.use(express.static(path.join(__dirname, 'masterpiecemayhem/dist')));

// Define a catch-all route to serve your React app for all non-static routes
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'masterpiecemayhem', 'dist', 'index.html'));
});


const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://masterpiecemayhem.onrender.com"],
    methods: ["GET", "POST"],
  }
});

// Setting the 'Access-Control-Allow-Origin' header
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://masterpiecemayhem.onrender.com");
  res.header("Access-Control-Allow-Methods", "GET, POST");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Initialize an object to store users in rooms
const usersInRooms = {};

const usedPaintingsInRooms = {};

const playerIconPaths = [
  "/imgs/player_icons/icon_alligator.png",
  "/imgs/player_icons/icon_anchor.png",
  "/imgs/player_icons/icon_coffee.png",
  "/imgs/player_icons/icon_domino.png",
  "/imgs/player_icons/icon_flamingo.png",
  "/imgs/player_icons/icon_florida.png",
  "/imgs/player_icons/icon_rooster.png",
  "/imgs/player_icons/icon_sun.png",
  "/imgs/player_icons/icon_sunglasses.png",
  "/imgs/player_icons/icon_tree.png"
];

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

    // Selecting a value for player icon
    var randomValue = Math.floor(Math.random() * 10);
    
    // Add the user to the list of users in the room, pushing socket.id, userName and roomName
    usersInRooms[roomName].push({ id: socket.id, userName: userName, roomName: roomName, isReady: false, score: 0, playerIcon: playerIconPaths[randomValue], canvasData: [] });

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

  socket.on('sendCanvasData', (canvasData) => {
    // Convert Buffer to array of numbers
    const dataArray = Array.from(canvasData);
    
    // Find the user in the list by socket.id and set canvas data
    Object.keys(usersInRooms).forEach((roomName) => {
        const user = usersInRooms[roomName].find((user) => user.id === socket.id);
        if (user) {
            user.canvasData = dataArray; // Store the converted array in user object
        }
        console.log(usersInRooms[roomName]);
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

  socket.on('setUsedPaintings', (roomName, paintingNum) => {
    // Ensure that usedPaintingsInRooms[roomName] is initialized as an array
    if (!usedPaintingsInRooms[roomName]) {
      usedPaintingsInRooms[roomName] = [];
    }

    // Check if paintingNum already exists in the array before pushing
    if (!usedPaintingsInRooms[roomName].includes(paintingNum)) {
      // Add the paintingNum to the list of used paintings in the room
      usedPaintingsInRooms[roomName].push(paintingNum);
    }
    //console.log(usedPaintingsInRooms[roomName]);
  });

  socket.on('generateNumber', (roomName) => {
    var randomValue = 0;
    // Ensure that usedPaintingsInRooms[roomName] is initialized as an array
    if (!usedPaintingsInRooms[roomName]) {
      usedPaintingsInRooms[roomName] = [];
    }

    // Reset the array if its length is 4
    if (usedPaintingsInRooms[roomName].length === 5) {
      usedPaintingsInRooms[roomName] = [];
    }

    // Keep generating a random number until a unique one is found
    do {
      randomValue = Math.floor(Math.random() * 5);
    } while (usedPaintingsInRooms[roomName].includes(randomValue));

    io.to(roomName).emit('receiveNumber', randomValue);
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
