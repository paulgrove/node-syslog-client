var chai = require("chai"),
	expect = chai.expect,
	assert = chai.assert,
	net = require("net"),
	syslogClient = require("../index.js"),
	//Promise = require("bluebird"),
	syslogUdpPort = 5514,
	syslogTcpPort = 5514,
	dgram = require("dgram"),
	net = require("net"),
	rl = require("readline"),
	queuedSyslogUdpMessages = [],
	pendingSyslogUdpPromises = [],
	queuedSyslogTcpMessages = [],
	pendingSyslogTcpPromises = [];

function awaitSyslogUdpMsg() {
	return new Promise(function (resolve, reject) {
		var queued = queuedSyslogUdpMessages.shift();
		if (queued)
			return resolve(queued);
		pendingSyslogUdpPromises.push(resolve);
	});
}
function awaitSyslogTcpMsg() {
	return new Promise(function (resolve, reject) {
		var queued = queuedSyslogTcpMessages.shift();
		if (queued)
			return resolve(queued);
		pendingSyslogTcpPromises.push(resolve);
	});
}

function constructSyslogRegex(pri, hostname, msg) {
	return new RegExp(
		"^<"+pri+"> \\w+ \\d{1,2} \\d{2}:\\d{2}:\\d{2} "+hostname+" "+msg+"\\n?$"
	);
}

var udpServer = dgram.createSocket("udp4"),
	tcpServer;

before(function (_done) {
	var count = 2;
	var done = function () {
		count--;
		if (count === 0)
			_done();
	};
	udpServer.on("message", function (msg, rinfo) {
		var pend = pendingSyslogUdpPromises.shift();
		if (pend)
			return pend(msg.toString());
		queuedSyslogUdpMessages.push(msg.toString());
	});
	udpServer.on("listening", function () {
		console.log("Started UDP syslog server");
		done();
	});
	udpServer.on("error", function (err) {
		throw new Error(err);
	});
	udpServer.bind(syslogUdpPort);

	tcpServer = net.createServer(function (socket) {
		var lines = rl.createInterface(socket, socket);
		lines.on("line", function (line) {
			var pend = pendingSyslogTcpPromises.shift();
			if (pend)
				return pend(line);
			queuedSyslogTcpMessages.push(line);
		});
	});
	tcpServer.on("error", function (err) {
		throw new Error(err);
	});
	tcpServer.listen(syslogTcpPort, function () {
		console.log("Started TCP syslog server");
		done();
	});

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

		return awaitSyslogUdpMsg()
		.then(function (msg) {
			assert.match(msg, constructSyslogRegex(134, hostname, "This is a test"));
			client.log("This is a second test");
			return awaitSyslogUdpMsg();
		})
		.then(function (msg) {
			assert.match(msg, constructSyslogRegex(134, hostname, "This is a second test"));
		});
	});
	it("should connect to TCP and send log(s)", function () {
		var hostname = "testhostname";
		var client = new syslogClient.createClient("127.0.0.1", {
			port: syslogTcpPort,
			syslogHostname: hostname,
			transport: syslogClient.Transport.Tcp
		});

		client.log("This is a test");

		return awaitSyslogTcpMsg()
		.then(function (msg) {
			assert.match(msg, constructSyslogRegex(134, hostname, "This is a test"));
			client.log("This is a second test");
			return awaitSyslogTcpMsg();
		})
		.then(function (msg) {
			assert.match(msg, constructSyslogRegex(134, hostname, "This is a second test"));
		});
	});
	it("should reuse the UDP transport", function () {
		var hostname = "testhostname";
		var client = new syslogClient.createClient("127.0.0.1", {
			port: syslogUdpPort,
			syslogHostname: hostname,
			transport: syslogClient.Transport.Udp
		});

		client.log("Transport reuse test");
		var transport_;

		return awaitSyslogUdpMsg()
		.then(function (msg) {
			client.log("Transport reuse test 2");
			transport_ = client.transport_;
			assert.typeOf(transport_, "object");
			return awaitSyslogUdpMsg();
		})
		.then(function (msg) {
			assert.equal(transport_, client.transport_);
		});
	});
	it("should reuse the TCP transport", function () {
		var hostname = "testhostname";
		var client = new syslogClient.createClient("127.0.0.1", {
			port: syslogTcpPort,
			syslogHostname: hostname,
			transport: syslogClient.Transport.Tcp
		});

		client.log("Transport reuse test");
		var transport_;

		return awaitSyslogTcpMsg()
		.then(function (msg) {
			client.log("Transport reuse test 2");
			assert.typeOf(transport_, "object");
			return awaitSyslogTcpMsg();
		})
		.then(function (msg) {
			assert.isTrue(transport_ === client.transport_);
			assert.equal(transport_, client.transport_);
		});
	});
});
