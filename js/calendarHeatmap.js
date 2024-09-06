// Function to initialize and update the calendar heatmap
function updateHeatmap() {
  // Get the selected parameter from the dropdown
  const selectedParameter = document.getElementById("parameter-select").value;

  // Parse the CSV data and create the heatmap
  d3.dsv(";", "data/Spotify_Dataset_V3.csv").then(data => {
    const container = document.getElementById("calendar-heatmap");
    const containerWidth = container.clientWidth;

    // Parse and group the data by date
    const parsedData = d3.group(data.map(d => ({
        date: d3.timeParse("%d/%m/%Y")(d.Date),
        value: +d[selectedParameter]
    })), d => d.date); //CHECK WHAT IS HAPPENING WITH THE 01/01 

    // Calculate the average of the first 20 values for each date
    const averageData = Array.from(parsedData, ([date, values]) => {
      const first20Values = values.slice(0, 20);
      let averageFirst20 = d3.mean(first20Values, v => v.value); // Use 'let' instead of 'const'
    
      // Check if the averageFirst20 is an integer, if not, format it to 2 decimal places
      averageFirst20 = Number.isInteger(averageFirst20) ? averageFirst20 : parseFloat(averageFirst20.toFixed(2));
    
      return {
        date: date,
        value: averageFirst20
      };
    });
    

    // Create the calendar heatmap with the updated data
    const calendarHeatmap = Calendar(averageData, {
      x: d => d.date,
      y: d => d.value,
      width: containerWidth,
      cellSize: 18.5,
      weekday: "monday",
      colors: d3.interpolatePiYG
    });

    // Clear any existing content in the heatmap container
    container.innerHTML = '';

    // Append the new heatmap to the container
    container.appendChild(calendarHeatmap);
  });
}

// Add event listener to the dropdown to update the heatmap on selection change
document.getElementById("parameter-select").addEventListener("change", updateHeatmap);

// Initial call to render the heatmap with default parameter
updateHeatmap();

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