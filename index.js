const express = require('express');
const app = express();
const port = process.env.PORT || 3001;
const bodyParser = require('body-parser');
const cors = require('cors');
const homeRoutes = require('./routes/home');

app.use(cors());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use('', homeRoutes);

app.listen(port, () => console.log(`Escuchando en puerto ${port}...`));
