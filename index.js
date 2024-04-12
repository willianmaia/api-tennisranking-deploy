const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const atob = require('atob'); // Importe o pacote 'atob'
const admin = require("./firebaseConfig");

const app = express();
const PORT = process.env.PORT || 3001;

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

  const decodedAuth = Buffer.from(authString, 'base64').toString('ascii');
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
  const jogadoresRef = admin.database().ref('jogadores');
  jogadoresRef.once('value', (snapshot) => {
    const jogadores = snapshot.val();
    console.log('Jogadores encontrados:', jogadores);
    res.json(jogadores);
  }).catch((err) => {
    console.error('Erro ao ler dados do Realtime Database:', err);
    res.status(500).json({ message: 'Erro interno do servidor' });
  });
});

// Rota para obter um jogador específico por ID (protegida por autenticação)
app.get('/jogadores/:id', authenticate, (req, res) => {
  const playerId = req.params.id;
  const jogadorRef = admin.database().ref(`jogadores/${playerId}`);
  jogadorRef.once('value', (snapshot) => {
    const jogador = snapshot.val();
    if (!jogador) {
      console.log(`Jogador com ID ${playerId} não encontrado`);
      return res.status(404).json({ message: 'Jogador não encontrado' });
    }
    console.log('Jogador encontrado:', jogador);
    res.json(jogador);
  }).catch((err) => {
    console.error('Erro ao ler dados do Realtime Database:', err);
    res.status(500).json({ message: 'Erro interno do servidor' });
  });
});

// Rota para adicionar um novo jogador (protegida por autenticação)
app.post('/jogadores', authenticate, (req, res) => {
  const novoJogador = req.body;
  const novoJogadorRef = admin.database().ref('jogadores').push();
  novoJogadorRef.set(novoJogador)
    .then(() => {
      console.log('Novo jogador adicionado:', novoJogador);
      res.status(201).json(novoJogador);
    })
    .catch((err) => {
      console.error('Erro ao escrever dados no Realtime Database:', err);
      res.status(500).json({ message: 'Erro interno do servidor' });
    });
});

// Rota para obter todos os confrontos (protegida por autenticação)
app.get('/confrontos', authenticate, (req, res) => {
  const confrontosRef = admin.database().ref('confrontos');
  confrontosRef.once('value', (snapshot) => {
    const confrontos = snapshot.val();
    console.log('Confrontos encontrados:', confrontos);
    res.json(confrontos);
  }).catch((err) => {
    console.error('Erro ao ler dados do Realtime Database:', err);
    res.status(500).json({ message: 'Erro interno do servidor' });
  });
});

// Rota para obter um confronto específico por ID (protegida por autenticação)
app.get('/confrontos/:id', authenticate, (req, res) => {
  const confrontoId = req.params.id;
  const confrontoRef = admin.database().ref(`confrontos/${confrontoId}`);
  confrontoRef.once('value', (snapshot) => {
    const confronto = snapshot.val();
    if (!confronto) {
      console.log(`Confronto com ID ${confrontoId} não encontrado`);
      return res.status(404).json({ message: 'Confronto não encontrado' });
    }
    console.log('Confronto encontrado:', confronto);
    res.json(confronto);
  }).catch((err) => {
    console.error('Erro ao ler dados do Realtime Database:', err);
    res.status(500).json({ message: 'Erro interno do servidor' });
  });
});

// Rota para atualizar um confronto específico por ID (protegida por autenticação)
app.put('/confrontos/:id', authenticate, (req, res) => {
  const confrontoId = req.params.id;
  const novoConfronto = req.body;

  const confrontosRef = admin.database().ref('confrontos');

  // Verificar se novoConfronto é um objeto válido
  if (typeof novoConfronto === 'object' && !Array.isArray(novoConfronto)) {
    // Encontrar o confronto com o ID correspondente
    confrontosRef.child(confrontoId).once('value', (snapshot) => {
      const confronto = snapshot.val();

      if (!confronto) {
        return res.status(404).json({ message: `Confronto com ID ${confrontoId} não encontrado` });
      }

      // Atualizar apenas os campos específicos do confronto
      Object.keys(novoConfronto).forEach((key) => {
        confronto[confrontoId][key] = novoConfronto[key];
      });

      // Atualizar o confronto no banco de dados
      confrontosRef.child(confrontoId).update(confronto[confrontoId])
        .then(() => {
          console.log('Confronto atualizado:', confronto[confrontoId]);
          res.json(confronto[confrontoId]);
        })
        .catch((err) => {
          console.error('Erro ao atualizar o confronto:', err);
          res.status(500).json({ message: 'Erro interno do servidor ao atualizar o confronto', error: err });
        });
    });
  } else {
    console.error('Erro ao atualizar o confronto: novoConfronto não é um objeto válido');
    res.status(400).json({ message: 'Erro: novoConfronto não é um objeto válido' });
  }
});



// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});