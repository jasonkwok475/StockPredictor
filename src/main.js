const { EventEmitter } = require("stream");
const fs = require("fs");
const tf = require("@tensorflow/tfjs");

const DATA_FOLDER = "./data/";
const DATA_FILE = "stock_data.json";
const MODEL_FOLDER = "./model/";
const MODEL_FILE = "stock_model.json";

class StockPredictor extends EventEmitter {
  constructor() {
    super();
    this.stockData = [];
    this.model = tf.sequential();
    this.model.add(tf.layers.layerNormalization({ inputShape: [1] })); //!Change shape here
    this.model.add(tf.layers.dropout({ rate: 0.2 })); //Helps to prevent overfitting
    this.model.add(tf.layers.dense({ units: 64, activation: "relu" }));
    this.model.add(tf.layers.dropout({ rate: 0.1 }));
    this.model.add(tf.layers.dense({ units: 1 }));
    this.model.compile({
      loss: "meanSquaredError",
      optimizer: 'sgd',
      metrics: ['MAE']
    });

    this.checkFolders();
  }

  addStockData(data) {
    this.stockData.push(data);
    this.emit("dataAdded", data);
  }

  getStockData() {
    return this.stockData;
  }

  checkFolders() {
    if (!fs.existsSync(DATA_FOLDER)) {
      fs.mkdirSync(DATA_FOLDER, { recursive: true });
    }
    if (!fs.existsSync(MODEL_FOLDER)) {
      fs.mkdirSync(MODEL_FOLDER, { recursive: true });
    }
  }
}

module.exports = StockPredictor;