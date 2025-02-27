// Load CSV file and preprocess data
d3.csv("data/national_health_data_2024.csv").then(function(data) {
    
    // Convert numeric columns and filter out invalid values
    const numericalColumns = [
        "air_quality", "poverty_perc", "percent_inactive", "percent_smoking",
        "elderly_percentage", "percent_high_blood_pressure", "percent_coronary_heart_disease",
        "percent_stroke", "percent_high_cholesterol"
    ];
    
    data.forEach(d => {
        numericalColumns.forEach(col => d[col] = +d[col]);  // Convert to number
    });

    // Filter out rows where any numerical column has a value of -1 or NaN
    data = data.filter(d => 
        !numericalColumns.some(col => isNaN(d[col]) || d[col] === -1)
    );

    // Populate dropdowns with numerical columns
    const dropdowns = ["#x-axis", "#y-axis"];
    dropdowns.forEach(id => {
        const dropdown = d3.select(id);
        numericalColumns.forEach(col => {
            dropdown.append("option").attr("value", col).text(getLabel(col));
        });
    });

    // Set default selections and initialize visualizations
    let xAttr = "percent_inactive";
    let yAttr = "percent_high_cholesterol";

    createScatterPlot(data, xAttr, yAttr);
    createBarChart(data, yAttr);

    d3.select("#x-axis").on("change", function() {
        xAttr = this.value;
        updateVisuals(data, xAttr, yAttr);
    });

    d3.select("#y-axis").on("change", function() {
        yAttr = this.value;
        updateVisuals(data, xAttr, yAttr);
    });

});

// function to update both visualizations
function updateVisuals(data, xAttr, yAttr) {
    createScatterPlot(data, xAttr, yAttr);
    createBarChart(data, yAttr);
}

// scatter plot function
function createScatterPlot(data, xAttr, yAttr) {
    d3.select("#scatterplot").selectAll("*").remove();

    let margin = {top: 50, right: 50, bottom: 80, left: 100}, 
        width = 500 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    let svg = d3.select("#scatterplot")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    let g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    let x = d3.scaleLinear()
        .domain([d3.min(data, d => d[xAttr]) * 0.95, d3.max(data, d => d[xAttr]) * 1.05])
        .range([0, width]);

    let y = d3.scaleLinear()
        .domain([d3.min(data, d => d[yAttr]) * 0.95, d3.max(data, d => d[yAttr]) * 1.05])
        .range([height, 0]);

    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    g.append("g").call(d3.axisLeft(y));

    // Tooltip div
    const tooltip = d3.select("body").append("div")
        .attr("id", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "#fff")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("visibility", "hidden");

    g.selectAll(".dot")
        .data(data)
        .enter().append("circle")
        .attr("cx", d => x(d[xAttr]))
        .attr("cy", d => y(d[yAttr]))
        .attr("r", 3)
        .attr("fill", "steelblue")
        .attr("opacity", 0.7)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("r", 5).attr("stroke", "black"); // Highlight the dot
            
            // Show the tooltip with county name, and x, y values
            tooltip.style("visibility", "visible")
                .html(`${d.display_name}<br><strong>${getLabel(xAttr)}:</strong> ${d[xAttr]}<br><strong>${getLabel(yAttr)}:</strong> ${d[yAttr]}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 35) + "px");
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 35) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 3).attr("stroke", "none"); // Reset the dot
            tooltip.style("visibility", "hidden");
        });

    g.append("text")
        .attr("x", width / 2)
        .attr("y", height + 50)
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .text(getLabel(xAttr));

    g.append("text")
        .attr("x", -height / 2)
        .attr("y", -60)
        .attr("transform", "rotate(-90)")
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .text(getLabel(yAttr));
}

//  bar chart function
function createBarChart(data, yAttr) {
    d3.select("#barchart").selectAll("*").remove();

    let margin = {top: 50, right: 30, bottom: 80, left: 100},
        width = 500 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    data.sort((a, b) => d3.ascending(a[yAttr], b[yAttr]));

    let svg = d3.select("#barchart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    let g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // X-axis: 
    let x = d3.scaleBand()
        .domain(data.map(d => d.display_name))
        .range([0, width])
        .padding(0.2);

    // Y-axis: 
    let y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[yAttr])])
        .range([height, 0]);

    // Tooltip div
    const tooltip = d3.select("body").append("div")
        .attr("id", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "#fff")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("visibility", "hidden");

    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(() => "")); 

    g.append("g").call(d3.axisLeft(y));

    g.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("x", d => x(d.display_name))
        .attr("y", d => y(d[yAttr]))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d[yAttr]))
        .attr("fill", "orange")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("fill", "darkorange"); 
            // Show the tooltip with county name and y-axis value
            tooltip.style("visibility", "visible")
                .html(`${d.display_name}<br><strong>${getLabel(yAttr)}:</strong> ${d[yAttr]}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 35) + "px");
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 35) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("fill", "orange"); 
            tooltip.style("visibility", "hidden");
        });

    // X-axis label (Only "Counties")
    g.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Counties");

    // Y-axis label (Dynamic based on selected attribute)
    g.append("text")
        .attr("x", -height / 2)
        .attr("y", -60)
        .attr("transform", "rotate(-90)")
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .text(getLabel(yAttr));
}

// Function to get readable labels
function getLabel(attribute) {
    return attribute.replace(/_/g, " ").toUpperCase();
}
