import { connect } from 'amqplib';
import { ObjectChunkEncoder } from './core/codecs/ObjectChunkEncoder';

function randomString(ln: number) {
  var text = '';
  var possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < ln; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

async function main() {
  const connection = await connect('amqp://localhost');
  const channel = await connection.createConfirmChannel();
  const queue = 'server_queue';
  await channel.assertQueue(queue);

  const rnd = randomString(1_000_000);
  channel.consume(queue, async (message) => {
    const reply_to = message?.properties.replyTo;
    const correlation_id = message?.properties.correlationId;
    if (reply_to && correlation_id) {
      let pld: any = new Array(1000).fill(0).map((_index, i) => {
        const payload = { id: i, value: rnd };
        return payload;
      });
      pld = { items: pld };
      const encoder = new ObjectChunkEncoder(10);
      const gener = encoder.encode(pld);
      let i = 0;
      for (const ch of gener) {
        console.log(`Sending part ${++i}`);
        await new Promise<void>((resolve, reject) => {
          channel.sendToQueue(
            reply_to,
            Buffer.from(JSON.stringify(ch)),
            {
              correlationId: correlation_id,
              headers: {
                part_index: ch.index,
                parts_done: ch.done,
              },
            },
            (e) => {
              if (e) {
                reject(e);
              }
              resolve();
            },
          );
        });
      }
    }
    if (message) {
      channel.ack(message);
    }
  });
}

main().catch(console.log);
