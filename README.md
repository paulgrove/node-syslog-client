
# syslog-client

This module is a pure JavaScript implementation of the [BSD Syslog Protocol][1].

This module is installed using [node package manager (npm)][2]:

    npm install syslog-client

It is loaded using the `require()` function:

    var syslog = require("syslog-client");

TCP or UDP clients can then be created to log messages to remote hosts.

    var client = snmp.createClient("127.0.0.1");

    client.log("example message");

[1]: https://www.ietf.org/rfc/rfc3164.txt
[2]: https://npmjs.org

# Constants

The following sections describe constants exported and used by this module.

## syslog.Transport

This object contains constants for all valid values for the `transport`
attribute passed to the `options` argument for the `createClient()` function.
The following constants are defined in this object:

 * `Tcp`
 * `Udp`

## syslog.Facility

This object contains constants for all valid values for the `facility`
attribute passed to the `options` argument for the `log()` method on the
`Client` class.  The following constants are defined in this object:

 * `Kernel` - 0
 * `User` - 1
 * `System` - 3
 * `Audit` - 13
 * `Alert` - 14
 * `Local0` - 16
 * `Local1` - 17
 * `Local2` - 18
 * `Local3` - 19
 * `Local4` - 20
 * `Local5` - 21
 * `Local6` - 22
 * `Local7` - 23

## syslog.Severity

This object contains constants for all valid values for the `severity`
attribute passed to the `options` argument for the `log()` method on the
`Client` class.  The following constants are defined in this object:

 * `Emergency` - 0
 * `Alert` - 1
 * `Critical` - 2
 * `Error` - 3
 * `Warning` - 4
 * `Notice` - 5
 * `Informational` - 6
 * `Debug` - 7

# Using This Module

All messages are sent using an instance of the `Client` class.  This
module exports the `createClient()` function which is used to create
instances of the `Client` class.

## syslog.createClient([target], [options])

The `createClient()` function instantiates and returns an instance of the
`Client` class:

    // Default options
    var options = {
		syslogHostname: os.hostname(),
		transport: syslog.Transport.Udp,
		port: 514
    };
    
    var client = syslog.createClient("127.0.0.1", options);

The optional `target` parameter defaults to `127.0.0.1`.  The optional
`options` parameter is an object, and can contain the following items:

 * `port` - TCP or UDP port to send messages to, defaults to `514`
 * `syslogHostname` - Value to place into the `HOSTNAME` part of the `HEADER`
   part of each message sent, defaults to `os.hostname()`
 * `tcpTimeout` - Number of milliseconds to wait for a connection attempt to
   the specified Syslog target, and the number of milliseconds to wait for
   TCP acknowledgements when sending messages using the TCP transport,
   defaults to `10000` (i.e. 10 seconds)
 * `transport` - Specify the transport to use, can be either
   `syslog.Transport.Udp` or `syslog.Transport.Tcp`, defaults to
   `syslog.Transport.Udp`

## client.on("close", callback)

The `close` event is emitted by the client when the clients underlying TCP or
UDP socket is closed.

No arguments are passed to the callback.

The following example prints a message to the console when a clients
underlying TCP or UDP socket is closed:

    client.on("close", function () {
        console.log("socket closed");
    });

## client.on("error", callback)

The `error` event is emitted by the client when the clients underlying TCP or
UDP socket emits an error.

The following arguments will be passed to the `callback` function:

 * `error` - An instance of the `Error` class, the exposed `message` attribute
   will contain a detailed error message.

The following example prints a message to the console when an error occurs
with a clients underlying TCP or UDP socket:

    client.on("error", function (error) {
        console.error(error);
    });

## client.close()

The `close()` method closes the clients underlying TCP or UDP socket.  This
will result in the `close` event being emitted by the clients underlying TCP
or UDP socket which is passed through to the client, resulting in the client
also emitting a `close` event.

The following example closes a clients underlying TCP or UDP socket:

    client.close();

## client.log(message, [options], callback)

The `log()` method sends a Syslog message to a remote host.

The `message` parameter is a string containing the message to be logged.

The optional `options` parameter is an object, and can contain the following
items:

 * `facility` - Either one of the constants defined in the `client.Facility`
   object or the facility number to use for the message, defaults to
   `syslog.Facility.Local0`
 * `severity` - Either one of the constants defined in the `client.Severity`
   object or the severity number to use for the message, defaults to
   `syslog.Severity.Informational`

The `callback` function is called once the message has been sent to the remote
host, or an error occurred.  The following arguments will be passed to the
`callback` function:

 * `error` - Instance of the `Error` class or a sub-class, or `null` if no
   error occurred

Each message sent to the remote host will have a newline character appended
to it, if one is not already appended.  Care should be taken to ensure newline
characters are not embedded within the message passed to this method (i.e. not
appearing at the end), as this may cause some syslog relays/servers to
incorrectly parse the message.

The following example sends a message to a remote host:

    var options = {
        facility: syslog.Facility.Daemon,
        severity: syslog.Severity.Critical
    };
    
    var message "something is wrong with this daemon!";

    client.log(message, options, function(error) {
        if (error) {
            console.error(error);
        } else {
            console.log("sent message successfully");
        }
    });

# Example Programs

Example programs are included under the modules `example` directory.

# Bugs & Known Issues

None, yet!

Bug reports should be sent to <stephen.vickers.sv@gmail.com>.

# Changes

## Version 1.0.0 - 31/07/2015

 * Initial release

## Version 1.0.1 - 31/07/2015

 * Correct typo in README.md

# Roadmap

Suggestions and requirements should be sent to <stephen.vickers.sv@gmail.com>.

# License

Copyright (c) 2015 Stephen Vickers

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

# Author

Stephen Vickers <stephen.vickers.sv@gmail.com>
