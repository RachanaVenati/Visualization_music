let globalData; // To store the parsed data
let currentParameter = "Valence"; // To track the current parameter displayed
window.currentParameter;
// Load the data once and store it globally
d3.dsv(";", "data/Spotify_Dataset_V3.csv").then(data => {
  globalData = data;
  createBoxPlot(globalData); // Initialize the box plot
  updateHeatmap(currentParameter); // Initialize heatmap with default parameter
});

// Function to create the box plots
function createBoxPlot(data) {
  const parameters = ["Valence", "Danceability", "Energy", "Loudness"];
  const container = d3.select("#boxplot-container");
  const width = 125, height = 200, margin = { top: 5, right: 5, bottom: 25, left: 60 };

  const tooltip = d3.select("body").append("div")
  .attr("class", "boxplot-tooltip")
  .style("position", "absolute")
  .style("background-color", "white")
  .style("border", "1px solid black")
  .style("padding", "5px")
  .style("border-radius", "5px")
  .style("pointer-events", "none")
  .style("opacity", 0);

  parameters.forEach(parameter => {
    const svg = container.append("svg")
      .attr("class", "boxplot")
      .attr("width", width)
      .attr("height", height)
      .style("margin-right", "5px")
      .style("cursor", "pointer")
      .on("click", () => handleBoxPlotClick(parameter)); // Attach click event listener

    const parameterData = data.map(d => +d[parameter]);
    const stats = d3.boxplotSummary(parameterData);

    const x = d3.scaleBand().domain([parameter]).range([margin.left, width - margin.right]).padding(0.1);
    const y = d3.scaleLinear().domain(d3.extent(parameterData)).nice().range([height - margin.bottom, margin.top]);

    // Axes
    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x));
    svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));

    // Draw the box plot elements
    const box = svg.append("rect")
      .attr("x", x(parameter))
      .attr("y", y(stats.q3))
      .attr("height", y(stats.q1) - y(stats.q3))
      .attr("width", x.bandwidth())
      .attr("fill", "green")
      .attr("class", `box-plot-${parameter}`)
      .on("mouseover", function(event) {
        tooltip.transition().style("opacity", 1);
        tooltip.html(
          `<strong>${parameter}</strong><br>
           Min: ${stats.min.toFixed(2)}<br>
           Q1: ${stats.q1.toFixed(2)}<br>
           Median: ${stats.median.toFixed(2)}<br>
           Q3: ${stats.q3.toFixed(2)}<br>
           Max: ${stats.max.toFixed(2)}`
        )
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
      })
      .on("mousemove", function(event) {
        tooltip.style("left", (event.pageX + 10) + "px")
               .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        tooltip.transition().style("opacity", 0);
      });

    svg.append("line")
      .attr("x1", x(parameter))
      .attr("x2", x(parameter) + x.bandwidth())
      .attr("y1", y(stats.median))
      .attr("y2", y(stats.median))
      .attr("stroke", "black");

    //add whiskers
    svg.selectAll(".whisker")
      .data([stats.min, stats.max])
      .enter().append("line")
      .attr("x1", x(parameter) + x.bandwidth() / 2)
      .attr("x2", x(parameter) + x.bandwidth() / 2)
      .attr("y1", d => y(d))
      .attr("y2", d => d === stats.min ? y(stats.q3) : y(stats.q1))
      .attr("stroke", "black");

    // Add small horizontal lines at the ends of the whiskers
    svg.selectAll(".whisker-end")
      .data([stats.min, stats.max])
      .enter().append("line")
      .attr("x1", x(parameter) + x.bandwidth() / 4)
      .attr("x2", x(parameter) + (3 * x.bandwidth()) / 4)
      .attr("y1", d => y(d))
      .attr("y2", d => y(d))
      .attr("stroke", "black");

    // Highlight border for the default parameter
    if (parameter === currentParameter) {
      highlightBoxPlot(parameter);
    }
  });
  if(container.select("boxplot-legend").empty()){
      createBoxPlotLegend(container);
  }

}



