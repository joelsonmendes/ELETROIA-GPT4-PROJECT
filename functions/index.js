const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const serverless = require('serverless-http');

const app = express();

app.use(cors({ origin: true }));
app.use(bodyParser.json());

app.post('/ia', async (req, res) => {
  const mensagem = req.body.mensagem;

  if (!mensagem) {
    return res.status(400).json({ erro: 'Mensagem não fornecida' });
  }

  const resposta = `Você disse: ${mensagem}`;

  res.json({ resposta });
});

module.exports = serverless(app);
