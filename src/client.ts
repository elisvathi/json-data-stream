import { StreamCollector } from './core/StreamCollector';
import { connect } from 'amqplib';
import { v4 } from 'uuid';

const collector = new StreamCollector<{ id: string; value: string }>();

async function main(): Promise<void> {
  const connection = await connect('amqp://localhost');
  const channel = await connection.createConfirmChannel();
  const rpc_queue = `rpc_${v4()}`;
}

main().catch(console.log);
