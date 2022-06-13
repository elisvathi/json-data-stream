const { connect } = require('amqplib');
const express = require('express');
const { v4 } = require('uuid');

const handlers = {};
const streams = {};

class MessageCounter {
  constructor() {
    this.max = -1;
    this.is_done = false;
    this.elements = [];
  }

  set_max(num) {
    if (num > this.max) {
      for (let i = this.max + 1; i <= num; i++) {
        this.elements[i] = true;
      }
      this.max = num;
    }
  }

  remove(item, done) {
    this.is_done = this.is_done || done;
    this.set_max(item);
    if (this.elements[item]) {
      this.elements[item] = false;
      return true;
    }
    return false;
  }

  get hasGaps() {
    for (const v of this.elements) {
      if (v) {
        return true;
      }
    }
    return false;
  }

  get isFinished() {
    return this.is_done && !this.hasGaps;
  }
}

class StreamedMessage {
  constructor(correlation_id, resolver) {
    this.message_counter = new MessageCounter();
    this.correlation_id = correlation_id;
    this.resolver = resolver;
    this.parts = [];
  }

  fire() {
    this.resolver(this.parts.reduce((a, i) => [...a, ...i], []));
  }

  addPart(msg) {
    const part_index = msg.properties.headers['part_index'];
    const done = msg.properties.headers['parts_done'];
    if (this.message_counter.remove(part_index, done)) {
      console.log('received ', part_index);
      this.parts[Number(part_index)] = JSON.parse(msg.content.toString());
      if (this.message_counter.isFinished) {
        this.fire();
        console.log('fired');
        streams[this.correlation_id] = undefined;
        delete streams[this.correlation_id];
      }
    }
  }
}

function handleStream(msg) {
  const correlation_id = msg.properties.correlationId;
  if (!correlation_id || !handlers[correlation_id]) {
    return;
  }
  if (!this.streams) {
  }
}

async function startExpress(channel, rpc_queue) {
  const app = express();
  app.use('/heap', async (_req, res) => {
    const memory = process.memoryUsage();
    const callbacks = Object.keys(handlers).length;
    const streams_length = Object.keys(streams).length;
    res.send({ memory, callbacks, streams_length });
  });
  app.use('/send', async (_req, res) => {
    const request_body = { method: 'get_data' };
    const message_id = v4();
    const response = await new Promise((resolve) => {
      handlers[message_id] = resolve;
      channel.sendToQueue(
        'server_queue',
        Buffer.from(JSON.stringify(request_body)),
        {
          correlationId: message_id,
          replyTo: rpc_queue,
        },
      );
    });
    res.send(response.map((x, i) => ({ i, v: x.id })));
  });
  await new Promise((resolve) => {
    app.listen(Number(8080), '0.0.0.0', resolve);
  });
  console.log('Listening on 8080');
}

async function main() {
  const connection = await connect('amqp://localhost');
  const channel = await connection.createChannel();
  const rpc_queue = `rpc_queue_${v4()}`;
  await channel.assertQueue(rpc_queue, { autoDelete: true });
  channel.consume(rpc_queue, async (msg) => {
    const correlation_id = msg.properties.correlationId;
    if (correlation_id) {
      if (handlers[correlation_id]) {
        if (!streams[correlation_id]) {
          streams[correlation_id] = new StreamedMessage(
            correlation_id,
            handlers[correlation_id],
          );
        }
        streams[correlation_id].addPart(msg);
      }
    }
    channel.ack(msg);
  });
  await startExpress(channel, rpc_queue);
}

main().catch(console.log);
