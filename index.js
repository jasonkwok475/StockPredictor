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
  try {
    let response = await apiManager.getTrainingData(data.stock, '2022-01-01');
    res.status(200).json(response);
  } catch (e) {
    console.log(e);
    res.status(200).json({ data: [], format:[]});
  }
});

app.get('/api/models', (req, res) => {
  fs.readdir(MODEL_FOLDER, (err, files) => {
    if (err) return console.log(err);
    res.send(files);
  });
});

app.post('/api/train', async (req, res) => {
  let params = req.body;
  let data = await stockPredictor.getSampleData();
  let result = await stockPredictor.trainModel(data, params);
  // let r = await stockPredictor.predict(await stockPredictor.getTestData());
  res.status(200).json(result);
});

// Websocket for progress updates
app.ws('/progress', (ws, req) => {
  stockPredictor.on('epochEnd', (epoch, logs) => {
    ws.send(JSON.stringify({ epoch: epoch + 1, loss: logs.loss, mae: logs.MAE }));
  });

  ws.on('close', () => console.log('WebSocket was closed'));
});

app.post('/api/save_model', async (req, res) => {
  const model_name = req.body.model_name;
  await stockPredictor.saveModel(model_name);
  res.status(200).json({ message: 'Model saved successfully' }); 
});

app.post('/api/select_model', async (req, res) => {
  const model_name = req.body.model_name;
  await stockPredictor.loadModel(model_name);
});

app.post('/api/predict', async (req, res) => {
  let params = req.body;
  let data = await stockPredictor.getPredictData(params.stock);
  let result = await stockPredictor.predict(data);
  res.status(200).json(result);
});

const main = async () => {
  try {
    app.listen(port, async () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
  } catch (error) { console.error('Error starting server:', error); }
}

main().catch((error) => console.error('Error in main function:', error));