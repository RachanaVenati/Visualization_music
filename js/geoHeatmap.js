// Load your GeoJSON data and Spotify data
Promise.all([
    d3.json('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson'), // World map GeoJSON
    d3.dsv(";", "data/Spotify_Dataset_V3.csv") 
]).then(([geoData, spotifyData]) => {

    
    const countryNameMapping = {
        "United States": "USA",
        "United Kingdom": "England",
        // Add other mappings as necessary
    };

    // Prepare the data: Aggregate by Nationality, summing Points (Total)
    const countryData = d3.rollup(
        spotifyData,
        v => d3.sum(v, d => +d['Points (Total)']), // Summing 'Points (Total)' for each nationality
        d => countryNameMapping[d.Nationality] || d.Nationality// Assuming 'Nationality' contains country codes or names
    );
    const totalPoints = d3.sum([...countryData.values()]);

    // Set up the SVG dimensions
    const width = 960;
    const height = 600;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const zeroColor = "#f0f0f0";

    const svg = d3.select("#geo-heatmap")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Set up the map projection and path generator
    const projection = d3.geoNaturalEarth1()
        .scale(160)
        .translate([width / 2 -50 , height / 2]);

    const path = d3.geoPath().projection(projection);

    // Set up a color scale
    const colorScale = d3.scaleSequential(d3.interpolateGreens)
    .domain([0, 1]);



    // Draw the map
    svg.selectAll("path")
        .data(geoData.features)
        .join("path")
        .attr("d", path)
        .attr("fill", d => {
            const countryName = d.properties.name; // Country name from GeoJSON
            const contribution = countryData.get(countryName) || 0;
            const percentage = contribution / totalPoints;
            return percentage > 0 ? colorScale(percentage) : zeroColor;
        })
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("stroke-width", 2);
            const countryName = d.properties.name;
            const contribution = countryData.get(countryName) || 0;
            const percentage = (contribution / totalPoints * 100).toFixed(4);
            d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background-color", "white")
            .style("padding", "5px")
            .style("border", "1px solid #ccc")
            .style("border-radius", "4px")
            .style("box-shadow", "0px 0px 5px rgba(0,0,0,0.3)")
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY + 10}px`)
            .style("pointer-events", "none") // Ensure the tooltip doesn’t block mouse events
            .html(`<strong>${countryName}</strong><br/>Percentage: ${percentage}`);
        })
        .on("mousemove", function(event) {
            d3.select(".tooltip")
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 10}px`);
        })
        .on("mouseout", function() {
            d3.select(this).attr("stroke-width", 0.5);
            d3.select(".tooltip").remove();
        });

// Create a vertical legend for the color scale
const legendHeight = 300;
const legendWidth = 10;
const legendOffsetX = 30;

// Define the gradient for the legend
const defs = svg.append("defs");
const linearGradient = defs.append("linearGradient")
    .attr("id", "linear-gradient")
    .attr("x1", "0%")
    .attr("y1", "100%")
    .attr("x2", "0%")
    .attr("y2", "0%");

// Define the gradient stops with finer increments for 0.1 differences
const numStops = 10; // 0.1 increments from 0 to 1
const stops = d3.range(0, 1 + 1e-9, 1 / numStops); // Range from 0 to 1 in 0.1 increments

linearGradient.selectAll("stop")
    .data(stops)
    .join("stop")
    .attr("offset", d => `${(d * 100).toFixed(1)}%`)
    .attr("stop-color", d => colorScale(d));

// Draw the legend rectangle
svg.append("rect")
    .attr("x", width - legendWidth - 70)
    .attr("y", height / 2 - legendHeight / 2)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#linear-gradient)");

// Add legend text with smaller tick marks for 0.1 increments
const legendScale = d3.scaleLinear()
    .domain([0, 100]) // Percentages from 0% to 100%
    .range([legendHeight, 0]);

const legendAxis = d3.axisRight(legendScale)
    .ticks(10) // Tick marks for every 10%
    .tickFormat(d => `${d}%`);

svg.append("g")
    .attr("transform", `translate(${width - legendWidth - 60}, ${height / 2 - legendHeight / 2})`)
    .call(legendAxis);

});
