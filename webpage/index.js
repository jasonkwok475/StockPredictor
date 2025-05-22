var default_stock = "VOO";
var models, chart, trainChart;
var epoch = 0;
var dataLoss = anychart.data.set([]);
var dataMAE = anychart.data.set([]);
var predictData = anychart.data.table();
var currentStock = default_stock;
var maxLoss = "", maxMAE = "";

// https://stackoverflow.com/questions/22429744/how-to-setup-route-for-websocket-server-in-express
const socketProtocol = (window.location.protocol === 'https:' ? 'wss:' : 'ws:')
const progressSocketUrl = socketProtocol + '//' + window.location.hostname + ':3000/progress/'

$(document).ready(async function () {
  loadTrainCharts();
  loadModels();
  loadStockChart(default_stock);

  $("#trainModel").hide();
  $("#stockChart").show();
});

function toggleInputs(hide = true) {
  $("#loadChart").prop('disabled', hide); // Load chart button
  $("#saveButton").prop('disabled', hide); // Save model button
  $("#trainButton").prop('disabled', hide); // Train model button
  $("#models").prop('disabled', hide); // Model dropdown
  $("#stockSymbol").prop('disabled', hide); // Stock symbol input
  $("#epochs").prop('disabled', hide); // Epochs input
  $("#batchSize").prop('disabled', hide); // Batch size input
}

async function loadModels() {
  var response = await fetch("http://localhost:3000/api/models", { method: "GET" });
  models = await response.json();

  for (var i = 0; i < models.length; i++) {
    var item = '<option value="'+models[i]+'">'+models[i]+'</option>';
    $('#models').append(item);
    //TODO Show the model parameters on the sidebar
  }
}

function loadSymbolChart() {
  var stock = $("#stockSymbol").val();
  if (stock == "") return;
  loadStockChart(stock);
  
  $("#trainModel").hide();
  $("#stockChart").show();
}

async function getStockData(stock) {
  return new Promise(async (resolve, reject) => {
    var response = await fetch("http://localhost:3000/api/data", { 
      method: "POST",
      body: JSON.stringify({ stock }),
      headers: {
        'Content-Type': 'application/json'
      } 
    });
    let res = await response.json();
    return resolve(res);
  });
}

function chartMapping({ data, format }) {
  var dataTable = anychart.data.table(format.findIndex(x => x == "time"));
  dataTable.addData(data.reverse());

  var candlestickMapping = dataTable.mapAs({
    open: format.findIndex(x => x == "open"),
    high: format.findIndex(x => x == "high"),
    low: format.findIndex(x => x == "low"),
    close: format.findIndex(x => x == "close"),
    value: format.findIndex(x => x == "close")
  });
  
  var volumeMapping = dataTable.mapAs({
    x: format.findIndex(x => x == "time"),
    value: format.findIndex(x => x == "volume")
  });

  return { dataTable, candlestickMapping, volumeMapping }; 
}

async function loadStockChart(stock) {
  $("#loadChart").prop('disabled', true);

  let { data, format } = await getStockData(stock);
  if (data.length == 0) {
    alert("Error: No data found for this stock or rate limit exceeded. Please try again later.");
    $("#loadChart").prop('disabled', false);
    return;
  }

  let { dataTable, candlestickMapping, volumeMapping } = chartMapping({ data, format });
  currentStock = stock;

  chart?.dispose();

  chart = anychart.stock();
  anychart.theme('darkGlamour');

  var mainPlot = chart.plot(0);
  mainPlot
    .yGrid(true)
    .xGrid(true)
    .yMinorGrid(true)
    .xMinorGrid(true);

  var series = mainPlot.candlestick(candlestickMapping);
  series.name(stock.toUpperCase());
  series.legendItem().iconType('rising-falling');
  series.fallingFill("#FF0D0D");
  series.fallingStroke("#FF0D0D");
  series.risingFill("#43FF43");
  series.risingStroke("#43FF43");

  var predictMapping = predictData.mapAs({
    open: 1,
    high: 2,
    low: 3,
    close: 4,
    value: 4
  });
  var predictSeries = mainPlot.candlestick(predictMapping);
  predictSeries.tooltip().enabled(false);
  predictSeries.legendItem(false);

  //TODO Add this later
  // chart.tooltip().titleFormat(function() {
  //   return anychart.format.dateTime(this.clientX, "HH:mm dd MMMM yyyy");
  // });

  var scrollerSeries = chart.scroller().line(candlestickMapping);
  //scrollerSeries.selected().fill("#90A4AE")

  mainPlot
    .ema(dataTable.mapAs({ value: 4 }))
    .series()
    .stroke('1.5 rgb(120, 195, 230)');

  var extraYAxis = mainPlot.yAxis(1);
  extraYAxis.orientation("right");
  extraYAxis.title("Volume");

  var volumeSeries = mainPlot.column(volumeMapping);
  volumeSeries.fill("LightSteelBlue", 0.3);
  volumeSeries.name("Volume");

  var extraYScale = anychart.scales.linear();
  var maxVolume = Math.max.apply(Math, data.map(v => v[format.findIndex(x => x == "volume")]));
  extraYScale.maximum(maxVolume * 4); 
  extraYAxis.scale(extraYScale);
  volumeSeries.yScale(extraYScale);

  mainPlot.legend().titleFormat(function() {
    return anychart.format.dateTime(this.value, "HH:mm dd MMMM yyyy");
  });
       
  var indicatorPlot = chart.plot(1);
  var rsiIndicator = indicatorPlot.rsi(candlestickMapping).series();
  rsiIndicator.stroke("#ECEFF1");

  indicatorPlot.height('20%');
  indicatorPlot.yScale().minimum(0);
  indicatorPlot.yScale().maximum(100);

  var controller = indicatorPlot.annotations();

  controller.horizontalLine({
    valueAnchor: 70
  });
  controller.horizontalLine({
    valueAnchor: 30
  });

  indicatorPlot.legend().titleFormat(function() {
    return anychart.format.dateTime(this.value, "HH:mm dd MMMM yyyy");
  });

  var rangePicker = anychart.ui.rangePicker();
  rangePicker.render(chart);

  var rangeSelector = anychart.ui.rangeSelector();
  rangeSelector.render(chart);

  //chart.selectRange('2020-01-01', '2022-12-31');
  chart.title(`${stock.toUpperCase()} Stock Chart`);
  chart.container('stockChart');
  chart.draw();

  $("#loadChart").prop('disabled', false);
}

