// require the restify library.
var restify = require('restify');
// sql server library
var mysql = require('mysql');
var json = '';
var path = require("path");
var fs = require("fs");
var aws = require('aws-sdk');
var sinchSms = require('sinch-sms')({
	key: 'ae52ae57-35da-4395-aa6e-1dca2c3ec44d',
	secret: 'BYqHIag64EGLeJ/yS7IIyQ=='
});

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

	var msg = "status updated";
	var sql_query = "insert GarageStatus (dateTimeStamp, status) values ('" + statusData.datetimestamp + "', " + statusData.status + ")";
	connection.query(sql_query, function(err, rows, fields) {
		if (err) throw err;
		if (statusData.status = 1){
			monitorGarageOpen(rows.insertId.toString(), function(data){
				msg = 'text message sent';
			});
		}
		res.send(msg);
	});
})

function monitorGarageOpen(openId){
	var openTooLong = false;
	var connection = getConnection();
	connection.connect();
	var sql_query = "select garageStatusId, dateTimeStamp, status from GarageStatus where garageStatusId = " + openId ;

	connection.query(sql_query, function(err, rows, fields) {
		if (err) throw err;
		if (rows != null){
			var starttime = rows[0].dateTimeStamp;
			var sql_query2 = "select * from GarageStatus order by garageStatusId desc limit 1";
			connection.query(sql_query2, function(err2, rows2, fields2) {
				if (rows2 != null){
					var gStatus = rows2[0].status;
					if (gStatus == 1)
					// check time diff and send sms if more than 5 minutes
						var timeNow = new Date();
					var timeDiff = (timeNow - new Date(starttime))/1000;
					if (timeDiff > 600){
						sinchSms.send('+19094524127', 'Yo boss, your garage is open for more than 5 minutes!').then(function(response){
							console.log(response);
						}).fail(function(error){
							console.log(error);
						});
					}
					else{
						monitorGarageOpen(openId);
					}
				}
				else{
					return;
				}
			})
		}

	});
	return openTooLong;
}



// post captured image
server.post('/image', function(req, res, cb){

	// get image data and manipulate it to remove 0D and 0A bytes
	var imageCaptureId = req.params.id;
    var data = req.body;
	var data2 = data.slice(1);
	var data3 = data2.slice(1);

	//set up aws s3 to copy file
	aws.config.loadFromPath('config.json');

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

	var new_id = "";
	var sql_query = "insert imageCapture (captureRequested) values ('" + dateLocal + "')";
	connection.query(sql_query, function(err, rows, fields) {
		if (err) throw err;
		res.send(rows.insertId.toString());
	});
})

server.get('/image', function(req, res){
	var connection = getConnection();
	connection.connect();

	var imageCaptureId = req.params.id;
	res.setHeader('Access-Control-Allow-Origin','*');

	var sql_query = "select captureCompleted, imagePath from imageCapture where " +
		"imageCaptureId = " + imageCaptureId ;
	connection.query(sql_query, function(err, rows, fields) {
		if (err) throw err;
		res.send(rows[0]);
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