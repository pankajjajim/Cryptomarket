// Shared market chart (dark theme, price line, volume bars, timeframe)
function formatChartPrice(p) {
  if (p >= 1e6) return (p / 1e6).toFixed(2) + 'M';
  if (p >= 1e3) return (p / 1e3).toFixed(2) + 'K';
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

function buildChartData(price, change24h, volume, timeframe) {
  var points = timeframe === '24h' ? 24 : timeframe === '1W' ? 42 : timeframe === '1M' ? 30 : 24;
  var startPrice = price / (1 + (change24h || 0) / 100);
  var range = Math.abs(price - startPrice) || price * 0.02;
  var priceVals = [];
  for (var i = 0; i <= points; i++) {
    var t = i / points;
    var trend = startPrice + (price - startPrice) * Math.pow(t, 0.6);
    var wiggle = Math.sin(t * Math.PI * 2) * range * 0.3;
    priceVals.push(trend + wiggle);
  }
  priceVals[priceVals.length - 1] = price;
  var minP = Math.min.apply(null, priceVals);
  var maxP = Math.max.apply(null, priceVals);
  var pad = (maxP - minP) * 0.05 || price * 0.01;
  var volBars = [];
  var sum = 0;
  for (var j = 0; j < 12; j++) {
    var v = 0.4 + 0.6 * Math.sin((j / 12) * Math.PI);
    volBars.push(v);
    sum += v;
  }
  volBars.forEach(function (v, idx) {
    volBars[idx] = (v / sum) * (volume || 1);
  });
  return { priceVals: priceVals, minP: minP - pad, maxP: maxP + pad, volBars: volBars };
}

function renderMarketChart(price, change24h, volume, symbol, chartTimeframe) {
  var chartW = 560,
    priceH = 200,
    volH = 56,
    totalH = priceH + volH;
  var leftPad = 48,
    rightPad = 52,
    topPad = 12,
    bottomPad = 8;
  var plotW = chartW - leftPad - rightPad,
    plotPriceH = priceH - topPad - bottomPad,
    plotVolH = volH - 4;
  var data = buildChartData(price, change24h, volume, chartTimeframe || '24h');
  var priceVals = data.priceVals,
    minP = data.minP,
    maxP = data.maxP,
    volBars = data.volBars;
  var priceRange = maxP - minP || price * 0.01;
  var maxVol = Math.max.apply(null, volBars.concat([1]));

  var pathD = priceVals
    .map(function (v, i) {
      var x = leftPad + (i / (priceVals.length - 1)) * plotW;
      var y = topPad + plotPriceH - ((v - minP) / priceRange) * plotPriceH;
      return (i === 0 ? 'M' : 'L') + x.toFixed(2) + ',' + y.toFixed(2);
    })
    .join(' ');

  var yTicks = [minP, minP + priceRange * 0.25, minP + priceRange * 0.5, minP + priceRange * 0.75, maxP];
  var timeLabels =
    chartTimeframe === '24h'
      ? ['12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM', '12 AM']
      : chartTimeframe === '1W'
        ? ['Mon', 'Wed', 'Fri', 'Sun']
        : ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
  var isPositive = (change24h || 0) >= 0;
  var lineColor = isPositive ? '#22c55e' : '#ef4444';

  var volRects = '';
  volBars.forEach(function (v, i) {
    var barW = plotW / volBars.length - 2;
    var x = leftPad + (i / volBars.length) * plotW + 1;
    var barH = Math.max(2, (v / maxVol) * plotVolH);
    var y = priceH + plotVolH - barH;
    volRects +=
      '<rect x="' +
      x.toFixed(1) +
      '" y="' +
      y.toFixed(1) +
      '" width="' +
      barW.toFixed(1) +
      '" height="' +
      barH.toFixed(1) +
      '" fill="#1e3a5f" rx="1"/>';
  });

  var gridLines = [0.25, 0.5, 0.75]
    .map(function (f) {
      var y = topPad + plotPriceH * (1 - f);
      return (
        '<line x1="' +
        leftPad +
        '" y1="' +
        y.toFixed(1) +
        '" x2="' +
        (leftPad + plotW) +
        '" y2="' +
        y.toFixed(1) +
        '" stroke="#374151" stroke-width="0.5" stroke-dasharray="4"/>'
      );
    })
    .join('');

  var yLabels = yTicks
    .map(function (p) {
      var y = topPad + plotPriceH - ((p - minP) / priceRange) * plotPriceH;
      return (
        '<text x="' +
        (leftPad + plotW + 6) +
        '" y="' +
        (y + 4) +
        '" fill="#9ca3af" font-size="10" font-family="system-ui">' +
        formatChartPrice(p) +
        '</text>'
      );
    })
    .join('');

  var currentY = topPad + plotPriceH - ((price - minP) / priceRange) * plotPriceH;
  var priceLabel =
    '<g><rect x="' +
    (leftPad + plotW - 44) +
    '" y="' +
    (currentY - 10) +
    '" width="42" height="18" rx="4" fill="' +
    lineColor +
    '" opacity="0.9"/><text x="' +
    (leftPad + plotW - 23) +
    '" y="' +
    (currentY + 2) +
    '" fill="#fff" font-size="10" font-weight="bold" text-anchor="middle">' +
    formatChartPrice(price) +
    '</text></g>';

  var xLabels = timeLabels
    .map(function (label, i) {
      var x = leftPad + ((i + 0.5) / timeLabels.length) * plotW;
      return (
        '<text x="' + x + '" y="' + (priceH + volH - 2) + '" fill="#6b7280" font-size="9" text-anchor="middle">' + label + '</text>'
      );
    })
    .join('');

  var tf = chartTimeframe || '24h';
  var tf24 = tf === '24h' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700';
  var tf1W = tf === '1W' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700';
  var tf1M = tf === '1M' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700';
  var tf1Y = tf === '1Y' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700';

  return (
    '<div class="rounded-lg overflow-hidden bg-gray-800 border border-gray-700">' +
    '<div class="flex items-center justify-between px-4 py-2 border-b border-gray-700">' +
    '<div class="flex gap-1"><span class="px-3 py-1 rounded bg-gray-700 text-white text-xs font-medium">Price</span><span class="px-3 py-1 rounded text-gray-400 text-xs font-medium hover:bg-gray-700 cursor-pointer">Mkt Cap</span></div>' +
    '<div class="flex items-center gap-1">' +
    '<span class="chart-timeframe px-2 py-1 rounded text-xs cursor-pointer ' +
    tf24 +
    '" data-tf="24h">24h</span>' +
    '<span class="chart-timeframe px-2 py-1 rounded text-xs cursor-pointer ' +
    tf1W +
    '" data-tf="1W">1W</span>' +
    '<span class="chart-timeframe px-2 py-1 rounded text-xs cursor-pointer ' +
    tf1M +
    '" data-tf="1M">1M</span>' +
    '<span class="chart-timeframe px-2 py-1 rounded text-xs cursor-pointer ' +
    tf1Y +
    '" data-tf="1Y">1Y</span>' +
    '</div></div>' +
    '<div class="p-3"><svg viewBox="0 0 ' +
    chartW +
    ' ' +
    totalH +
    '" class="w-full" style="max-height: 280px;">' +
    gridLines +
    '<path d="' +
    pathD +
    '" fill="none" stroke="' +
    lineColor +
    '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    priceLabel +
    volRects +
    yLabels +
    xLabels +
    '</svg></div></div>'
  );
}

