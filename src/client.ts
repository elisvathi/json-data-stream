import { connect, Channel } from 'amqplib';
import express from 'express';
import { v4 } from 'uuid';
import { StreamCollector } from './core/StreamCollector';
import _ from 'lodash';
import axios from 'axios';
import fs from 'fs';

const streamCollector = new StreamCollector();

async function startExpress(channel: Channel, rpc_queue: string) {
  const app = express();
  app.use('/send', async (_req, res) => {
    const request_body = { method: 'get_data' };
    const message_id = v4();
    const response = await new Promise<any>((resolve) => {
      streamCollector.once(`full_message_${message_id}`, (data) => {
        resolve(data);
      });
      streamCollector.on(`part_${message_id}`, (_, index) => {
        console.log(`Received part!`, (index || 0) + 1);
      });
      channel.sendToQueue(
        'server_queue',
        Buffer.from(JSON.stringify(request_body)),
        {
          correlationId: message_id,
          replyTo: rpc_queue,
        },
      );
    });

    const { data } = await axios.get(
      'https://api.clickflare.io/api/swagger.json',
    );
    fs.writeFileSync('data.json', JSON.stringify(data));
    fs.writeFileSync('response.json', JSON.stringify(response));
    const r = _.isEqual(response, data);
    res.send({ r });
  });
  await new Promise<void>((resolve) => {
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
    if (msg) {
      const correlation_id = msg.properties.correlationId;
      streamCollector.addPart(
        correlation_id,
        JSON.parse(msg.content.toString()),
      );
      channel.ack(msg);
    }
  });
  await startExpress(channel, rpc_queue);
}

main().catch(console.log);