function createBoxPlotLegend(container) {
  const legendWidth = 100, legendHeight = 200;
  const legendSvg = container.append("svg")
    .attr("class", "boxplot-legend") // Add class for styling
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("margin-left", "10px") // Margin to separate from boxplots
    .style("border", "1px solid #ddd"); // Border for visual debugging

  // Sample boxplot representation in the legend
  const legendMargin = { top: 25, right: 5, bottom: 25, left: 20 };
  const centerX = (legendWidth - legendMargin.left - legendMargin.right) / 2 + legendMargin.left;
  const sampleY = d3.scaleLinear().domain([0, 100]).range([legendHeight - legendMargin.bottom, legendMargin.top]);

  // Draw the sample box
  legendSvg.append("rect")
    .attr("x", centerX - 20)
    .attr("y", sampleY(75)) // Q3 position
    .attr("width", 40)
    .attr("height", sampleY(25) - sampleY(75)) // Q1 - Q3 height
    .attr("fill", "green");

  // Draw median line
  legendSvg.append("line")
    .attr("x1", centerX - 20)
    .attr("x2", centerX + 20)
    .attr("y1", sampleY(50)) // Median position
    .attr("y2", sampleY(50))
    .attr("stroke", "black");

  // Draw whiskers
  legendSvg.append("line")
    .attr("x1", centerX)
    .attr("x2", centerX)
    .attr("y1", sampleY(0)) // Min
    .attr("y2", sampleY(100)) // Max
    .attr("stroke", "black");

  // Draw whisker ends
  legendSvg.append("line")
    .attr("x1", centerX - 10)
    .attr("x2", centerX + 10)
    .attr("y1", sampleY(0)) // Min line
    .attr("y2", sampleY(0))
    .attr("stroke", "black");

  legendSvg.append("line")
    .attr("x1", centerX - 10)
    .attr("x2", centerX + 10)
    .attr("y1", sampleY(100)) // Max line
    .attr("y2", sampleY(100))
    .attr("stroke", "black");

  // Add labels
  legendSvg.append("text")
    .attr("x", centerX + 25)
    .attr("y", sampleY(50))
    .attr("dy", "0.35em")
    .style("font-size", "12px")
    .text("Median");

  legendSvg.append("text")
    .attr("x", centerX + 25)
    .attr("y", sampleY(75))
    .attr("dy", "0.35em")
    .style("font-size", "12px")
    .text("Q3 (75th Percentile)");

  legendSvg.append("text")
    .attr("x", centerX + 25)
    .attr("y", sampleY(25))
    .attr("dy", "0.35em")
    .style("font-size", "12px")
    .text("Q1 (25th Percentile)");

  legendSvg.append("text")
    .attr("x", centerX + 25)
    .attr("y", sampleY(100))
    .attr("dy", "0.35em")
    .style("font-size", "12px")
    .text("Max");

  legendSvg.append("text")
    .attr("x", centerX + 25)
    .attr("y", sampleY(0))
    .attr("dy", "0.35em")
    .style("font-size", "12px")
    .text("Min");
}


function handleBoxPlotClick(parameter) {
  currentParameter = parameter; // Update global parameter
  updateHeatmap(parameter); // Redraw heatmap based on new parameter
  highlightBoxPlot(parameter); // Highlight the selected box plot
}

// Function to highlight the selected box plot
function highlightBoxPlot(parameter) {
  // Reset all box plot borders
  d3.selectAll(".boxplot rect").style("stroke", "none");

  // Highlight the selected box plot
  d3.select(`.box-plot-${parameter}`).style("stroke", "black").style("stroke-width", 2);
}

// Function to compute summary statistics for the box plot
d3.boxplotSummary = function (data) {
  const sorted = data.sort(d3.ascending);
  return {
    q1: d3.quantile(sorted, 0.25),
    median: d3.quantile(sorted, 0.5),
    q3: d3.quantile(sorted, 0.75),
    min: sorted[0],
    max: sorted[sorted.length - 1]
  };
};

// Function to update the calendar heatmap
function updateHeatmap(parameter = currentParameter) {
  const container = document.getElementById("calendar-heatmap");
  const containerWidth = container.clientWidth;

  // Process data only for the selected parameter
  const parsedData = d3.group(globalData.map(d => ({
    date: d3.timeParse("%d/%m/%Y")(d.Date),
    value: +d[parameter]
  })), d => d.date);

  const averageData = Array.from(parsedData, ([date, values]) => {
    const first20Values = values.slice(0, 20);
    let averageFirst20 = d3.mean(first20Values, v => v.value);
    averageFirst20 = Number.isInteger(averageFirst20) ? averageFirst20 : parseFloat(averageFirst20.toFixed(2));
    return { date, value: averageFirst20 };
  });

  const calendarHeatmap = Calendar(averageData, {
    x: d => d.date,
    y: d => d.value,
    width: containerWidth,
    cellSize: 18.5,
    weekday: "monday",
    colors: d3.interpolatePiYG
  });

  container.innerHTML = ''; // Clear existing content
  container.appendChild(calendarHeatmap); // Append new heatmap
}

