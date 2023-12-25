const config = require(process.env.CONFIG_PATH || './config.json');
//packages
var express = require("express");
var app = express();
var path = require('path');
var mysql = require("mysql");
var http = require('http').Server(app);
var io = require("socket.io")(http);

//express paths
app.use(express.static(path.join(__dirname, 'public')));
app.get("/", function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

//mysql connection
var db = mysql.createConnection({
  host: config.db_host,
  user: config.db_user,
  password: config.db_pass,
  database: config.db_name
});
db.connect(function (err) {
  if (err) console.log(err)
});

var users = 0,
  targets = [],
  players = [],
  results = [];

io.sockets.on('connection', function (socket) {
  users++;
  socket.on('disconnect', () => {
    users--;
  });


  db.query('select t1.id, t1.name,t4.network_id as infrastructure_id, group_concat(t2.id order by t2.id SEPARATOR ",") as findings, group_concat(t3.id order by t3.id SEPARATOR ",") as treasures from target as t1 left join finding as t2 on t2.target_id=t1.id LEFT JOIN treasure as t3 on t3.target_id=t1.id LEFT JOIN network_target as t4 on t4.target_id=t1.id GROUP BY t2.target_id,t1.id')
  .on('result', (data) => {
    targets.push(data);
  })
  .on('end', () => {
    socket.emit('targets', targets)
  });

  db.query('SELECT t1.*,t2.id as profile_id from player as t1 left join profile as t2 on t1.id=t2.player_id')
  .on('result', (data) => {
    players.push(data);
  })
  .on('end', () => {
    socket.emit('players', players)
  });

  // select team_id as id, name, points from team_score as t1 left join team as t2 on t1.team_id=t2.id
  db.query('select * FROM (select t1.id,model_id,title,t2.username,t1.model,t1.ts from stream t1 left join player as t2 on t1.player_id=t2.id order by t1.id desc, t1.ts desc limit 10) as tmptpl order by id,ts desc')
  .on('result', (data) => {
  results.push(data);
  })
  .on('end', () => {
    socket.emit('results', results)
  });
  results = [];
});

http.listen(config.listenPort, function () {
  console.log(`Listening on ${config.listenPort}`);
});
