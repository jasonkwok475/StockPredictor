const express = require('express');
const enableWs = require('express-ws');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;
enableWs(app);

const MODEL_FOLDER = './model'; //! Put these into a config file?

const StockPredictor = require('./src/main.js');
const stockPredictor = new StockPredictor();

const ApiManager = require('./src/apiManager.js');
const apiManager = new ApiManager();

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'webpage')));

app.post('/api/data', async (req, res) => {
  const data = req.body;
  let response = await apiManager.getTrainingData(data.stock, '2022-01-01');
  res.status(200).json(response);
});

app.get('/api/models', (req, res) => {
  fs.readdir(MODEL_FOLDER, (err, files) => {
    if (err) return console.log(err);
    res.send(files);
  });
});

app.post('/api/train', async (req, res) => {
  let result = await stockPredictor.trainModel(await stockPredictor.getSampleData());
  res.status(200).json(result);
});

// Websocket for progress updates
app.ws('/progress', (ws, req) => {
  stockPredictor.on('epochEnd', (epoch, logs) => {
    ws.send(JSON.stringify({ epoch: epoch + 1, loss: logs.loss, mae: logs.MAE }));
  });

  ws.on('close', () => console.log('WebSocket was closed'));
});


app.post('/api/select_model', (req, res) => {
  const model_file = req.body.model;
});

app.post('/api/predict', (req, res) => {
  const data = req.data;
});

const main = async () => {
  try {
    app.listen(port, async () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
  } catch (error) { console.error('Error starting server:', error); }
}

main().catch((error) => console.error('Error in main function:', error));