const express = require("express");
const router = express.Router();
const mongo = require('mongodb');

const redis = require('redis');
const client = redis.createClient(6379, 'localhost');
client.on("error", function (error) {
    console.error(error);
});

router.get('/', (req, res) => {
    res.send("hola");
});

router.get('/data', async (req, res) => {
    const db = await mongo.connect('mongodb://localhost:27017');
    const dbo = db.db('base_so1');
    const datos = await dbo.collection('datos').find({}, { Departamento: 1 }).toArray();
    client.lrange('datos', 0, -1, (err, data) => {
        if (datos &&
            datos instanceof Array &&
            data &&
            data instanceof Array &&
            data.length === datos.length &&
            data.length > 0
        ) {
            const datos_mongo = datosMongo(datos);
            const datos_redis = datosRedis(data);
            res.json({
                top3: datos_mongo.top3,
                departamentos: datos_mongo.departamentos,
                ultimo: datos_redis.ultimo,
                edades: datos_redis.edades,
                datos,
                numero: datos.length
            });
        } else {
            res.json({
                top3: [],
                departamentos: {
                    labels: [],
                    datasets: []
                },
                ultimo: {
                    nombre: '',
                    departamento: '',
                    edad: '',
                    'forma': '',
                    estado: ''
                },
                edades: {
                    labels: [],
                    datasets: []
                },
                datos: [],
                numero: 0
            });
        }
    });
});

function datosMongo(datos) {
    const deptos = {};
    for (let i = 0; i < datos.length; i++) {
        const dato = datos[i];
        if (!deptos[dato.departamento]) {
            deptos[dato.departamento] = 0;
        }
        deptos[dato.departamento]++;
    }
    const ordenado = Object.keys(deptos).sort((a, b) => { return deptos[a] - deptos[b] }).reverse();
    const top3 = [];
    const departamentos = [];
    for (let i = 0; i < ordenado.length; i++) {
        if (i < 3) {
            top3.push({ departamento: ordenado[i], cantidad: deptos[ordenado[i]] });
        }
        departamentos.push({
            name: ordenado[i],
            value: deptos[ordenado[i]]
        });
    }
    return { top3, departamentos, datos };
}

function datosRedis(datos) {
    const ultimo = {};
    const str_ultimo = datos[0].split(',');
    ultimo['nombre'] = str_ultimo[0];
    ultimo['departamento'] = str_ultimo[1];
    ultimo['edad'] = str_ultimo[2];
    ultimo['forma'] = str_ultimo[3];
    ultimo['estado'] = str_ultimo[4];

    const edades_dict = {};
    for (let i = 0; i < datos.length; i++) {
        const str = datos[i].split(',');
        const edad = str[2];
        if (!edades_dict[edad]) {
            edades_dict[edad] = 0;
        }
        edades_dict[edad]++;
    }
    const claves = Object.keys(edades_dict);
    const r = {};
    for (let i = 0; i < claves.length; i++) {
        const x = claves[i];
        const y = Math.floor(x / 10);
        if (!r[y]) {
            r[y] = 0;
        }
        r[y] = r[y] + edades_dict[claves[i]];
    }
    const edades = [];
    for (let k in r) {
        const inicio = k * 10;
        const fin = (((k * 1) + 1) * 10) - 1;
        edades.push({
            name: `${inicio} - ${fin}`,
            value: r[k]
        });
    }
    return { ultimo, edades };
}

router.get('/todo', (req, res) => {
    const veces = rnd(3);
    const datos = [];
    for (let i = 0; i < veces; i++) {
        const n = rnd(1000);
        const d = rnd(22) + 1;
        const e = rnd(99) + 1;
        const f = rnd(5);
        const s = rnd(5);
        datos.push({
            nombre: `nombre${n}`,
            departamento: `departamento${d}`,
            edad: `${e}`,
            "forma de contagio": `forma${f}`,
            estado: `estado${s}`
        });
    }
    res.send(datos);
});

router.get('/borrar', async (req, res) => {
    const db = await mongo.connect('mongodb://localhost:27017');
    const dbo = db.db('base_so1');
    await dbo.collection('datos').deleteMany({});
    client.flushdb((err, succ) => { });
    res.json({});
});

router.post('/nuevo', async (req, res) => {
    const { nombre, departamento, edad, forma, estado } = req.body;
    const db = await mongo.connect('mongodb://localhost:27017');
    const dbo = db.db('base_so1');
    await dbo.collection('datos').insertOne(req.body);
    client.lpush('datos', `${nombre},${departamento},${edad},${forma},${estado}`);
    res.send({});
});

function rnd(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

module.exports = router;