const { connect } = require('amqplib');

function chunkArray(payload, chunkSize) {
  if (chunkSize === 0) {
    chunkSize = payload.length;
  }
  const chunks = [];
  let chunk = [];
  for (let i = 0; i < payload.length; i++) {
    chunk.push(payload[i]);
    if (i % chunkSize === 0) {
      chunks.push(chunk);
      chunk = [];
    }
  }
  if (chunk.length > 0) {
    chunks.push(chunk);
  }
  return chunks;
}

function randomString(ln) {
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
    const reply_to = message.properties.replyTo;
    const correlation_id = message.properties.correlationId;
    if (reply_to && correlation_id) {
      const pld = new Array(1000).fill(0).map((_index, i) => {
        const payload = { id: i, value: rnd };
        return payload;
      });
      const chunks = chunkArray(pld, 10);
      const chunks_info = chunks.map((x, index) => {
        return { index, value: x, is_done: index === chunks.length - 1 };
      });
      const shuffled = chunks_info.sort(() => Math.random() - 0.5);
      let index = 0;
      for (const ch of shuffled) {
        await new Promise((resolve, reject) => {
          channel.sendToQueue(
            reply_to,
            Buffer.from(JSON.stringify(ch.value)),
            {
              correlationId: correlation_id,
              headers: {
                part_index: ch.index,
                parts_done: ch.is_done,
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
        console.log('Sent part', index);
        index++;
      }
      // chunks.forEach((ch, index) => {});
      // channel.sendToQueue(reply_to, Buffer.from(JSON.stringify({ ok: true })), {
      //   correlationId: correlation_id,
      // });
    }
    channel.ack(message);
  });
}

main().catch(console.log);
