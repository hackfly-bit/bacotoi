const express = require("express");
const app = express();
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");
const io = require("socket.io")(server, {
  cors: {
    origin: '*'
  }
});
const path = require( 'path' );
const favicon = require( 'serve-favicon' );
const mysql = require('mysql');
const bodyParser = require('body-parser');
// Peer

const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
});


var db_config = {
  host: 'us-cdbr-east-04.cleardb.com', 
  user: 'b89b9a8311489b',      
  password: '0c4523bd',      
  database: 'heroku_56f77d080822736' 
};

var conn;

function handleDisconnect() {
  conn = mysql.createConnection(db_config); // Recreate the connection, since
                                                  // the old one cannot be reused.

  conn.connect(function(err) {              // The server is either down
    if(err) {                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    }                                     // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  conn.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}

handleDisconnect();

// const conn = mysql.createConnection({

//   //local
//   // host: 'localhost', 
//   // user: 'fajrun',      
//   // password: '123',      
//   // database: 'fajrun' 

//   //server
//   host: 'us-cdbr-east-04.cleardb.com', 
//   user: 'b89b9a8311489b',      
//   password: '0c4523bd',      
//   database: 'heroku_56f77d080822736' 
// }); 
// conn.connect(function(err) {
//   if (err) throw err;
//   console.log('Database is connected successfully !');
// });

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use( favicon( path.join( __dirname, 'favicon.ico' ) ) );
//app.use( '/public', express.static( path.join( __dirname, 'public' ) ) );
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use("/peerjs", peerServer);

app.get( '/', ( req, res ) => {
  res.render("home");
} );

app.post('/tambah',(req, res) => {
  let data = {nama: req.body.nama, email: req.body.email, kelamin: req.body.checkbox , pesan: req.body.textarea};
  let sql = "INSERT INTO webrtc SET ?";
  let query = conn.query(sql, data,(err, results) => {
    if(err) throw err;
   res.redirect('/r')
  });
});

app.get('/data', (req, res) => {
  let sql = " SELECT * from webrtc";
  let query = conn.query(sql, (err, rows) => {
    if(err) throw err;
    res.render('data', {
      title : 'Data buku tamu ',
      user : rows
    })
  })
})

app.get("/r", (req, rsp) => {
  rsp.redirect(`/${uuidv4()}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).broadcast.emit("user-connected", userId);

    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", message);
    });
  });
});

server.listen(process.env.PORT || 3030);
