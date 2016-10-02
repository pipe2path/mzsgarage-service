// require the restify library.
var restify = require('restify');
// sql server library
var mysql = require('mysql');
var json = '';
var path = require("path");
var fs = require("fs");
var aws = require('aws-sdk');


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

	var sql_query = "select imageCaptureId, captureRequested, captureCompleted from imageCapture where " +
			"captureRequested != '' and captureCompleted is null";
	connection.query(sql_query, function(err, rows, fields) {
		if (err) throw err;
		//json = JSON.stringify(rows[0]);
		if (rows.length == 0)
			res.send("null")
		else
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
	var connection = getConnection();
	connection.connect();

	var data = req.body;
	//var base64Image = req.body.toString('base64');
	//var decodedImage =  new Buffer(base64Image, 'base64');

	//var imageData = decodedImage.replace(/^data:image\/\w+;base64,/, '');
	var dateLocal = (new Date ((new Date((new Date(new Date())).toISOString() )).getTime() -
		((new Date()).getTimezoneOffset()*60000))).toISOString().slice(0, 19).replace('T', ' ');
	dateLocal = dateLocal.replace(/:/g, '').replace(/ /g, '').replace(/-/g, '');

	//set up aws s3 to copy file
	aws.config.accessKeyId = 'AKIAJRSYP4N7D6MRWN6Q'
	aws.config.secretAccessKey='4SIiWEEK79UK2YB7h8BnN814Gu0M/5nV8FvxvJls';
    aws.config.region = 'us-west-2';

	var filename = path.join("img-" + dateLocal + ".jpg");
	var params = {Key: filename, ContentType: 'image/jpeg', Body: data};
	var s3bucket = new aws.S3({params:{Bucket:'mzsgarage-images', Key: filename, ContentType: 'image/jpeg', Body: data}});
	s3bucket.upload(params, function(err, data){

	});

	//fs.writeFile(filename, imageData, 'base64', function(err){
	//	console.log(err);
	//});

	res.setHeader('Access-Control-Allow-Origin','*');
	res.send("img saved");

	//var sql_query = "insert GarageStatus (dateTimeStamp, status) values ('" + statusData.datetimestamp + "', " + statusData.status + ")";
	//connection.query(sql_query, function(err, rows, fields) {
	//	if (err) throw err;
	//	res.send("status updated");
	//});

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