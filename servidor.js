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
    
    postgres.connect(function(err,client,done) {

       if(err){

           console.log("Nao conseguiu acessar o  BD "+ err);
           res.status(400).send('{'+err+'}');
       }else{            

            var q1 ={
                text: 'insert into tb_patente (nome, quant_min_pontos, datacriacao, cor, datacadastro, ' +
                   ' situacao) ' +
                ' values ($1,$2,$3,$4,now(), $5) ' +
                                            'returning nome, quant_min_pontos, datacriacao, cor, ' +
                                            ' to_char(datacadastro, \'dd/mm/yyyy\') as datacadastro, '+
                                            ' to_char(data_ultimo_login, \'dd/mm/yyyy\') as data_ultimo_login, situacao;',
                values: [req.body.nome, 
                         req.body.quant_min_pontos, 
                         req.body.datacriacao, 
                         req.body.cor, 
                         req.body.situacao == true ? "A" : "I"]
            }
            var q2 = {
                text : 'insert into tb_endereco (complemento, cep, nomejogador) values ($1, $2, $3) returning codigo, complemento, cep;',
                values: [req.body.endereco.complemento, 
                         req.body.endereco.cep, 
                         req.body.nome]
            }
            console.log(q1);

            client.query(q1, function(err,result1) {
                if(err){
                    console.log('retornou 400 no insert q1');
                    res.status(400).send('{'+err+'}');
                }else{
                    client.query(q2, async function(err,result2) {
                        if(err){
                            console.log('retornou 400 no insert q2');
                            res.status(400).send('{'+err+'}');
                        }else{
                        
                            //insere todas as pantentes na tabela associativa.
                            for(var i=0; i < req.body.patentes.length; i++){                                              

                                try {                          
        
                                    await client.query('insert into tb_jogador_conquista_patente (codpatente, nome) values ($1, $2)', [req.body.patentes[i].codigo, req.body.nome])
        
                                } catch (err) {
                                                                
                                    res.status(400).send('{'+err+'}');
                                }                                           
        
                            }                            

                            done(); // closing the connection;
                            console.log('retornou 201 no insertjogador');
                            res.status(201).send({"nome" : result1.rows[0].nome, 
                                                  "quant_min_pontos": result1.rows[0].quant_min_pontos, 
                                                  "datacriacao": result1.rows[0].datacriacao, 
                                                  "cor": result1.rows[0].cor,
                                                  "situacao": result1.rows[0].situacao,
                                                  "datacadastro" : result1.rows[0].datacadastro,
                                                  "data_ultimo_login" : result1.rows[0].data_ultimo_login,
                                                  "endereco": {"codigo": result2.rows[0].codigo, "cep": result2.rows[0].cep, "complemento": result2.rows[0].complemento},
                                                  "patentes": req.body.patentes});
                        }
                    });
                }           
            });
       }       
    });
});



sw.listen(4000, function () {
    console.log('Servidor ta bombando na porta 4milão');
});








