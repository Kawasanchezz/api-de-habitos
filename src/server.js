const app = require('./app');
const { port, host } = require('./config');
const { getDb, closeDb } = require('./db/connection');

getDb(); // cria o banco e as tabelas na inicialização

const server = app.listen(port, host, () => {
  console.log(`API de Hábitos rodando em http://${host}:${port}`);
  console.log(`Documentação em http://${host}:${port}/docs`);
  console.log('Pressione Ctrl+C para encerrar e fechar a porta.');
});

function shutdown() {
  console.log('\nEncerrando servidor...');
  server.close(() => {
    closeDb();
    console.log(`Porta ${port} fechada.`);
    process.exit(0);
  });
  server.closeAllConnections(); // não espera conexões keep-alive do navegador
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
