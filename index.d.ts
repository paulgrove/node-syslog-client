// Type definitions for syslog-client
import { EventEmitter } from 'events';

export enum Transport {
	Tcp  = 1,
	Udp  = 2,
	Tls  = 3,
	Unix = 4
}

export enum Facility {
	Kernel   =  0,
	User     =  1,
	Mail     =  2,
	System   =  3,
	Daemon   =  3,
	Auth     =  4,
	Syslog   =  5,
	Lpr      =  6,
	News     =  7,
	Uucp     =  8,
	Cron     =  9,
	Authpriv = 10,
	Ftp      = 11,
	Audit    = 13,
	Alert    = 14,
	Local0   = 16,
	Local1   = 17,
	Local2   = 18,
	Local3   = 19,
	Local4   = 20,
	Local5   = 21,
	Local6   = 22,
	Local7   = 23
}

export enum Severity {
	Emergency     = 0,
	Alert         = 1,
	Critical      = 2,
	Error         = 3,
	Warning       = 4,
	Notice        = 5,
	Informational = 6,
	Debug         = 7
}

export interface ClientOptions {
	syslogHostname?: string,
	port?: number,
	tcpTimeout?: number,
	facility?: Facility,
	severity?: Severity,
	rfc3164?: boolean,
	appName?: string,
	dateFormatter?: (() => string),
	transport?: Transport,
	timestamp?: Date,
	msgid?: string,
	udpBindAddress?: string
}

export interface MessageOptions {
	syslogHostname?: string,
	facility?: Facility,
	severity?: Severity,
	rfc3164?: boolean,
	appName?: string,
	timestamp?: Date,
	msgid?: string
}

export class Client extends EventEmitter {
	constructor(target?: string, options?: ClientOptions);
	buildFormattedMessage(message: string, options: MessageOptions): Buffer;
	close(): Client;
	log(message: string, options?: MessageOptions, cb?: ((error: Error | null) => void)): Client;
	getTransport(cb: ((error: Error | null, transport: Transport) => void)): void;
	onClose(): Client;
	onError(error: Error): Client;
}

export function createClient(target: string, options: ClientOptions): Client;
