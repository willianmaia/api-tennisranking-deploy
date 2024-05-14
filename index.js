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

app.post('/jogadores', authenticate, (req, res) => {
  const novoJogador = req.body;

  // Obtém a próxima ID sequencial como string
  admin.database().ref('proximoId').transaction((currentValue) => {
    return (currentValue || 0) + 1;
  }, (error, committed, snapshot) => {
    if (error) {
      console.error('Erro ao obter próxima ID:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    } else if (committed) {
      // Converte a próxima ID sequencial para uma string
      const proximaIdString = String(snapshot.val());

      // Atribui a próxima ID sequencial como string ao novo jogador
      novoJogador.id = proximaIdString;

      // Adiciona o novo jogador ao banco de dados com a ID sequencial
      const jogadoresRef = admin.database().ref('jogadores');

      // Obtém a lista de jogadores existentes
      jogadoresRef.once('value')
        .then(snapshot => {
          const jogadores = snapshot.val() || []; // Se não houver jogadores, começa com um array vazio
          
          // Adiciona o novo jogador à lista de jogadores
          jogadores.push(novoJogador);

          // Salva a lista atualizada de jogadores de volta no banco de dados
          jogadoresRef.set(jogadores)
            .then(() => {
              console.log('Novo jogador adicionado:', novoJogador);
              res.status(201).json(novoJogador);
            })
            .catch((err) => {
              console.error('Erro ao escrever dados no Realtime Database:', err);
              res.status(500).json({ message: 'Erro interno do servidor' });
            });
        })
        .catch(err => {
          console.error('Erro ao obter jogadores existentes:', err);
          res.status(500).json({ message: 'Erro interno do servidor' });
        });
    } else {
      console.error('Falha ao obter próxima ID sequencial');
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });
});


// Rota para excluir um jogador específico por ID (protegida por autenticação)
app.delete('/jogadores/:id', authenticate, (req, res) => {
  const playerId = req.params.id;
  const jogadorRef = admin.database().ref(`jogadores/${playerId}`);

  // Verifica se o jogador existe antes de excluí-lo
  jogadorRef.once('value', (snapshot) => {
    const jogador = snapshot.val();
    if (!jogador) {
      console.log(`Jogador com ID ${playerId} não encontrado`);
      return res.status(404).json({ message: 'Jogador não encontrado' });
    }

    // Remove o jogador do banco de dados
    jogadorRef.remove()
      .then(() => {
        console.log(`Jogador com ID ${playerId} excluído com sucesso`);
		// Remove a referência do jogador do banco de dados
		return admin.database().ref(`jogadores`).child(playerId).remove();
      })
	  .then(() => {
		res.status(200).json({ message: `Jogador com ID ${playerId} excluído com sucesso` });
	  })
      .catch((err) => {
        console.error(`Erro ao excluir jogador com ID ${playerId}:`, err);
        res.status(500).json({ message: 'Erro interno do servidor ao excluir jogador', error: err });
      });
  }).catch((err) => {
    console.error('Erro ao ler dados do Realtime Database:', err);
    res.status(500).json({ message: 'Erro interno do servidor', error: err });
  });
});

// Rota para obter todos os confrontos organizados por rodadas (protegida por autenticação)
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

// Rota para atualizar confrontos para uma determinada rodada (protegida por autenticação)
app.put('/confrontos/:rodada', authenticate, (req, res) => {
  const rodada = req.params.rodada;
  const confrontosAtualizados = req.body;

  const confrontosRef = admin.database().ref(`confrontos/${rodada}`);

  // Atualiza os confrontos existentes com os dados recebidos
  confrontosRef.set(confrontosAtualizados)
    .then(() => {
      console.log(`Confrontos da rodada ${rodada} atualizados com sucesso`);
      res.status(200).json({ message: `Confrontos da rodada ${rodada} atualizados com sucesso` });
    })
    .catch((err) => {
      console.error('Erro ao atualizar confrontos:', err);
      res.status(500).json({ message: 'Erro interno do servidor ao atualizar confrontos', error: err });
    });
});

// Rota para criar todos os confrontos de uma determinada rodada (protegida por autenticação)
app.post('/confrontos/:rodada', authenticate, (req, res) => {
  const rodada = req.params.rodada;
  const confrontosASalvar = req.body;

  const confrontosRef = admin.database().ref('confrontos');

  confrontosRef.once('value', (snapshot) => {
    let confrontosAntigos = snapshot.val() || {};

    // Verifica se a rodada já existe
    if (confrontosAntigos.hasOwnProperty(rodada)) {
      // Sobrescreve os confrontos antigos pelos novos
      confrontosAntigos[rodada] = confrontosASalvar;

      // Atualiza os confrontos no banco de dados
      confrontosRef.set(confrontosAntigos)
        .then(() => {
          console.log(`Confrontos da rodada ${rodada} sobrescritos com sucesso:`, confrontosASalvar);
          res.status(201).json({ message: `Confrontos da rodada ${rodada} sobrescritos com sucesso` });
        })
        .catch((err) => {
          console.error('Erro ao salvar confrontos:', err);
          res.status(500).json({ message: 'Erro interno do servidor ao salvar confrontos', error: err });
        });
    } else {
      // Caso a rodada não exista, adiciona os novos confrontos normalmente
      confrontosAntigos[rodada] = confrontosASalvar;

      // Atualiza os confrontos no banco de dados
      confrontosRef.set(confrontosAntigos)
        .then(() => {
          console.log(`Confrontos da rodada ${rodada} salvos com sucesso:`, confrontosASalvar);
          res.status(201).json({ message: `Confrontos da rodada ${rodada} salvos com sucesso` });
        })
        .catch((err) => {
          console.error('Erro ao salvar confrontos:', err);
          res.status(500).json({ message: 'Erro interno do servidor ao salvar confrontos', error: err });
        });
    }
  });
});


// Rota para excluir todos os confrontos de uma determinada rodada (protegida por autenticação)
app.delete('/confrontos/:rodada', authenticate, (req, res) => {
  const rodada = req.params.rodada;

  // Referência para os confrontos da rodada específica
  const confrontosRef = admin.database().ref(`confrontos/${rodada}`);

  // Verifica se a rodada existe antes de excluí-la
  confrontosRef.once('value', (snapshot) => {
    if (snapshot.exists()) {
      // Remove os confrontos da rodada específica
      confrontosRef.remove()
        .then(() => {
          console.log(`Confrontos da rodada ${rodada} excluídos com sucesso`);
          res.status(200).json({ message: `Confrontos da rodada ${rodada} excluídos com sucesso` });
        })
        .catch((err) => {
          console.error('Erro ao excluir confrontos:', err);
          res.status(500).json({ message: 'Erro interno do servidor ao excluir confrontos', error: err });
        });
    } else {
      console.log(`Confrontos da rodada ${rodada} não encontrados`);
      res.status(404).json({ message: `Confrontos da rodada ${rodada} não encontrados` });
    }
  }).catch((err) => {
    console.error('Erro ao ler dados do Realtime Database:', err);
    res.status(500).json({ message: 'Erro interno do servidor', error: err });
  });
});



// Rota para criar um novo confronto (protegida por autenticação)
app.post('/confrontos', authenticate, (req, res) => {
  const novoConfronto = req.body;

  const confrontosRef = admin.database().ref('confrontos').push();
  confrontosRef.set(novoConfronto)
    .then(() => {
      console.log('Novo confronto adicionado:', novoConfronto);
      res.status(201).json(novoConfronto);
    })
    .catch((err) => {
      console.error('Erro ao escrever dados no Realtime Database:', err);
      res.status(500).json({ message: 'Erro interno do servidor ao criar o confronto', error: err });
    });
});

// Rota para atualizar dados de um usuário (protegida por autenticação)
app.post('/updateUserData', authenticate, (req, res) => {
  const { email, nome, sobrenome, password, papel, rankings } = req.body;

  // Substituir caracteres inválidos no e-mail para usá-lo como chave
  const sanitizedEmail = email.replace(/\./g, ',').replace(/@/g, '_');

  // Verificar se o e-mail foi fornecido na solicitação
  if (!email) {
    return res.status(400).send("E-mail do usuário não fornecido");
  }

  // Atualizar os dados do usuário na Realtime Database
  admin.database().ref(`/usuarios/${sanitizedEmail}`).once('value')
    .then((snapshot) => {
      if (snapshot.exists()) {
        // Obtenha os dados atuais do usuário
        const userData = snapshot.val();

        // Atualize os campos necessários
        const updatedData = {
          nome: nome || userData.nome,
          sobrenome: sobrenome || userData.sobrenome,
          password: password || userData.password,
          papel: papel || userData.papel,
          rankings: rankings || userData.rankings
        };

        // Atualize os dados do usuário na Realtime Database
        admin.database().ref(`/usuarios/${sanitizedEmail}`).update(updatedData)
          .then(() => {
            res.status(200).send("Dados do usuário atualizados com sucesso");
          })
          .catch((error) => {
            // Tratar erros de atualização de dados do usuário na Realtime Database
            res.status(400).send("Erro ao atualizar dados do usuário na Realtime Database: " + error.message);
          });
      } else {
        res.status(404).send("Usuário não encontrado");
      }
    })
    .catch((error) => {
      // Tratar erros de consulta ao banco de dados
      res.status(500).send("Erro ao verificar dados do usuário na base de dados: " + error.message);
    });
});



// Rota para criar um novo usuário na Realtime Database
app.post('/createUser', authenticate, (req, res) => {
  const { nome, sobrenome, email, password, papel, rankings } = req.body;

  // Substituir caracteres inválidos no e-mail para usá-lo como chave
  const sanitizedEmail = email.replace(/\./g, ',').replace(/@/g, '_');

  // Verificar se o e-mail já está cadastrado na Realtime Database
  admin.database().ref(`/usuarios/${sanitizedEmail}`).once('value')
    .then((snapshot) => {
      if (snapshot.exists()) {
        // Se o email já existe na base, enviar resposta indicando que o email já está cadastrado
        res.status(400).json({ message: "O email já está cadastrado" });
      } else {
        // Se o email não existe na base, criar um novo usuário
        admin.database().ref(`/usuarios/${sanitizedEmail}`).set({
          nome: nome,
          sobrenome: sobrenome,
          email: email,
          password: password, // Incluindo a senha aqui
          papel: papel,
          rankings: rankings || [] // Lista de rankings, se fornecida, ou uma lista vazia
        })
        .then(() => {
          res.status(200).json({ message: "Novo usuário criado com sucesso na Realtime Database" });
        })
        .catch((error) => {
          // Tratar erros de criação de usuário na Realtime Database
          res.status(400).json({ message: "Erro ao criar novo usuário na Realtime Database: " + error.message });
        });
      }
    })
    .catch((error) => {
      // Tratar erros de consulta ao banco de dados
      res.status(500).json({ message: "Erro ao verificar email na base de dados: " + error.message });
    });
});

// Rota para login (protegida por autenticação)
app.post('/login', authenticate, (req, res) => {
  const { email, password } = req.body;

  // Substituir caracteres inválidos no e-mail para usá-lo como chave
  const sanitizedEmail = email.replace(/\./g, ',').replace(/@/g, '_');

  // Verificar se o e-mail foi fornecido na solicitação
  if (!email || !password) {
    return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
  }

  // Verificar se o e-mail e a senha estão corretos
  admin.database().ref(`/usuarios/${sanitizedEmail}`).once('value')
    .then((snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();

        // Verificar se a senha corresponde à senha armazenada na base de dados
        if (userData.password === password) {
          // Senha correta, login bem-sucedido
          res.status(200).json({ message: "Login bem-sucedido" });
        } else {
          // Senha incorreta
          res.status(400).json({ error: "Credenciais inválidas" });
        }
      } else {
        // Usuário não encontrado
        res.status(400).json({ error: "Usuário não encontrado" });
      }
    })
    .catch((error) => {
      // Tratar erros de consulta ao banco de dados
      res.status(500).json({ error: "Erro ao verificar dados do usuário na base de dados: " + error.message });
    });
});




// Rota para criar um novo torneio
app.post('/torneios', authenticate, (req, res) => {
  const novoTorneio = req.body;

  const torneiosRef = admin.database().ref('torneios').push();
  torneiosRef.set(novoTorneio)
    .then(() => {
      console.log('Novo torneio criado:', novoTorneio);
      res.status(201).json(novoTorneio);
    })
    .catch((err) => {
      console.error('Erro ao criar novo torneio:', err);
      res.status(500).json({ message: 'Erro interno do servidor ao criar o torneio', error: err });
    });
});

// Rota para cadastrar um jogador para um torneio específico
app.post('/torneios/:torneio/jogadores', authenticate, (req, res) => {
  const torneioId = req.params.torneio;
  const novoJogador = req.body;

  const jogadoresRef = admin.database().ref(`torneios/${torneioId}/jogadores`);
  jogadoresRef.push(novoJogador)
    .then(() => {
      console.log('Novo jogador cadastrado para o torneio:', novoJogador);
      res.status(201).json(novoJogador);
    })
    .catch((err) => {
      console.error('Erro ao cadastrar jogador para o torneio:', err);
      res.status(500).json({ message: 'Erro interno do servidor ao cadastrar jogador', error: err });
    });
});

// Rota para cadastrar um jogo para um torneio específico
app.post('/torneios/:torneio/jogos', authenticate, (req, res) => {
  const torneioId = req.params.torneio;
  const novoJogo = req.body;

  const jogosRef = admin.database().ref(`torneios/${torneioId}/jogos`);
  jogosRef.push(novoJogo)
    .then(() => {
      console.log('Novo jogo cadastrado para o torneio:', novoJogo);
      res.status(201).json(novoJogo);
    })
    .catch((err) => {
      console.error('Erro ao cadastrar jogo para o torneio:', err);
      res.status(500).json({ message: 'Erro interno do servidor ao cadastrar jogo', error: err });
    });
});




// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});