// Add this function to handle updates based on selected country
function updateCalendarHeatmap(countryName) {
  const container = document.getElementById("calendar-heatmap");
  const containerWidth = container.clientWidth;

  // Filter global data based on the selected country
  const filteredData = globalData.filter(d => {
      // Assume the country information is stored in a 'Country' field
      return d.Country === countryName;
  });

  // Process the filtered data
  const parsedData = d3.group(filteredData.map(d => ({
      date: d3.timeParse("%d/%m/%Y")(d.Date),
      value: +d[currentParameter]
  })), d => d.date);

  const averageData = Array.from(parsedData, ([date, values]) => {
      const first20Values = values.slice(0, 20);
      let averageFirst20 = d3.mean(first20Values, v => v.value);
      averageFirst20 = Number.isInteger(averageFirst20) ? averageFirst20 : parseFloat(averageFirst20.toFixed(2));
      return { date, value: averageFirst20 };
  });

  const calendarHeatmap = Calendar(averageData, {
      x: d => d.date,
      y: d => d.value,
      width: containerWidth,
      cellSize: 18.5,
      weekday: "monday",
      colors: d3.interpolatePiYG
  });

  container.innerHTML = ''; // Clear existing content
  container.appendChild(calendarHeatmap); // Append new heatmap
}
window.updateCalendarHeatmap = updateCalendarHeatmap;

// Calendar Heatmap function
function Calendar(data, {
  x = ([x]) => x, // given d in data, returns the (temporal) x-value
  y = ([, y]) => y, // given d in data, returns the (quantitative) y-value
  title, // given d in data, returns the title text
  width = 960 - margin.left - margin.right, // width of the chart, in pixels
  cellSize = 17, // width and height of an individual day, in pixels
  margin = { top: 20, right: 30, bottom: 30, left: 30 },
  weekday = "monday", // either: weekday, sunday, or monday
  formatDay = i => "SMTWTFS"[i], // given a day number in [0, 6], the day-of-week label
  formatMonth = "%b", // format specifier string for months (above the chart)
  yFormat, // format specifier string for values (in the title)
  color = d3.interpolatePiYG
} = {}) {
  const X = d3.map(data, x);
  const Y = d3.map(data, y);
  const I = d3.range(X.length);

  const countDay = weekday === "sunday" ? i => i : i => (i + 6) % 7;
  const timeWeek = weekday === "sunday" ? d3.timeSunday : d3.timeMonday;
  const weekDays = weekday === "weekday" ? 5 : 7;
  const height = cellSize * (weekDays + 2) + margin.top + margin.bottom; // Adjusted height


  const max = d3.max(Y); // Find the maximum value
  const min = d3.min(Y);
  color = d3.scaleSequential()
  .domain([min, max]) // Set the domain from minimum to maximum
  .interpolator(d3.interpolateGreens); 
  formatMonth = d3.timeFormat(formatMonth);

  if (title === undefined) {
    const formatDate = d3.timeFormat("%B %-d, %Y");
    const formatValue = v => Number.isInteger(v) ? v : parseFloat(v.toFixed(2)); // Format value
    
    title = i => `${formatDate(X[i])}\n${formatValue(Y[i])}`; // Use the formatted value
  } else if (title !== null) {
    const T = d3.map(data, title);
    title = i => T[i];
  }
  

  const years = d3.groups(I, i => {
    const date = X[i];
    const year = date.getFullYear();
    return year;
  });


  function pathMonth(t) {
    const d = Math.max(0, Math.min(weekDays, countDay(t.getDay())));
    const w = timeWeek.count(d3.timeYear(t), t);
    return `${d === 0 ? `M${w * cellSize},0`
        : d === weekDays ? `M${(w + 1) * cellSize},0`
        : `M${(w + 1) * cellSize},0V${d * cellSize}H${w * cellSize}`}V${weekDays * cellSize}`;
  }
  

  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height * years.length)
    .attr("viewBox", [0, 0, width, height * years.length])
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
    .attr("font-family", "sans-serif")
    .attr("transform", `translate(${margin.left},${margin.top})`)
    .attr("font-size", 10);

  const year = svg.selectAll("g")
    .data(years)
    .join("g")
      .attr("transform", (d, i) => `translate(40.5,${height * i + cellSize * 1.5})`);

  year.append("text")
    .attr("x", -5)
    .attr("y", -5)
    .attr("font-weight", "bold")
    .attr("text-anchor", "end")
    .text(([key]) => key);

  year.append("g")
    .attr("text-anchor", "end")
    .selectAll("text")
    .data(weekday === "weekday" ? d3.range(1, 6) : d3.range(7))
    .join("text")
      .attr("x", -5)
      .attr("y", i => (countDay(i) + 0.5) * cellSize)
      .attr("dy", "0.31em")
      .text(formatDay);

  const cell = year.append("g")
    .selectAll("rect")
    .data(weekday === "weekday"
        ? ([, I]) => I.filter(i => ![0, 6].includes(X[i].getDay()))
        : ([, I]) => I)
    .join("rect")
      .attr("width", cellSize - 1)
      .attr("height", cellSize - 1)
      .attr("x", i => timeWeek.count(d3.timeYear(X[i]), X[i]) * cellSize + 0.5)
      .attr("y", i => countDay(X[i].getDay()) * cellSize + 0.5)
      .attr("fill", i => color(Y[i]));

  if (title) cell.append("title")
    .text(title);

 year.append("g")
    .selectAll("path")
    .data(([key, I]) =>{const monthDates=d3.timeMonths(d3.min(I,i=>X[i]),d3.max(I,i=>X[i]));return monthDates.map(date=>({date}));})
    .join("path").attr("fill", "none")
    .attr("stroke", "#fff")
    .attr("stroke-width",4)
    .attr("d", d=>pathMonth(d.date))
  year.append("g")
  .selectAll("text")
  .data(([key, I]) => d3.timeMonths(d3.min(I, i => X[i]), d3.max(I, i => X[i])))
  .join("text")
  .attr("x", d => timeWeek.count(d3.timeYear(d), d3.timeMonth(d)) * cellSize + (cellSize / 2)+25)
  .attr("y", -1) 
  .attr("dy", "-0.5em")
  .attr("text-anchor", "middle")
  .attr("font-weight", "bold")
  .text(formatMonth);
