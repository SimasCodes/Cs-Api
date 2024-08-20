var express = require('express'); // requisita a biblioteca para a criacao dos serviços web.
var pg = require("pg"); // requisita a biblioteca pg para a comunicacao com o banco de dados.

 var sw = express(); // iniciliaza uma variavel chamada app que possitilitará a criação dos serviços e rotas.

sw.use(express.json());//padrao de mensagens em json.
//permitir o recebimento de qualquer origem, aceitar informações no cabeçalho e permitir o métodos get e post
sw.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET,POST');
    next();
});


const config = {
    host: 'localhost',
    user: 'postgres',
    database: 'db_cs_2024',
    password: 'postgres',
    port: 5432
};

//definia conexao com o banco de dados.
const postgres = new pg.Pool(config);

//definicao do primeiro serviço web.
sw.get('/', (req, res) => {
    res.send('NÃO OLHE PRA TRAS');
})

sw.get('/cuidado', (req, res) => {
    res.send('CUIDADO!!!!!!!');
})

sw.get('/cuidado2', (req, res) => {
    res.status(201).send('CUIDADO!!!!!!!');
})


sw.get('/listenderecos', function (req, res, next) {
    
    postgres.connect(function(err,client,done) {

       if(err){

           console.log("Nao conseguiu acessar o  BD "+ err);
           res.status(400).send('{'+err+'}');
       }else{            

            var q ='select codigo, complemento, cep, nicknamejogador' +
             ' from tb_endereco order by codigo asc';            
    
            client.query(q,function(err,result) {
                done(); // closing the connection;
                if(err){
                    console.log('retornou 400 no listendereco');
                    console.log(err);
                    
                    res.status(400).send('{'+err+'}');
                }else{

                    //console.log('retornou 201 no /listendereco');
                    res.status(201).send(result.rows);
                }           
            });
       }       
    });
});









sw.get('/listpatentes', function (req, res, next) {
    
    postgres.connect(function(err,client,done) {

       if(err){

           console.log("Nao conseguiu acessar o  BD "+ err);
           res.status(400).send('{'+err+'}');
       }else{            

            var q ='select codigo, nome, quant_min_pontos, cor, logotipo, to_char(datacriacao, \'dd/mm/yyyy/ hh24:mi:ss\') as datacriacao from tb_patente order by codigo asc';            
    
            client.query(q,function(err,result) {
                done(); // closing the connection;
                if(err){
                    console.log('retornou 400 no listpatente');
                    console.log(err);
                    
                    res.status(400).send('{'+err+'}');
                }else{

                    //console.log('retornou 201 no /listpatente');
                    res.status(201).send(result.rows);
                }           
            });
       }       
    });
});












sw.get('/listjogadores', function (req, res, next) {
    
    postgres.connect(function(err,client,done) {

       if(err){

           console.log("Nao conseguiu acessar o  BD "+ err);
           res.status(400).send('{'+err+'}');
       }else{            
      
            var q ='select j.nickname, j.senha, 0 as patentes, e.cep ' +
            'from tb_jogador j, tb_endereco e '+
             'where e.nicknamejogador=j.nickname order by nickname asc;'
    //exerxicio 1 incluir todas as colunas tb_jogador
            client.query(q,async function(err,result) {
            
                if(err){
                    console.log('retornou 400 no listjogador');
                    console.log(err);
                    
                    res.status(400).send('{'+err+'}');
                }else{
                    for(var i=0; i < result.rows.length; i++){
                        try{//exerxicio 2 incluir todas as coluanas de tb_patente
                            pj = await client.query('select codpatente, 0 as patentes from ' +
                            'tb_jogador_conquista_patente '+
                            'where nickname = $1', [result.rows[i].nickname])
                            result.rows[i].patentes = pj.rows;
                        }catch(err){

                        }
                    }
                    done(); // closing the connection;
                    //console.log('retornou 201 no /listjogador');
                    res.status(201).send(result.rows);
                }           
            });
       }       
    });
});









sw.post('/insertpatente', function (req, res, next) {
    postgres.connect(function(err, client, done) {
        if (err) {
            console.log("Não conseguiu acessar o BD: " + err);
            res.status(400).json({ error: err.message });
            return;
        }

        var q1 = {
            text: 'INSERT INTO tb_patente (nome, quant_min_pontos, datacriacao, cor, logotipo) ' +
                  'VALUES ($1, $2, now(), $3, $4) ' +
                  'RETURNING codigo, nome, quant_min_pontos, to_char(datacriacao, \'dd/mm/yyyy\') as datacriacao, cor, logotipo',
            values: [req.body.nome, 
                     req.body.quant_min_pontos, 
                     req.body.cor, 
                     req.body.logotipo]
        };

        console.log(q1);

        client.query(q1, function(err, result1) {
            done();

            if (err) {
                console.log('Erro ao inserir patente: ' + err);
                res.status(400).json({ error: err.message });
            } else {
                console.log('Patente inserida com sucesso');
                res.status(201).json(result1.rows[0]);
            }
        });
    });
});      







sw.get('/removepatente', function (req, res, next) {
    // Conectar ao banco de dados
    postgres.connect(function(err, client, done) {
        if (err) {
            console.log("Não conseguiu acessar o BD: " + err);
            res.status(400).json({ error: err.message });
            return;
        }

        // Definir a consulta para remover a patente
        var q1 = {
            text: 'DELETE FROM tb_patente WHERE codigo = $1 RETURNING codigo',
            values: [req.body.codigo]
        };

        console.log(q1);

        // Executar a consulta
        client.query(q1, function(err, result1) {
            done(); // Sempre liberar o cliente de volta ao pool após a execução da consulta

            if (err) {
                console.log('Erro ao remover patente: ' + err);
                res.status(400).json({ error: err.message });
            } else if (result1.rowCount === 0) {
                // Nenhuma linha foi afetada, patente não encontrada
                res.status(404).json({ error: 'Patente não encontrada' });
            } else {
                console.log('Patente removida com sucesso');
                res.status(200).json({ message: 'Patente removida com sucesso', codigo: result1.rows[0].codigo });
            }
        });
    });
});







sw.post('/updatepatente', function (req, res, next) {
    // Conectar ao banco de dados
    postgres.connect(function(err, client, done) {
        if (err) {
            console.log("Não conseguiu acessar o BD: " + err);
            res.status(400).json({ error: err.message });
            return;
        }

        // Definir a consulta para atualizar a patente
        var q1 = {
            text: `UPDATE tb_patente 
                       SET nome = $1, 
                       quant_min_pontos = $2, 
                       cor = $3, 
                       logotipo = $4 
                   WHERE codigo = $5 
                   RETURNING codigo, nome, quant_min_pontos, to_char(datacriacao, 'dd/mm/yyyy') as datacriacao, cor, logotipo`,
            values: [
                req.body.nome, 
                req.body.quant_min_pontos, 
                req.body.cor, 
                req.body.logotipo, 
                req.body.codigo
            ]
        };

        console.log(q1);

        // Executar a consulta
        client.query(q1, function(err, result1) {
            done(); // Sempre liberar o cliente de volta ao pool após a execução da consulta

            if (err) {
                console.log('Erro ao atualizar patente: ' + err);
                res.status(400).json({ error: err.message });
            } else if (result1.rowCount === 0) {
                // Nenhuma linha foi afetada, patente não encontrada
                res.status(404).json({ error: 'Patente não encontrada' });
            } else {
                console.log('Patente atualizada com sucesso');
                res.status(200).json(result1.rows[0]);
            }
        });
    });
});




sw.listen(4000, function () {
    console.log('Servidor ta bombando na porta 4milão');
});








