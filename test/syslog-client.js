var chai = require("chai"),
	expect = chai.expect,
	assert = chai.assert,
	syslogClient = require("../index.js"),
	//Promise = require("bluebird"),
	syslogUdpPort = 5514,
	dgram = require("dgram"),
	queuedSyslogMessages = [],
	pendingSyslogPromises = [];

function awaitSyslogMsg() {
	return new Promise(function (resolve, reject) {
		var queued = queuedSyslogMessages.shift();
		if (queued)
			return resolve(queued);
		pendingSyslogPromises.push(resolve);
	});
}

function constructSyslogRegex(pri, hostname, msg) {
	return new RegExp(
		"^<"+pri+"> \\w+ \\d{1,2} \\d{2}:\\d{2}:\\d{2} "+hostname+" "+msg+"\\n?$"
	);
}

var udpServer = dgram.createSocket("udp4");

before(function (done) {
	udpServer.on("message", function (msg, rinfo) {
//		console.log("MSG", msg.toString());
		var pend = pendingSyslogPromises.shift();
		if (pend)
			return pend(msg.toString());
		queuedSyslogMessages.push(msg.toString());
	});
	udpServer.on("listening", function () {
		console.log("Started UDP syslog server");
		done();
	});
	udpServer.on("error", function (err) {
		console.log("MEMEMEMEME", err);
		throw new Error(err);
	});
	udpServer.bind(syslogUdpPort);
});

describe("Syslog Client", function () {
	it("should connect to UDP and send log(s)", function () {
		var hostname = "testhostname";
		var client = new syslogClient.createClient("127.0.0.1", {
			port: syslogUdpPort,
			syslogHostname: hostname,
			transport: syslogClient.Transport.Udp
		});

		client.log("This is a test");

		return awaitSyslogMsg()
		.then(function (msg) {
			assert.match(msg, constructSyslogRegex(134, hostname, "This is a test"));
			client.log("This is a second test");
			return awaitSyslogMsg();
		})
		.then(function (msg) {
			assert.match(msg, constructSyslogRegex(134, hostname, "This is a second test"));
		});
		
	});
});
