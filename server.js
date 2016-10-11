// require the restify library.
var restify = require('restify');
// sql server library
var mysql = require('mysql');
var json = '';
var path = require("path");
var fs = require("fs");
var aws = require('aws-sdk');


// create an HTTP server.
var server = restify.createServer();

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

server.get('/imageStatus', function(req, res){
	var connection = getConnection();
	connection.connect();

	res.setHeader('Access-Control-Allow-Origin','*');

	var sql_query = "select imageCaptureId, captureRequested, captureCompleted from imageCapture where " +
			"captureRequested != '' and captureCompleted is null";
	connection.query(sql_query, function(err, rows, fields) {
		if (err) throw err;
		//json = JSON.stringify(rows[0]);
		res.send(rows[0]);
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


// post captured image
server.post('/image', function(req, res, cb){

	// get image data and manipulate it to remove 0D and 0A bytes
	var imageCaptureId = req.params.id;
    var data = req.body;
	var data2 = data.slice(1);
	var data3 = data2.slice(1);

	//set up aws s3 to copy file
	aws.config.accessKeyId = 'AKIAJRSYP4N7D6MRWN6Q'
	aws.config.secretAccessKey='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';
    aws.config.region = 'us-west-2';

	res.setHeader('Access-Control-Allow-Origin','*');

	var dateLocal = (new Date ((new Date((new Date(new Date())).toISOString() )).getTime() -
		((new Date()).getTimezoneOffset()*60000))).toISOString().slice(0, 19).replace('T', ' ');
	var dateForFile = dateLocal.replace(/:/g, '').replace(/ /g, '').replace(/-/g, '');

	var filename = path.join("img-" + dateForFile + ".jpg");

	var connection = getConnection();
	connection.connect();
	var sql_query = "update imageCapture set imagePath = 'https://s3-us-west-1.amazonaws.com/mzsgarage-images/" + filename + "' where imageCaptureId = " + imageCaptureId;
	connection.query(sql_query);

	var params = {Key: filename, ContentType: 'image/jpeg', Body: data3};
	var s3bucket = new aws.S3({params:{Bucket:'mzsgarage-images', Key: filename, ContentType: 'image/jpeg', Body: data3}});
	s3bucket.upload(params, function(err2, data){
	 	if (err) throw err;
		//res.send('image saved');
	});

	res.send('image saved');
})

server.post('/imageStatus', function(req, res, cb) {
	var connection = getConnection();
	connection.connect();

	var imageCaptureId = req.params.id;
	var dateLocal = (new Date ((new Date((new Date(new Date())).toISOString() )).getTime() -
		((new Date()).getTimezoneOffset()*60000))).toISOString().slice(0, 19).replace('T', ' ');

	res.setHeader('Access-Control-Allow-Origin','*');

	var sql_query = "update imageCapture set captureCompleted = '" + dateLocal + "' where imageCaptureId = " + imageCaptureId ;
	connection.query(sql_query, function(err, rows, fields) {
		if (err) throw err;
		res.send('imageStatus saved');
	});
})

server.post('/needimage', function(req, res, cb) {
	var connection = getConnection();
	connection.connect();

	var dateLocal = (new Date ((new Date((new Date(new Date())).toISOString() )).getTime() -
		((new Date()).getTimezoneOffset()*60000))).toISOString().slice(0, 19).replace('T', ' ');

	res.setHeader('Access-Control-Allow-Origin','*');

	var sql_query = "insert imageCapture (captureRequested) values ('" + dateLocal + "')" ;
	connection.query(sql_query, function(err, rows, fields) {
		if (err) throw err;
		res.send('image requested');
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