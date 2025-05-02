const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

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

app.post('/api/data', (req, res) => {
  const data = req.body;
  console.log('Received data:', data);
  res.status(200).json({ message: 'Data received successfully', data });
});

app.get('/api/models', (req, res) => {
  fs.readdir(MODEL_FOLDER, (err, files) => {
    if (err) return console.log(err);
    res.send(files);
  });
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
      let result = await stockPredictor.trainModel(stockPredictor.sample_data);
      console.log(result);
      let r = await stockPredictor.predict(stockPredictor.sample_data);
      console.log(r);
      let t = await apiManager.getTrainingData('VOO');
    });
  } catch (error) {
    console.error('Error starting server:', error);
  }
}

main().catch((error) => console.error('Error in main function:', error));

//https://medium.com/coinmonks/free-stock-apis-de8f13619911
//https://documentation.tradier.com/brokerage-api?_gl=1*eyez7q*_gcl_au*MTc5MTQ5NjU3MC4xNzQ2MjI1NzUx*_ga*MjEyNzQ5MjgwMi4xNzQ2MjI1NzUx*_ga_3PK48K3W99*MTc0NjIyNTc1MS4xLjEuMTc0NjIyNTc4NS4yNi4wLjA.