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

    let normalizer = tf.layers.layerNormalization({ inputShape: [1,15], axis: -1 });
    //normalizer.adapt(sample_data.training_data);
    this.model = this.buildModel(normalizer);
  }

  addStockData(data) {
    this.stockData.push(data);
    this.emit("dataAdded", data);
  }

  getStockData() {
    return this.stockData;
  }

  buildModel(normalizer) {
    let model = tf.sequential({ layers: [
      normalizer,
      tf.layers.dropout({ rate: 0.2 }), //Helps to prevent overfitting
      tf.layers.dense({ units: 64, activation: "relu" }),
      tf.layers.dropout({ rate: 0.1 }),
      tf.layers.dense({ units: 1 })
    ]});

    model.compile({
      loss: "meanSquaredError",
      optimizer: 'sgd',
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
        let history = this.model.fit(
          data.training_data,
          data.training_labels,
          {
            epochs: 1,
            verbose: 0, // Suppress Logging
            validation_split: 0.2 //Validation results on 20% of data
          }
        )
        resolve(history);
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