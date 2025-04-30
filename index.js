const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

const StockPredictor = require('./src/main.js');
const stockPredictor = new StockPredictor();

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

// app.post('/train_data', (req, res) => {
//   const data = req.body;
// })

const main = async () => {
  try {
    app.listen(port, async () => {
      console.log(`Server is running at http://localhost:${port}`);
      let sample = stockPredictor.getSampleData();
      let result = await stockPredictor.trainModel(sample);
    });
  } catch (error) {
    console.error('Error starting server:', error);
  }
}

main().catch((error) => console.error('Error in main function:', error));
