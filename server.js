// // require the restify library.
// var restify = require('restify');
// // sql server library
// var mysql = require('mysql');
// // create an HTTP server.
// var server = restify.createServer();
//
//
// server.use(restify.queryParser());
// server.use(restify.bodyParser());
// server.use(restify.CORS());

var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var mysql = require('mysql');

var app = express();
app.use(bodyParser.urlencoded({ extended: false}))
app.use(bodyParser.json())

app.set('port', process.env.OPENSHIFT_NODEJS_PORT || 5001);
app.set('ip', process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1');
http.createServer(app).listen(app.get('port'), app.get('ip'), function () {
	console.log('Express server listening on port ' + app.get('port'));
});


// get garage status
app.get('/status', function (req, res, cb) {

	// var date = new Date();
	// var dateLocal = date.toString();

	var connection = getConnection();
	connection.connect();
	var sql_query = "select * from GarageStatus gs " +
		"where datetimestamp = (select max(datetimestamp) " +
		"from GarageStatus gs2)" ;
	connection.query(sql_query, function(err, rows, fields) {
		if (err) throw err;
		res.send(rows);
	});
});

app.get('/getImage', function(req, res){
	var connection = getConnection();
	connection.connect();
	var sql_query = "select captureREquested, captureCompleted from imageCapture where " +
		       "captureRequested != '' and captureCompleted is null";
	connection.query(sql_query, function(err, rows, fields) {
		if (err) throw err;
		res.send(rows);
	});
})


// update garage status
app.post('/update', function(req, res, cb){
	var connection = getConnection();
	connection.connect();

	var statusData = {};
	var date = new Date();
	statusData.datetimestamp = date.toString();
	statusData.status = req.params.status;
	
	res.setHeader('Access-Control-Allow-Origin','*');

	var sql_query = "update GarageStatus set status = " + statusData.status;
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

// server.listen(process.env.PORT || 5002, function () { // bind server to port 5000.
// 	console.log('%s listening at %s', server.name, server.url);
// });