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
    console.log('Jogadores encontrados:', jogadores); // Log dos jogadores encontrados
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
      console.log(`Jogador com ID ${playerId} não encontrado`); // Log jogador não encontrado
      return res.status(404).json({ message: 'Jogador não encontrado' });
    }
    console.log('Jogador encontrado:', jogador); // Log do jogador encontrado
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
    console.log('Novo jogador adicionado:', novoJogador); // Log do novo jogador adicionado
    res.status(201).json(novoJogador);
  } catch (err) {
    console.error('Erro ao escrever dados no arquivo JSON:', err);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para obter todos os confrontos (protegida por autenticação)
app.get('/confrontos', authenticate, (req, res) => {
  try {
    const data = fs.readFileSync(dataPath, 'utf8');
    const confrontos = JSON.parse(data).confrontos;
    console.log('Confrontos encontrados:', confrontos); // Log dos confrontos encontrados
    res.json(confrontos);
  } catch (err) {
    console.error('Erro ao ler dados do arquivo JSON:', err);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para obter um confronto específico por ID (protegida por autenticação)
app.get('/confrontos/:id', authenticate, (req, res) => {
  const confrontoId = req.params.id;
  try {
    const data = fs.readFileSync(dataPath, 'utf8');
    const confrontos = JSON.parse(data).confrontos;
    const confronto = confrontos.find((confronto) => confronto.id === confrontoId);
    if (!confronto) {
      console.log(`Confronto com ID ${confrontoId} não encontrado`); // Log confronto não encontrado
      return res.status(404).json({ message: 'Confronto não encontrado' });
    }
    console.log('Confronto encontrado:', confronto); // Log do confronto encontrado
    res.json(confronto);
  } catch (err) {
    console.error('Erro ao ler dados do arquivo JSON:', err);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para atualizar um confronto específico por ID (protegida por autenticação)
app.put('/confrontos/:id', authenticate, (req, res) => {
  const confrontoId = req.params.id;
  const novoConfronto = req.body; // O novo objeto de confronto enviado no corpo da requisição
  try {
    const data = fs.readFileSync(dataPath, 'utf8');
    let db = JSON.parse(data);
    const confrontos = db.confrontos;
    const confrontoIndex = confrontos.findIndex((confronto) => confronto.id === confrontoId);
    if (confrontoIndex === -1) {
      console.log(`Confronto com ID ${confrontoId} não encontrado`); // Log confronto não encontrado
      return res.status(404).json({ message: 'Confronto não encontrado' });
    }
    // Atualiza o confronto no array de confrontos
    db.confrontos[confrontoIndex] = { ...db.confrontos[confrontoIndex], ...novoConfronto };
    // Escreve o arquivo JSON de volta com o confronto atualizado
    fs.writeFileSync(dataPath, JSON.stringify(db, null, 2));
    console.log('Confronto atualizado:', db.confrontos[confrontoIndex]); // Log do confronto atualizado
    res.json(db.confrontos[confrontoIndex]);
  } catch (err) {
    console.error('Erro ao ler/escrever dados do arquivo JSON:', err);
    if (err instanceof SyntaxError) {
      return res.status(500).json({ message: 'Erro de formatação JSON no arquivo de dados' });
    } else {
      return res.status(500).json({ message: 'Erro interno do servidor ao atualizar o confronto' });
    }
  }
});



// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
