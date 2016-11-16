// Send SMS from command line, using Sinch
// Sample is compatible with browserify. (however, in that case, number/message input should be modified)

var sinchSms = require('../index.js')({
		key: 'YOUR_APPLICATION_KEY', 
		secret: 'YOUR_APPLICATION_SECRET'
	}); 

var number = process.argv[2] || '+1555123456';
var message = process.argv[3] || 'Hello World!';
console.log('Sending SMS "'+message+'" to number: '+number);

sinchSms.send(number, message).then(function(response) {
	checkSmsStatus(response.messageId);
}).fail(function(response) {
	console.log('Error:', response);
});

var checkSmsStatus = function(messageId) {
	sinchSms.getStatus(messageId).then(function(response) {
		console.log('Status:', response.status);
		if(response.status !== 'Successful') {
			setTimeout(function() {
				checkSmsStatus(messageId);
			}, 250);	
		}
	}).fail(function(response) {
		console.log('Error:', response);
	});
}