// Color scale for both heatmap and legend

color = d3.scaleSequential()
  .domain([min, max])  // Same domain for both heatmap and legend
  .interpolator(d3.interpolateGreens);

// Create a group for the legend
const legendHeight = 300;  // Height of the color scale
const legendWidth = 20;    // Width of the color scale
const legendMargin = { top: 20, right: 90 }; // Positioning of legend

const legend = svg.append("g")
  .attr("transform", `translate(${width - legendMargin.right}, ${legendMargin.top})`);

// Create a linear gradient for the legend based on the heatmap color scale
const defs = svg.append("defs");
const linearGradient = defs.append("linearGradient")
  .attr("id", "linear-gradient")
  .attr("x1", "0%")
  .attr("y1", "100%") // Start at the bottom
  .attr("x2", "0%")
  .attr("y2", "0%");  // End at the top

// Use the color scale to set the gradient stops
linearGradient.append("stop")
  .attr("offset", "0%")
  .attr("stop-color", color(min));  // Color for the minimum value

linearGradient.append("stop")
  .attr("offset", "100%")
  .attr("stop-color", color(max));  // Color for the maximum value

// Draw the color scale bar
legend.append("rect")
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", legendWidth)
  .attr("height", legendHeight)
  .style("fill", "url(#linear-gradient)");

// Add a scale for the color legend, using the same domain as the heatmap color scale
// Define the scale for the legend, mapping the domain to the range (height of the legend)
const legendScale = d3.scaleLinear()
  .domain([min, max])  // Use the same domain as the heatmap color scale
  .range([legendHeight, 0]);  // Map data range to legend height

// Add a scale for the color legend and explicitly set the tick values to include min and max
const legendAxis = d3.axisRight(legendScale)
  .tickValues([min, (min + max) / 2, max])  // Set tick values to ensure min, mid, and max are displayed
  .tickSize(4)  // Size of the ticks
  .tickFormat(d3.format(".2f"));  // Format ticks with 2 decimal places

// Append the axis to the legend
legend.append("g")
  .attr("class", "axis")
  .attr("transform", `translate(${legendWidth}, 0)`)
  .call(legendAxis);


  return Object.assign(svg.node(), {scales: {color}});
}