var default_stock = "VOO";
var models;

$(document).ready(async function () {
  loadModels();
  loadStockChart(default_stock);
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
    close: format.findIndex(x => x == "close")
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

  var rangePicker = anychart.ui.rangePicker();
  rangePicker.render(chart);
  var rangeSelector = anychart.ui.rangeSelector();
  rangeSelector.render(chart);

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

       
  var indicatorPlot = chart.plot(1);
  var macdIndicator = indicatorPlot.rsi(candlestickMapping);
  // macdIndicator.histogramSeries('area');
  // macdIndicator.histogramSeries().normal().fill('green .3').stroke('green');
  // macdIndicator.histogramSeries().normal().negativeFill('red .3').negativeStroke('red');
  indicatorPlot.height('20%');
  indicatorPlot.yScale().minimum(0);
  indicatorPlot.yScale().maximum(100);

  //chart.selectRange('2020-01-01', '2022-12-31');
  chart.title(`${stock.toUpperCase()} Stock Chart`);
  chart.container('stockChart');
  chart.draw();
}