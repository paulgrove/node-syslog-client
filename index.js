
// Copyright 2015-2016 Stephen Vickers <stephen.vickers.sv@gmail.com>

var dgram = require("dgram");
var events = require("events");
var net = require("net");
var os = require("os");
var util = require("util");

function _expandConstantObject(object) {
	var keys = [];
	for (var key in object)
		keys.push(key);
	for (var i = 0; i < keys.length; i++)
		object[object[keys[i]]] = parseInt(keys[i]);
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

var Client = function(target, options) {
	this.target = target || "127.0.0.1";
	
	this.syslogHostname = os.hostname();
	this.port = 514;
	this.tcpTimeout = 10000;
	this.transport = Transport.Udp;
	
	if (options) {
		if (options.syslogHostname)
			this.syslogHostname = options.syslogHostname;
			
		if (options.port)
			this.port = options.port;
			
		if (options.tcpTimeout)
			this.tcpTimeout = options.tcpTimeout;
			
		if (options.transport) {
			if (options.transport == Transport.Udp || options.transport == Transport.Tcp)
				this.transport = options.transport;
		}
	}
	
	this.getTransportRequests = [];
	
	return this;
};

util.inherits(Client, events.EventEmitter);

Client.prototype.buildFormattedMessage = function(message, options) {
	var elems = new Date().toString().split(/\s+/);
	
	var month = elems[1];
	var day = elems[2];
	var time = elems[4];
	
	/**
	 ** BSD syslog requires leading 0's to be a space.
	 **/
	if (day[0] == "0")
		day = " " + day.substr(1, 1);
	
	var timestamp = month + " " + day + " " + time;
	
	var pri = (options.facility * 8) + options.severity;
	
	var newline = message[message.length - 1] == "\n" ? "" : "\n";
	
	var formattedMessage = "<"
			+ pri
			+ "> "
			+ timestamp
			+ " "
			+ this.syslogHostname
			+ " "
			+ message
			+ newline;
	
	return new Buffer(formattedMessage);
};

Client.prototype.close = function () {
	if (this.transport == Transport.Tcp) {
		if (this.transport_) {
			this.transport_.destroy();
			delete this.transport_;
		}
	} else if (this.transport == Transport.Udp) {
		if (this.transport_) {
			this.transport_.close();
			delete this.transport_;
		}
	}
	
	return this;
};

Client.prototype.log = function() {
	var message, options, cb;

	if (typeof arguments[0] !== "string")
		throw new Error("first argument must be string");

	if (typeof arguments[1] === "function")
		cb = arguments[1];
	else if (typeof arguments[1] === "object")
		options = arguments[1];
	if (typeof arguments[2] === "function")
		cb = arguments[2];

	if (!cb)
		cb = function () {};

	var facility = options ? options.facility : Facility.Local0;

	if (facility === undefined)
		facility = Facility.Local0;

	var severity = options ? options.severity : Severity.Informational;

	if (severity === undefined)
		severity = Severity.Informational;

	var fm = this.buildFormattedMessage(message, {
		facility: facility,
		severity: severity
	});
	
	var me = this;
	
	this.getTransport(function(error, transport) {
		if (error) {
			cb(error);
		} else {
			if (me.transport == Transport.Tcp) {
				transport.write(fm, function(error) {
					if (error) {
						cb(new Error("net.write() failed: " + error.message));
					} else {
						cb();
					}
				});
			} else if (me.transport == Transport.Udp) {
				transport.send(fm, 0, fm.length, me.port, me.target, function(error, bytes) {
					if (error) {
						cb(new Error("dgram.send() failed: " + error.message));
					} else {
						cb();
					}
				});
			} else {
				cb(new Error("unknown transport '%s' specified to Client", me.transport));
			}
		}
	});
	
	return this;
};

Client.prototype.getTransport = function(cb) {
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
	};

	if (this.transport == Transport.Tcp) {
		var options = {
			host: this.target,
			port: this.port,
			family: af
		};
		
		var transport = net.createConnection(options, function() {
			me.transport_ = transport;
			doCb(null, me.transport_);
		});

		transport.setTimeout(this.tcpTimeout, function() {
			me.emit("error", new Error("connection timed out"));
		});

		transport.on("end", function() {
			me.emit("error", new Error("connection closed"));
		});

		transport.on("close", me.onClose.bind(me));
		transport.on("error", me.onError.bind(me));
		
		transport.unref();
	} else if (this.transport == Transport.Udp) {
		this.transport_ = dgram.createSocket("udp" + af);
		
		this.transport_.on("close", this.onClose.bind(this));
		this.transport_.on("error", this.onError.bind(this));
		
		this.transport_.unref();
		
		doCb(null, this.transport_);
	} else {
		doCb(new Error("unknown transport '%s' specified to Client", this.transport));
	}
};

Client.prototype.onClose = function() {
	if (this.socket)
		delete this.socket;
	
	if (this.dgram)
		delete this.dgram;

	this.emit("close");
	
	return this;
};

Client.prototype.onError = function(error) {
	this.emit("error", error);
	
	return this;
};

exports.Client = Client;

exports.createClient = function(target, options) {
	return new Client(target, options);
};

exports.Transport = Transport;
exports.Facility  = Facility;
exports.Severity  = Severity;
