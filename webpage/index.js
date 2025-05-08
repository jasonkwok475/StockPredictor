var default_stock = "VOO";
var models;
var dataLoss = anychart.data.set([]);
var dataMAE = anychart.data.set([]);

// https://stackoverflow.com/questions/22429744/how-to-setup-route-for-websocket-server-in-express
const socketProtocol = (window.location.protocol === 'https:' ? 'wss:' : 'ws:')
const progressSocketUrl = socketProtocol + '//' + window.location.hostname + ':3000/progress/'

// socket.onopen = () => {
//   socket.send('Here\'s some text that the server is urgently awaiting!'); 
// }

// socket.onmessage = e => {
//   console.log('Message from server:', e.data)
// }

$(document).ready(async function () {
  loadTrainCharts();
  loadModels();
  loadStockChart(default_stock);

  $("#trainModel").hide();
  $("#stockChart").show();
});

async function loadModels() {
  var response = await fetch("http://localhost:3000/api/models", { method: "GET" });
  models = await response.json();

  for (var i = 0; i < models.length; i++) {
    var item = '<option value="'+models[i]+'">'+models[i]+'</option>';
    $('#models').append(item);
    //TODO Show the model parameters on the sidebar
  }
}

async function loadStockChart(stock) {
  var response = await fetch("http://localhost:3000/api/data", { 
    method: "POST",
    body: JSON.stringify({ stock }),
    headers: {
      'Content-Type': 'application/json'
    } 
  });
  let { data, format } = await response.json();

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

  var rsiMapping = dataTable.mapAs({
    x: format.findIndex(x => x == "time"),
    value: format.findIndex(x => x == "rsi")
  });

  var chart = anychart.stock();
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
  volumeSeries.fill("LightSteelBlue", 0.3)
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

  indicatorPlot.legend().titleFormat(function() {
    return anychart.format.dateTime(this.value, "HH:mm dd MMMM yyyy");
  });

  //chart.selectRange('2020-01-01', '2022-12-31');
  chart.title(`${stock.toUpperCase()} Stock Chart`);
  chart.container('stockChart');
  chart.draw();
}

function selectModel() {
  var model = $('#models').val();
  if (model == "Train") {
    $("#trainModel").css({ display: "flex" });
    $("#stockChart").hide();
  } else {
    $("#trainModel").hide();
    $("#stockChart").show();

  }
} 

function loadTrainCharts() {
  var lossChart = anychart.line(dataLoss);
  lossChart.xScale(anychart.scales.log());
  lossChart.xScale().minimum(1);
  lossChart.xScale().maximum(dataLoss.length);
  lossChart.xAxis().title("Epochs");
  lossChart.yScale(anychart.scales.log());
  lossChart.title(`Model Loss`);
  lossChart.container('lossChart');
  lossChart.draw();
  
  var maeChart = anychart.line(dataMAE);
  maeChart.xScale(anychart.scales.log());
  maeChart.xScale().minimum(1);
  maeChart.xScale().maximum(dataMAE.length);
  maeChart.xAxis().title("Epochs");
  maeChart.yScale(anychart.scales.log());
  maeChart.title(`Model MAE`);
  maeChart.container('maeChart');
  maeChart.draw();
}

async function train() {
  const socket = new WebSocket(progressSocketUrl);
  var totalEpochs = 100;

  $("#progressContainer").show();
  $("#progressBar").css("width", "0%");
  $("#progressText").text("0%");
  $("#trainButton").prop('disabled', true);

  fetch("http://localhost:3000/api/train", { 
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    } 
  });

  socket.onmessage = e => {
    var d = JSON.parse(e.data);
    dataLoss.append({ x: d.epoch, value: d.loss });
    dataMAE.append({ x: d.epoch, value: d.mae });
    $("#progressBar").css("width", d.epoch / totalEpochs * 100 + "%");
    $("#progressText").text(Math.round(d.epoch / totalEpochs * 10000) / 100 + "%");
  
    if (d.epoch == totalEpochs) {
      $("#progressContainer").hide();
      $("#trainButton").prop('disabled', false);
      socket.close();
    }
  } 
}