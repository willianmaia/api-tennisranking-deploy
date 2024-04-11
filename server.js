const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const atob = require('atob'); // Importe o pacote 'atob'

const app = express();
const PORT = process.env.PORT || 3001;
const dataPath = path.join(__dirname, 'db.json');

// Middleware para tratar o corpo das requisições como JSON
app.use(bodyParser.json());

// Habilita o CORS para todas as origens
app.use(cors());

// Middleware de autenticação básica com chave e segredo em base64
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header não encontrado' });
  }

  const authString = authHeader.split(' ')[1];
  if (!authString) {
    return res.status(401).json({ message: 'Formato de Authorization inválido' });
  }

  const decodedAuth = atob(authString);
  const [key, secret] = decodedAuth.split(':');

  // Verifica se a chave e o segredo são válidos
  if (key === 'chave' && secret === 'senha') {
    next(); // Credenciais válidas, continua para a próxima rota
  } else {
    res.status(401).json({ message: 'Credenciais inválidas' });
  }
};

// Rota para obter todos os jogadores (protegida por autenticação)
app.get('/jogadores', authenticate, (req, res) => {
  try {
    const data = fs.readFileSync(dataPath, 'utf8');
    const jogadores = JSON.parse(data).jogadores;
    res.json(jogadores);
  } catch (err) {
    console.error('Erro ao ler dados do arquivo JSON:', err);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para obter um jogador específico por ID (protegida por autenticação)
app.get('/jogadores/:id', authenticate, (req, res) => {
  const playerId = req.params.id;
  try {
    const data = fs.readFileSync(dataPath, 'utf8');
    const jogadores = JSON.parse(data).jogadores;
    const jogador = jogadores.find((jogador) => jogador.id === playerId);
    if (!jogador) {
      return res.status(404).json({ message: 'Jogador não encontrado' });
    }
    res.json(jogador);
  } catch (err) {
    console.error('Erro ao ler dados do arquivo JSON:', err);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para adicionar um novo jogador (protegida por autenticação)
app.post('/jogadores', authenticate, (req, res) => {
  const novoJogador = req.body;
  try {
    const data = fs.readFileSync(dataPath, 'utf8');
    const db = JSON.parse(data);
    db.jogadores.push(novoJogador);
    fs.writeFileSync(dataPath, JSON.stringify(db, null, 2));
    res.status(201).json(novoJogador);
  } catch (err) {
    console.error('Erro ao escrever dados no arquivo JSON:', err);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
