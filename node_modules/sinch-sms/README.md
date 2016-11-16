# Sinch SMS node module

Node module to send SMS world-wide from within a Node or web application (using Browserify). 

Additional information available [on our website](https://www.sinch.com/products/sms-api/).

## Installing

Install is straight forward using npm; 

	npm install sinch-sms --save

_Note: Module is compatible with browserify_

## Include in your project

	var sinchSms = require('sinch-sms')({
			key: 'YOUR APPLICATION_KEY', 
			secret: 'YOUR_APPLICATION_SECRET'
		});

To send an SMS, simply call the `send()` method, as in this simple example: 

	var sinchSms = require('sinch-sms')({
			key: 'YOUR_APPLICATION_KEY', 
			secret: 'YOUR_APPLICATION_SECRET'
		}); 

	sinchSms.send('+1555123456', 'Hello World!').then(function(response) {
		//All good, response contains messageId
		console.log(response);
	}).fail(function(error) {
		// Some type of error, see error object
		console.log(error);
	});

For a more complete sample, including how to poll delivery status for a given messageId, please see the provided samples.

## Get your app key

New to Sinch? In order to get started, please visit [our website](http://www.sinch.com) and sign up for a free development account.

## Methods

- __send__(number, message) - Send SMS `message` to `number`
- __getStatus__(messageId) - Retrieve status for message `messageId`

_Above methods return promises, see sample for how to chain further action on success / fail._

## Samples

See the `samples/` folder, for some basic usage examples. Samples work fine both in Node.js and in the browser by using browserify. 

__Note:__ If you're using your sandbox application key, SMS can only be sent to numbers you have verified in the [Sinch dashboard](https://www.sinch.com/dashboard/). 

First edit the relevant sample to ensure it got your credentials or user information. Then you can run the sample in Node using: 

	$ node samples/SAMPLE_NAME.js

If you'd like to run it in the browser, first [browserify](http://browserify.org) the sample into a browser-compatible script using: 

	$ browserify samples/SAMPLE_NAME.js > sample_bundle.js

Include the bundle in a web project, by adding the following tag to your HTML file:

	<script src="sample_bundle.js"></script>

Be sure to check the developer console for console output.

## Feedback 

Questions and/or feedback on this module can be sent by contacting [dev@sinch.com](mailto:dev@sinch.com).

## License

The MIT License (MIT)

Copyright (c) 2015 Sinch AB

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
