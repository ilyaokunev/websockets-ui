import * as http from 'http';

const DB_PORT = Number(process.env.DB_PORT) || 5152;

const dbServer = http.createServer((req, res) => {
});


dbServer.listen(DB_PORT, () => {
  console.log(`\ndb works on ${DB_PORT} port\n`);
})