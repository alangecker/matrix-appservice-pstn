// A sip.js transport for UDP. Proof of Concept quality.
// from https://github.com/zecke/sipjs-udp-transport
// LICENSE: not specified

import { EventEmitter } from 'events';
import { Emitter, _makeEmitter } from 'sip.js/lib/api/emitter';
import { TransportState } from 'sip.js/lib/api/transport-state';
import { Logger } from 'sip.js/lib/core'
import * as dgram from 'dgram';

// Options for receiving and sending datagrams.
export interface UDPTransportOptions {
  port: number;
  address?: string;
  remotePort: number;
  remoteAddress: string;
}

// // A minimal sip.js transport for UDP. Due sip.js limitations responses
// // can only be sent to a static and configured remote (proxy).
// export class UDPTransport extends EventEmitter implements Transport {
export class UDPTransport extends EventEmitter {
    private _state: TransportState = TransportState.Disconnected;
    private _stateEventEmitter = new EventEmitter();
    private _protocol = 'udp';
    private _logger: Logger;
    private _options: UDPTransportOptions;
    private _socket: dgram.Socket;
  
    onConnect: (() => void) | undefined;
    onDisconnect: ((error?: Error) => void) | undefined;
    onMessage: ((message: string) => void) | undefined;
  
    constructor(logger: Logger, options: UDPTransportOptions) {
      super();
      console.log(options);
      this._logger = logger;
      this._options = options;
      this._socket = dgram.createSocket('udp4');
    }
  
    get state() {
      this._logger.log(`get state (${this._state})`)
      return this._state;
    }
  
    get protocol() {
      return this._protocol;
    }
  
    isConnected(): boolean {
      return this.state === TransportState.Connected;
    }
  
    get stateChange(): Emitter<TransportState> {
      return _makeEmitter(this._stateEventEmitter);
    }
  
    async connect(): Promise<void> {
      try {
        this._socket.bind(this._options.port, this._options.address);
        this._socket.on('message', (msg, rinfo) => {
          const str = msg.toString()
          this._logger.log(`got ${str.slice(0,100).split('\n')[0].trim()} (${msg.length} bytes)`)
          // console.log(str)
          if (this.onMessage) {
            this.onMessage(str);
          }
          this.emit('message', str);
        });
      } catch (error) {        
        // The `state` MUST transition to "Disconnecting" or "Disconnected" before rejecting
        this._state = TransportState.Disconnected;
        if (this.onDisconnect) {
          this.onDisconnect(error);
        }
        throw error;
      }
      this._state = TransportState.Connected;
      if (this.onConnect) {
        this.onConnect();
      }
    }
  
    async send(message: string): Promise<void> {
      this._logger.log(`send ${message.slice(0,100).split(' ')[0]} (${message.length} bytes)`)
      // TODO(holger): Identify where this should be sent to.
      this._socket.send(
        message,
        this._options.remotePort,
        this._options.remoteAddress
      );
    }
  
    async dispose(): Promise<void> {
      this._logger.log('dispose')
      return this.disconnect();
    }
  
    async disconnect(): Promise<void> {
      this._logger.log('disconnect')
    }
}