// import { StreamCollector } from './core/StreamCollector';
import { connect } from 'amqplib';

async function main() {
  const connection = await connect('amqp://localhost');
  const channel = await connection.createConfirmChannel();
}
