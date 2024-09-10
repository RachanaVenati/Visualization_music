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

    // Prepare the data: Aggregate by Nationality, summing Points (Total) and finding the top-rated song and artist
    const countryData = d3.rollup(
        spotifyData,
        v => {
            return {
                totalPoints: d3.sum(v, d => +d['Points (Total)']),  // Summing 'Points (Total)'
                topSong: d3.least(v, d => +d.Ranking),              // Find the top-rated song (least ranking number)
            };
        },
        d => countryNameMapping[d.Nationality] || d.Nationality // Assuming 'Nationality' contains country codes or names
    );

    const totalPoints = d3.sum([...countryData.values()], d => d.totalPoints);

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
        .translate([width / 2 - 50, height / 2]);

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
            const countryInfo = countryData.get(countryName);
            if (!countryInfo) return zeroColor;

            const percentage = countryInfo.totalPoints / totalPoints;
            return percentage > 0 ? colorScale(percentage) : zeroColor;
        })
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("stroke-width", 2);
            const countryName = d.properties.name;
            const countryInfo = countryData.get(countryName);
            if (countryInfo) {
                const contribution = countryInfo.totalPoints || 0;
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
                    .style("pointer-events", "none")
                    .html(`<strong>${countryName}</strong><br/>Percentage: ${percentage}`);
            }
        })
        .on("mousemove", function(event) {
            d3.select(".tooltip")
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 10}px`);
        })
        .on("mouseout", function() {
            d3.select(this).attr("stroke-width", 0.5);
            d3.select(".tooltip").remove();
        })
        .on("click", function(event, d) {
            const countryName = d.properties.name;
            svg.selectAll("path")
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5);
        d3.select(this)
        .attr("stroke", "red")
        .attr("stroke-width", 2);
            updateCalendarHeatmap(countryName);
            updateBoxPlot(countryName);
        })
        document.getElementById('global-data-btn').addEventListener('click', function() {
             updateGlobalCalendarHeatmap();
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

    function updateCalendarHeatmap(countryName) {
        // Filter the Spotify data for the selected country
        const countrySpecificData = spotifyData.filter(d => (countryNameMapping[d.Nationality] || d.Nationality) === countryName);

        // Update the calendar heatmap
        const selectedParameter = currentParameter;

        // Parse and group the data by date
        const parsedData = d3.group(countrySpecificData.map(d => ({
            date: d3.timeParse("%d/%m/%Y")(d.Date),
            value: +d[selectedParameter]
        })), d => d.date);

        // Calculate the average of the first 20 values for each date
        const averageData = Array.from(parsedData, ([date, values]) => {
            const first20Values = values.slice(0, 20);
            let average = d3.mean(values, v => v.value);

            average = Number.isInteger(average) ? average : parseFloat(average.toFixed(2));

            return {
                date: date,
                value: average
            };
        });

        // Create the calendar heatmap with the updated data
        const container = document.getElementById("calendar-heatmap");
        const containerWidth = container.clientWidth;

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
    }
    function updateGlobalCalendarHeatmap() {
            // Filter Spotify data globally (all countries)
            svg.selectAll("path")
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5);
            // If click is outside the map, reset to the global calendar heatmap
            selectedCountry = null;
            const globalData = spotifyData;

            // Parse and group the data by date
            const parsedData = d3.group(globalData.map(d => ({
                date: d3.timeParse("%d/%m/%Y")(d.Date),
                value: +d[currentParameter]
            })), d => d.date);

            // Calculate the average of the first 20 values for each date
            const averageData = Array.from(parsedData, ([date, values]) => {
                const first20Values = values.slice(0, 20);
                let average = d3.mean(values, v => v.value);
                average = Number.isInteger(average) ? average : parseFloat(average.toFixed(2));

                return {
                    date: date,
                    value: average
                };
            });

            // Create the global calendar heatmap
            const container = document.getElementById("calendar-heatmap");
            const containerWidth = container.clientWidth;

            const calendarHeatmap = Calendar(averageData, {
                x: d => d.date,
                y: d => d.value,
                width: containerWidth,
                cellSize: 18.5,
                weekday: "monday",
                colors: d3.interpolatePiYG
            });

            // Clear existing heatmap content
            container.innerHTML = '';

            // Append the new heatmap to the container
            container.appendChild(calendarHeatmap);
            const container_1 = d3.select("#boxplot-container");
            container_1.selectAll("*").remove();
            createBoxPlot(globalData);


        }

    function updateBoxPlot(countryName) {
        // Filter the Spotify data for the selected country
        const countrySpecificData = spotifyData.filter(d => (countryNameMapping[d.Nationality] || d.Nationality) === countryName);
        // Clear any existing content in the box plot container
        const container = d3.select("#boxplot-container");
        container.selectAll("*").remove();
        // Create the box plots with the updated data
        createBoxPlot(countrySpecificData);
    }
});
