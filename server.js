const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3001;

// Middleware para tratar o corpo das requisições como JSON
app.use(bodyParser.json());

// Rota para obter todos os jogadores
app.get('/jogadores', (req, res) => {
  try {
    const data = fs.readFileSync('db.json', 'utf8');
    const jogadores = JSON.parse(data).jogadores;
    res.json(jogadores);
  } catch (err) {
    console.error('Erro ao ler dados do arquivo JSON:', err);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para obter um jogador específico por ID
app.get('/jogadores/:id', (req, res) => {
  const playerId = req.params.id;
  try {
    const data = fs.readFileSync('db.json', 'utf8');
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

// Rota para adicionar um novo jogador
app.post('/jogadores', (req, res) => {
  const novoJogador = req.body;
  try {
    const data = fs.readFileSync('db.json', 'utf8');
    const db = JSON.parse(data);
    db.jogadores.push(novoJogador);
    fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
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
