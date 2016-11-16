var sinchRequest = require('sinch-request')
var assert = require('assert-plus');
var https = require('https');
var Q = require('q');

var smsManager = function(credentials, environment) {
	assert.object(credentials, 'credentials');

	this._creds = credentials;
	this._environment = environment || {'messaging': 'messagingapi.sinch.com'};
}

smsManager.prototype.send = function(number, message) {
	assert.string(number, 'number');
	assert.string(message, 'message');

	
	number = number.replace(/[-\s\(\)]/gi, '') // Remove possible irrelevant characters

	var deferred = Q.defer();

	var options = {
		protocol: 'https:',
		method: 'POST',
		host: this._environment.messaging,
		port: 443,
		path: '/v1/sms/'+number,
		data: JSON.stringify({message: message}),
		withCredentials: false, // For browserify
	};

	sinchRequest.applicationSigned(options, this._creds);

	var req = https.request(options, function(response) {
		var data = '';
		response.on('data', function (chunk) {
			data += chunk;
		});
		response.on('end', function () {
			try {
				data = JSON.parse(data);
			} 
			catch(e) {}
			finally {
				if(response.statusCode != 200) {
					deferred.reject(data);
				}
				else {
					deferred.resolve(data);
				}
			}
		});
	});
	req.end(options.data);

	return deferred.promise;
}

smsManager.prototype.getStatus = function(messageId) {
	assert.number(messageId);

	var deferred = Q.defer();

	var options = {
		protocol: 'https:',
		method: 'GET',
		host: this._environment.messaging,
		port: 443,
		path: '/v1/message/status/' + messageId,
		withCredentials: false, // For browserify
	};

	sinchRequest.applicationSigned(options, this._creds);

	var req = https.request(options, function(response) {
		var data = '';
		response.on('data', function (chunk) {
			data += chunk;
		});
		response.on('end', function () {
			try {
				data = JSON.parse(data);
			} 
			catch(e) {}
			finally {
				if(response.statusCode != 200) {
					deferred.reject(data);
				}
				else {
					deferred.resolve(data);
				}
			}
		});
	});
	req.end();

	return deferred.promise;
}

module.exports = function(credentials, environment) {
	assert.object(credentials, 'credentials');
	assert.string(credentials.key, 'credentials.key');
	assert.string(credentials.secret, 'credentials.secret');

	return new smsManager(credentials, environment)
};

