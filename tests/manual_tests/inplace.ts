import { ObjectChunkEncoder } from '../../src/core/codecs/ObjectChunkEncoder';
import { v4 } from 'uuid';
import { StreamCollector } from '../../src/core/StreamCollector';
import _ from 'lodash';
import express from 'express';

function randomString(ln: number) {
  var text = '';
  var possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < ln; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

const rnd = randomString(10_000_000);
let pld: any = new Array(1_000_000).fill(0).map((_index, i) => {
  const payload = { id: i, value: rnd };
  return payload;
});

const encoder = new ObjectChunkEncoder(10);
const generator = encoder.encode(pld);
const collector = new StreamCollector();
async function call() {
  const message_id = v4();
  return await new Promise<unknown>((resolve) => {
    collector.on(`full_message_${message_id}`, (data) => {
      resolve(data);
    });
    for (const chunk of generator) {
      console.log(`Sending part ${chunk.index}`);
      collector.addPart(message_id, chunk);
    }
  });
}

async function main() {
  const app = express();
  app.use('/', async (_req, res) => {
    const result = await call();
    console.log({ result });
    res.send({ ok: _.isEqual(result, pld) });
  });
  await new Promise<void>((resolve) => {
    console.log('starting express server!');
    app.listen(8080, '0.0.0.0', () => {
      resolve();
    });
  });
  console.log('App Started!');
}

main().catch(console.log);
