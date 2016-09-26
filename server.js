// require the restify library.
var restify = require('restify');
// sql server library
var mysql = require('mysql');
// create an HTTP server.
server = restify.createServer();

server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.CORS());

// get garage status
server.get('/status/', function (req, res, cb) {

	var connection = getConnection();
	connection.connect();

	res.setHeader('Access-Control-Allow-Origin','*');

	var sql_query = "select * from GarageStatus gs " +
		"where datetimestamp = (select max(datetimestamp) " +
		"from GarageStatus gs2)" ;
	connection.query(sql_query, function(err, rows, fields) {
		if (err) throw err;
		res.send(rows);
	});
});

server.get('/image', function(req, res){
	var connection = getConnection();
	connection.connect();

	res.setHeader('Access-Control-Allow-Origin','*');

	var sql_query = "";

	connection.query(sql_query, function(err, rows, fields) {
		if (err) throw err;
		res.send(rows);
	});

})

// update garage status
server.post('/update', function(req, res, cb){
	var connection = getConnection();
	connection.connect();

	var statusData = {};
	var dateLocal = (new Date ((new Date((new Date(new Date())).toISOString() )).getTime() -
		((new Date()).getTimezoneOffset()*60000))).toISOString().slice(0, 19).replace('T', ' ');
	statusData.datetimestamp = dateLocal;
	statusData.status = req.params.status;

	res.setHeader('Access-Control-Allow-Origin','*');

	var sql_query = "insert GarageStatus (dateTimeStamp, status) values ('" + statusData.datetimestamp + "', " + statusData.status + ")";
	connection.query(sql_query, function(err, rows, fields) {
		if (err) throw err;
		res.send("status updated");
	});
})

function getConnection(){
	var connection = mysql.createConnection({
		host     : 'mzsgarage.db.2259289.hostedresource.com',
		user     : 'mzsgarage',
		password : 'KeeJudKev1!',
		database : 'mzsgarage'
	});
	return connection;
}

server.listen(process.env.PORT || 5001, function () { // bind server to port 5000.
	console.log('%s listening at %s', server.name, server.url);
});