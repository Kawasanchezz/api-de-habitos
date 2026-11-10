const express = require('express');
const swaggerUi = require('swagger-ui-express');
const routes = require('./routes');
const openapi = require('./docs/openapi');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(express.json());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));
app.get('/docs.json', (_req, res) => res.json(openapi));
app.use(routes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