async function selectModel() {
  var model = $('#models').val();
  if (model == "Train") {

    trainChart.dispose(); 
    epochs = 0;
    dataLoss = anychart.data.set([]);
    dataMAE = anychart.data.set([]);

    loadTrainCharts();

    $("#trainModel").css({ display: "flex" });
    $("#stockChart").hide();
  } else {
    $("#trainModel").hide();
    $("#stockChart").show();
  }

  !["Train", "None"].includes(model) ? $("#predictButton").show() : $("#predictButton").hide();

  if (model !== "None") {
    let response = await fetch("http://localhost:3000/api/select_model", { 
      method: "POST",
      body: JSON.stringify({ model_name: model }),
      headers: {
        'Content-Type': 'application/json'
      } 
    });

    let res = await response.json();
  }
} 

function loadTrainCharts() {
  trainChart = anychart.line();

  lossLine = trainChart.line(dataLoss);
  lossLine.name("Loss");

  maeLine = trainChart.line(dataMAE);
  maeLine.name("MAE");

  trainChart.xScale(anychart.scales.log());
  trainChart.xScale().minimum(1);
  trainChart.xScale().maximum(dataLoss.length);
  trainChart.xAxis().title("Epochs");
  trainChart.yScale(anychart.scales.log());
  trainChart.title(`Model Output`);
  trainChart.container('lossChart');
  trainChart.legend().enabled(true);

  trainChart.draw();
}

async function train() {
  const socket = new WebSocket(progressSocketUrl);
  var totalEpochs = parseInt($("#epochs").val()); 
  var batchSize = parseInt($("#batchSize").val()); 

  $("#saveModelTable").hide();
  $("#progressContainer").show();
  $("#progressBar").css("width", "0%");
  $("#progressText").text("0%");

  toggleInputs();

  fetch("http://localhost:3000/api/train", { 
    method: "POST",
    body: JSON.stringify({ epochs: totalEpochs, batchSize }),
    headers: {
      'Content-Type': 'application/json'
    } 
  });

  socket.onmessage = e => {
    var d = JSON.parse(e.data);
    epoch += 1;

    if (maxLoss == "") maxLoss = d.loss;
    if (maxMAE == "") maxMAE = d.mae;
    
    dataLoss.append({ x: epoch, value: d.loss / maxLoss });
    dataMAE.append({ x: epoch, value: d.mae / maxMAE });
    $("#progressBar").css("width", d.epoch / totalEpochs * 100 + "%");
    $("#progressText").text(Math.round(d.epoch / totalEpochs * 10000) / 100 + "%");

    if (d.epoch == totalEpochs) {
      $("#progressContainer").hide();
      $("#saveModelTable").show();

      toggleInputs(false);
      socket.close();
    }
  } 
}

async function saveModel() {
  //TODO Add model to dropdown list after creation
  //TODO Actually add an input for model name nd see if it exists
  var modelName = $("#modelName").val();
  console.log(modelName);
  if (modelName == "") return;
  await fetch("http://localhost:3000/api/save_model", { 
    method: "POST",
    body: JSON.stringify({ model_name: modelName }),
    headers: {
      'Content-Type': 'application/json'
    } 
  });
}

async function predict() {
  var stock = currentStock;
  var response = await fetch("http://localhost:3000/api/predict", { 
    method: "POST",
    body: JSON.stringify({ stock }),
    headers: {
      'Content-Type': 'application/json'
    } 
  });
  let res = await response.json();
  predictData.addData([[Date.now(), ...res]]);
  alert(`Next predicted close value for ${stock.toUpperCase()} is $${Math.round(res * 100) / 100}`);
}