const { EventEmitter } = require("stream");
const fs = require("fs");
const tf = require("@tensorflow/tfjs");
const DataManager = require('./dataManager.js');

const SAMPLE_DATA = './data/aaxj.us.txt';

/**
 * @typedef {Object} InputObject
 * @prop {float[]} Open An array of the opening prices
 * @prop {float[]} Close An array of the closing prices
 * @prop {float[]} High An array of the maximum prices
 * @prop {float[]} Low An array of the lowest prices
 * @prop {float[]} Volume  An array of the volumes
 */

/**
 * 
 */
class StockPredictor extends EventEmitter {
  constructor() {
    super();
    this.stockData = [];
    this.dataManager = new DataManager();
    this.sample_data = this.getSampleData();

    this.model = this.buildModel();
    this.model.summary();
  }

  addStockData(data) {
    this.stockData.push(data);
    this.emit("dataAdded", data);
  }

  getStockData() {
    return this.stockData;
  }

  buildModel() {
    let model = tf.sequential({ layers: [
      tf.layers.layerNormalization({ inputShape: [15, ], axis: -1 }),
      tf.layers.dropout({ rate: 0.2 }), //Helps to prevent overfitting
      tf.layers.dense({ units: 64, activation: "relu" }),
      tf.layers.dropout({ rate: 0.1 }),
      tf.layers.dense({ units: 64, activation: "relu" }),
      tf.layers.dense({ units: 1 })
    ]});

    model.compile({
      loss: "meanSquaredError",
      optimizer: 'adam',
      metrics: ['MAE']
    });

    return model;
  }

  /**
   * 
   * @param {*} data 
   */
  async trainModel(data) {
    return new Promise((resolve, reject) => {
      try {
        this.model.fit(
          data.data,
          data.labels,
          {
            epochs: 1,
            verbose: 0, // Suppress Logging
            validation_split: 0.2 //Validation results on 20% of data
          }
        ).then((history) => resolve(history));
      } catch (e) {
        console.log(e);
        reject();
      }
    });
  }

  async predict(data) {
    return new Promise(async (resolve, reject) => {
      try {
        let r = await this.model.predict(data.data, data.labels, {verbose:0});
        return resolve(r);
      } catch (e) {
        console.log(e);
        reject();
      }
    });
  }

  getSampleData() {
    return this.dataManager.compileTrainingData(SAMPLE_DATA);
  }
}

module.exports = StockPredictor;

//https://www.anychart.com/blog/2023/05/02/candlestick-chart-stock-analysis/