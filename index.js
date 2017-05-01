
// Copyright 2015-2016 Stephen Vickers <stephen.vickers.sv@gmail.com>

var dgram = require("dgram");
var events = require("events");
var net = require("net");
var os = require("os");
var util = require("util");

function _expandConstantObject(object) {
	var keys = [];
	for (var key in object)
		if (Object.hasOwnProperty.call(object, key))
			keys.push(key);
	for (var i = 0; i < keys.length; i++)
		object[object[keys[i]]] = parseInt(keys[i], 10);
}

var Transport = {
	Tcp: 1,
	Udp: 2
};

_expandConstantObject(Transport);

var Facility = {
	Kernel: 0,
	User:   1,
	System: 3,
	Audit:  13,
	Alert:  14,
	Local0: 16,
	Local1: 17,
	Local2: 18,
	Local3: 19,
	Local4: 20,
	Local5: 21,
	Local6: 22,
	Local7: 23
};

_expandConstantObject(Facility);

var Severity = {
	Emergency:     0,
	Alert:         1,
	Critical:      2,
	Error:         3,
	Warning:       4,
	Notice:        5,
	Informational: 6,
	Debug:         7
};

_expandConstantObject(Severity);

function Client(target, options) {
	this.target = target || "127.0.0.1";

	if (!options)
		options = {}

	this.syslogHostname = options.syslogHostname || os.hostname();
	this.port = options.port || 514;
	this.tcpTimeout = options.tcpTimeout || 10000;
	this.getTransportRequests = [];

	this.transport = Transport.Udp;
	if (options.transport &&
		options.transport === Transport.Udp ||
		options.transport === Transport.Tcp)
			this.transport = options.transport;

	return this;
}

util.inherits(Client, events.EventEmitter);

Client.prototype.buildFormattedMessage = function buildFormattedMessage(message, options) {
    var timestamp = new Date().toISOString();
    timestamp = timestamp.substr(0, timestamp.length - 1) + '000+00:00';
	var pri = (options.facility * 8) + options.severity;
	var newline = message[message.length - 1] === "\n" ? "" : "\n";
	var formattedMessage = "<"
			+ pri
			+ ">1 "
			+ timestamp
			+ " "
			+ this.syslogHostname
			+ " "
			+ message
			+ newline;
	return new Buffer(formattedMessage);
};

Client.prototype.close = function close() {
	if (this.transport_) {
		if (this.transport === Transport.Tcp)
			this.transport_.destroy();
		if (this.transport === Transport.Udp)
			this.transport_.close();
		delete this.transport_;
	} else {
		this.onClose();
	}

	return this;
};

Client.prototype.log = function log() {
	var message, options, cb;

	if (typeof arguments[0] === "string")
		message = arguments[0];
	else
		throw new Error("first argument must be string");

	if (typeof arguments[1] === "function")
		cb = arguments[1];
	else if (typeof arguments[1] === "object")
		options = arguments[1];
	if (typeof arguments[2] === "function")
		cb = arguments[2];

	if (!cb)
		cb = function () {};

	var facility = options && typeof options.facility !== "undefined" ?
		options.facility : Facility.Local0;

	var severity = options && typeof options.severity !== "undefined" ?
		options.severity : Severity.Informational;

	var fm = this.buildFormattedMessage(message, {
		facility: facility,
		severity: severity
	});

	var me = this;

	this.getTransport(function(error, transport) {
		if (error)
			return cb(error);

		try {
			if (me.transport === Transport.Tcp) {
				transport.write(fm, function(error) {
					if (error)
						return cb(new Error("net.write() failed: " + error.message));
				});
			} else if (me.transport === Transport.Udp) {
				transport.send(fm, 0, fm.length, me.port, me.target, function(error, bytes) {
					if (error)
						return cb(new Error("dgram.send() failed: " + error.message));
				});
			} else {
				return cb(new Error("unknown transport '%s' specified to Client", me.transport));
			}
			return cb();
		} catch (err) {
			me.onError(err);
			return cb(err);
		}
	});

	return this;
};

Client.prototype.getTransport = function getTransport(cb) {
	if (this.transport_ !== undefined)
		return cb(null, this.transport_);

	this.getTransportRequests.push(cb);

	if (this.connecting)
		return this;
	else
		this.connecting = true;

	var af = net.isIPv4(this.target) ? 4 : 6;

	var me = this;

	function doCb(error, transport) {
		while (me.getTransportRequests.length > 0) {
			var nextCb = me.getTransportRequests.shift();
			nextCb(error, transport);
		}

		me.connecting = false;
	}

	if (this.transport === Transport.Tcp) {
		var options = {
			host: this.target,
			port: this.port,
			family: af
		};

		var transport;
		try {
			transport = net.createConnection(options, function() {
				me.transport_ = transport;
				doCb(null, me.transport_);
			});
		} catch (err) {
			doCb(err);
			me.onError(err);
		}

		if (!transport)
			return;

		transport.setTimeout(this.tcpTimeout, function() {
			var err = new Error("connection timed out");
			me.emit("error", err);
			doCb(err);
		});

		transport.on("end", function() {
			var err = new Error("connection closed");
			me.emit("error", err);
			doCb(err);
		});

		transport.on("close", me.onClose.bind(me));
		transport.on("error", function (err) {
			doCb(err);
			me.onError(err);
		});

		transport.unref();
	} else if (this.transport === Transport.Udp) {
		this.transport_ = dgram.createSocket("udp" + af);

		this.transport_.on("close", this.onClose.bind(this));
		this.transport_.on("error", function (err) {
			me.onError(err);
			doCb(err);
		});

		this.transport_.unref();

		doCb(null, this.transport_);
	} else {
		doCb(new Error("unknown transport '%s' specified to Client", this.transport));
	}
};

Client.prototype.onClose = function onClose() {
	if (this.transport_)
		delete this.transport_;

	this.emit("close");

	return this;
};

Client.prototype.onError = function onError(error) {
	if (this.transport_)
		delete this.transport_;

	this.emit("error", error);

	return this;
};

exports.Client = Client;

exports.createClient = function createClient(target, options) {
	return new Client(target, options);
};

exports.Transport = Transport;
exports.Facility  = Facility;
exports.Severity  = Severity;
