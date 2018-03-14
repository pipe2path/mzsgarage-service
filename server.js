// require the restify library.
var restify = require('restify');
// sql server library
var mysql = require('mysql');
var json = '';
var path = require("path");
var fs = require("fs");
var aws = require('aws-sdk');
var sinchSms = require('sinch-sms');

// create an HTTP server.
var server = restify.createServer();

server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());

var db_config = {
    host: '50.62.209.52',
    user: 'mzs-admin',
    password : 'Bombay79',
    database : 'mzsgarage'
};

var connection;

// connect to database or handle disconnect
handleDisconnect();

// get garage status
server.get('/status/', function (req, res, cb) {

	var garageid = req.query.id;

	res.setHeader('Access-Control-Allow-Origin','*');

	var sql_query = "select * from GarageStatus gs " +
		"where garageId = " + garageid + " and dateTimeStamp = (select max(dateTimeStamp) " +
		"from GarageStatus gs2)" ;
	connection.query(sql_query, function(err, rows, fields) {
		if (err) throw err;
		res.send(rows);
	});
});

// update garage status
server.post('/update', function(req, res, cb){

	var statusData = {};
	var dateLocal = (new Date ((new Date((new Date(new Date())).toISOString() )).getTime() -
		((new Date()).getTimezoneOffset()*60000))).toISOString().slice(0, 19).replace('T', ' ');
	statusData.garageid = req.query.id;
	statusData.datetimestamp = dateLocal;
	statusData.status = req.query.statusid;

	var status = req.query.statusid;

    //statusData.status = 1;

	res.setHeader('Access-Control-Allow-Origin','*');

	var msg = "status updated";
	var sinchKey;
	var sinchSecret;
	var openTime = 300;
    //var sql_query = "insert GarageStatus (garageId, dateTimeStamp, status) values (" + statusData.garageid + ", '" + statusData.datetimestamp + "', " + statusData.status + ")";

    var sql_query = "insert GarageStatus (garageId, dateTimeStamp, status) values (" + statusData.garageid + ", '" + statusData.datetimestamp + "', " + status + ")";
	connection.query(sql_query, function(err, rows, fields) {
		if (err) {
			console.log("Parameter for id = " + statusData.garageid + " and status = " + status)
			throw err;
		}
		if (statusData.status = 1){
			sql_query='select * from configSettings limit 1';
			connection.query(sql_query, function(err, rows2, fields) {
				if (rows2!=null){
					sinchKey = rows2[0].sinchKey;
					sinchSecret = rows2[0].sinchPwd;
					sinchSms = require('sinch-sms')({
						key: sinchKey,
						secret:sinchSecret
					});
					openTime = rows2[0].garageOpenTimeAlert;

					monitorGarageOpen(rows.insertId.toString(), connection, statusData.garageid, sinchSms, openTime, function(data){
						msg = 'text message sent';
					});
				}
			});
		}
		res.send(msg);
	});
})

function monitorGarageOpen(openId, connection, garageId, sinchSms, openTime){
	var openTooLong = false;

	var sql_query = "select garageStatusId, dateTimeStamp, status from GarageStatus where garageId = " + garageId + " and garageStatusId = " + openId ;
	connection.query(sql_query, function(err, rows, fields) {
		if (err) throw err;
		if (rows != null){
			var starttime = rows[0].dateTimeStamp;
			var sql_query2 = "select * from GarageStatus where garageId = " + garageId + " order by garageStatusId desc limit 1";
            connection.query(sql_query2, function(err2, rows2, fields2) {
				if (err2) throw err2;
				if (rows2 != null){
					var gStatus = rows2[0].status;
                    var timeNow = new Date();
                    var timeDiff = (timeNow - new Date(starttime))/1000;
                    if (parseInt(timeDiff)>openTime) {
					if (gStatus == 1){
						// get message configurations
						var sql_query_msg = "select * from garage where garageId = " + garageId;
							connection.query(sql_query_msg, function(err, rows3, fields3){
								for(var i3 = 0; i3 < rows3.count(); i3++){
                                    sinchSms.send(rows3[i3].phoneNumber, rows3[i3].smsMessage + openTime/60 + ' minutes!').then(function (response) {
                                        console.log(response);
                                    }).fail(function (error) {
                                        console.log(error);
                                    });
								}
							})
							// sinchSms.send('+19094524127', 'HEY ZOMON, THE MASTER! Garage open for ' + openTime/60 + ' minutes!').then(function (response) {
							// 	console.log(response);
							// }).fail(function (error) {
							// 	console.log(error);
							// });
                            //
							// sinchSms.send('+19093466494', 'HEY JUDE!!! Garage open for ' + openTime/60 + ' minutes!').then(function (response) {
							// 	console.log(response);
							// }).fail(function (error) {
							// 	console.log(error);
							// });
					}
					else{
							monitorGarageOpen(openId, connection, sinchSms, openTime);
						}
                    }
					else{
						return;
					}
				}
			})
		}
	});
	return openTooLong;
}

