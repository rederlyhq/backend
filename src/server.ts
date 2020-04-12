import configurations from './configurations';
import express = require('express');

const { port } = configurations.server;

const app = express()

app.get('/', (req, res) => {
    res.send('Server running...');
});

app.listen(port, () => console.log(`Server started up and listening on port: ${port}`))