// post captured image
server.post('/image', function(req, res, cb){

	// get image data and manipulate it to remove 0D and 0A bytes
	var imageCaptureId = req.query.id;
    var garageid = req.query.garageid;
	var data = req.body;
	var data2 = data.slice(1);
	var data3 = data2.slice(1);

	//set up aws s3 to copy file
	aws.config.loadFromPath('config.json');

	res.setHeader('Access-Control-Allow-Origin','*');

    var dateLocal = (new Date ((new Date((new Date(new Date())).toISOString() )).getTime() -
		((new Date()).getTimezoneOffset()*60000))).toISOString().slice(0, 19).replace('T', ' ');
	var dateForFile = dateLocal.replace(/:/g, '').replace(/ /g, '').replace(/-/g, '');

	var filename = path.join("img-" + garageid + "-" + dateForFile + ".jpg");

    var params = {Key: filename, ContentType: 'image/jpeg', Body: data3};
    var s3bucket = new aws.S3({params:{Bucket:'mzsgarage-images', Key: filename, ContentType: 'image/jpeg', Body: data3}});
    s3bucket.upload(params, function(err2, data){
        if (err2) {
            console.log("S3 bucket upload error...");
            throw err2
        }
        //res.send('image saved');
    });

    var sql_query = "update ImageCapture set imagePath = 'https://s3-us-west-1.amazonaws.com/mzsgarage-images/" + filename + "', captureCompleted = '" + dateLocal +
    "' where imageCaptureId = " + imageCaptureId;
	connection.query(sql_query);

	res.send('image saved');
})

server.get('/imageStatus', function(req, res){

    res.setHeader('Access-Control-Allow-Origin','*');

    var sql_query = "select imageCaptureId, captureRequested, captureCompleted from ImageCapture where " +
        "captureRequested is not null and captureCompleted is null";
    connection.query(sql_query, function(err, rows, fields) {
        if (err) {
        	console.log("Error getting image capture status" + err);
        	throw err;
        }
        res.send(rows[0]);
    });
})

server.post('/imageStatus', function(req, res, cb) {

	var imageCaptureId = req.query.id;
	var dateLocal = (new Date ((new Date((new Date(new Date())).toISOString() )).getTime() -
		((new Date()).getTimezoneOffset()*60000))).toISOString().slice(0, 19).replace('T', ' ');

	res.setHeader('Access-Control-Allow-Origin','*');

	var sql_query = "update ImageCapture set captureCompleted = '" + dateLocal + "' where imageCaptureId = " + imageCaptureId ;
    //var sql_query = "update ImageCapture set captureCompleted = '2018-03-08 22:13:11' where imageCaptureId = " + imageCaptureId ;
	connection.query(sql_query, function(err, rows, fields) {
		if (err) {
			console.log("Error updating imageCapture table with captureCompleted date. imageCaptureId = " + imageCaptureId);
			throw err;
		}
		res.send('imageStatus saved');
	});
})

server.post('/needimage', function(req, res, cb) {

    var garageid = req.query.garageid;
	var dateLocal = (new Date ((new Date((new Date(new Date())).toISOString() )).getTime() -
		((new Date()).getTimezoneOffset()*60000))).toISOString().slice(0, 19).replace('T', ' ');

	res.setHeader('Access-Control-Allow-Origin','*');

	var sql_query = "insert ImageCapture (garageId, captureRequested) values (" + garageid + ", '" + dateLocal + "')";
	connection.query(sql_query, function(err, rows, fields) {
		if (err) throw err;
		res.send(rows.insertId.toString());
	});
})

server.get('/image', function(req, res){

	var imageCaptureId = req.query.id;
	res.setHeader('Access-Control-Allow-Origin','*');

	var sql_query = "select captureCompleted, imagePath from ImageCapture where " +
		"imageCaptureId = " + imageCaptureId ;
	connection.query(sql_query, function(err, rows, fields) {
		if (err) throw err;
		res.send(rows[0]);
	});
})

server.post('/machinestatus', function(req, res){
	var machineStatus = req.params.status;
	var floor = req.params.floor;

    var dateLocal = (new Date ((new Date((new Date(new Date())).toISOString() )).getTime() -
        ((new Date()).getTimezoneOffset()*60000))).toISOString().slice(0, 19).replace('T', ' ');

    res.setHeader('Access-Control-Allow-Origin','*');

    var sql_query = "insert machineStatus (dateTimeStamp, floor, status) values ('" + dateLocal + "'," + floor + ", " + machineStatus + ")" ;
    connection.query(sql_query, function(err, rows, fields) {
        if (err) throw err;
        res.send('machine status saved');
    });
})

server.get('/machinestatus', function(req, res){

    res.setHeader('Access-Control-Allow-Origin','*');

    var sql_query = "SELECT n.* from mzsgarage.machineStatus n inner join (" +
   					" SELECT floor, status, MAX(dateTimeStamp) AS dateTimeStamp" +
					" FROM mzsgarage.machineStatus GROUP BY floor) AS max USING (floor, dateTimeStamp) ORDER BY n.floor ";
		connection.query(sql_query, function(err, rows, fields) {
        if (err) throw err;
        res.send(rows);
    });

})

function handleDisconnect() {
    connection = mysql.createConnection(db_config); // Recreate the connection, since
                                                    // the old one cannot be reused.

    connection.connect(function(err) {              // The server is either down
        if(err) {                                     // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000); 		// We introduce a delay before attempting to reconnect,
        }                                     			// to avoid a hot loop, and to allow our node script to
    });                                     			// process asynchronous requests in the meantime.
                                            			// If you're also serving http, display a 503 error.
    connection.on('error', function(err) {
        console.log('db error', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            handleDisconnect();                         // lost due to either server restart, or a
        } else {                                      // connnection idle timeout (the wait_timeout
            throw err;                                  // server variable configures this)
        }
    });
}

server.listen(process.env.PORT || 3028, function () { // bind server to port 4028.
	console.log('%s listening at %s', server.name, server.url);
});