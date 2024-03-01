import * as d3 from "npm:d3";
import { rin } from 'https://cdn.skypack.dev/allotaxonometer@1.1.4?min'




function Tooltips(g, tooltip) {
  g
    .on("mouseover", (event, d) => {
      d3.select(event.target)
        .style("stroke-width", "2px");
      tooltip.style("visibility", "visible");
      tooltip.html(d.value !== 0 ? `Top types: ${d.types.split(",").length < 50 ? 
          d3.shuffle(d.types.split(",")) :          
          [d3.shuffle(d.types.split(",").slice(0,50))].concat([" ..."])}` : null);

    })
    .on("mousemove", (event, d) => {
      tooltip
        .style("top", event.clientY - 10 + "px")
        .style("left", event.clientX + 10 + "px");
    })
    .on("mouseout", (event, d) => {
      d3.select(event.target)
        .style("stroke-width",  (d) => d.value === 0 ? 0 : 0.3);
      tooltip.style("visibility", "hidden");
    })
}


export function DiamondChart(diamond_dat, {
  visWidth = 512,
  visHeight = 512,
  canvas_mult_size = 1.02,
  ncells = 60,
  bin_size = 1.5,
  margin = ({ top: 100, left: 0, right: 140, bottom: 140 })
} = {}) {
    
  // Set up
    const buckets = d3.range(0, ncells, bin_size)
    const center_y = d3.scaleThreshold().domain(buckets).range(buckets.map(d => d-(bin_size/2)));
    
    const max_xy   = d3.max(diamond_dat, d => d.x1)          // max_x == max_y
    const max_rank = d3.max(diamond_dat, (d) => d.rank_L[1]); // max_rankL == max_rankL
    const max_val  = d3.max(diamond_dat, d => d.value)
    
    const max_rank_raw = d3.range(d3.max(diamond_dat, d=>d.x1))
    const xy  = d3.scaleBand().domain(diamond_dat.map(d=>d.x1)).range([0, visWidth])
    const xyn  = d3.scaleBand().domain(max_rank_raw).range([0, visHeight])
    const xyd = d3.scaleBand().domain(diamond_dat.map(d=>d.cos_dist)).range([0, visWidth])
    const xyc = d3.scaleBand().domain(diamond_dat.map(d=>center_y(d.coord_on_diag))).range([0, visWidth])
    const xyDomain   = [1, 10**Math.ceil(Math.max(Math.log10(max_rank)))];
  
    const xyScale    = d3.scaleLog().domain(xyDomain).range([0, visWidth])
    const xyScaleLin = d3.scaleLinear().domain([0,ncells-1]).range([0, visWidth])
    
    const color_scale = d3.scaleSequentialLog().domain([max_val, 1]).interpolator(d3.interpolateInferno)
  
    // Start plotting
    const svg = d3.create("svg")
     
    const g = svg.attr("id", "myGraph")   
      .attr('height', visHeight + margin.top + margin.bottom)
      .attr('width', visWidth)
      .attr("viewBox", [0-50, 0, visWidth + margin.top+50, visHeight])
      .append('g');
    
    // Rotate the canvas
    svg.attr('transform', `translate(${ visWidth / 2.5 }, -25) scale (-1,1) rotate(45)`);
  
    // Xaxis 
    g.append('g')
      .call(xAxis, xyScale)
      .call(xAxisLab, "Rank r", visWidth, 37) // there must be an easier way to breaklines!?!
      .call(xAxisLab, "for", visWidth, 55)
      // .call(xAxisLab, `${title(1)}`, visWidth, 73)
      .call(xAxisLab, "more →", visWidth-200, 40, .4)
      .call(xAxisLab, "frequent", visWidth-200, 60, .4)
      .call(xAxisLab, "← less", visWidth+200, 40, .4)
      .call(xAxisLab, "frequent", visWidth+200, 60, .4)
      .call(xGrid, xyScaleLin);
    
    // Yaxis 
    g.append('g')
      .call(yAxis, xyScale)
      .call(yAxisLab, "Rank r", 0, 37)
      .call(yAxisLab, "for", 0, 55)
      // .call(yAxisLab, `${title(0)}`, 0, 73)
      .call(yAxisLab, "less →", 200, 40, .4)
      .call(yAxisLab, "frequent", 200, 60, .4)
      .call(yAxisLab, "← more", -200, 40, .4)
      .call(yAxisLab, "frequent", -200, 60, .4)
      .call(yGrid, xyScaleLin);
    
    // Background polygons
    function draw_polygon(g, tri_coords, bg_color) {
       g.append("polygon")
          .attr("fill",bg_color)
          .attr("fill-opacity", 0.2)
          .attr("stroke", "black")
          .attr("stroke-width", 1)
          .attr("points", tri_coords)
     }
    
    const grey_triangle = [
      {"x":max_xy, "y":max_xy}, {"x":0, "y":0}, {"x":max_xy, "y":0}
    ].map(d => [xy(d.x)*canvas_mult_size, xy(d.y)*canvas_mult_size].join(',')).join(" ")
    
    const blue_triangle = [
      {"x":max_xy, "y":max_xy}, {"x":0, "y":0}, {"x":0, "y":max_xy}
    ].map(d => [xy(d.x)*canvas_mult_size, xy(d.y)*canvas_mult_size].join(',')).join(" ")
    
    draw_polygon(g, blue_triangle, "#89CFF0")
    draw_polygon(g, grey_triangle, "grey")
  
    // contours
    
    // svg.append("g")
    //       .attr("fill", "none")
    //       .attr("stroke", "grey")
    //       .attr("fill-opacity", 0.1)
    //     .selectAll("path")
    //     .data(contours(true))
    //     .join("path")
    //       .attr("fill", d => color_blue(d.value))
    //       .attr("d", d3.geoPath());
    
    //   svg.append("g")
    //       .attr("fill", "none")
    //       .attr("stroke", "grey")
    //       .attr("fill-opacity", 0.1)
    //     .selectAll("path")
    //     .data(contours(false))
    //     .join("path")
    //       .attr("fill", d => color_grey(d.value))
    //       .attr("d", d3.geoPath());
      
    // Heatmap
    const base_hm = svg.selectAll('rect').data(diamond_dat.filter(d => d.types !== "")).enter();
    
    const cells = base_hm
      .append('rect')
        .attr('x', (d) => xy(d.x1))
        .attr('y', (d) => xy(d.y1))
        .attr('width', xy.bandwidth())
        .attr('height', xy.bandwidth())
        .attr('fill', (d) => color_scale(d.value))
        .attr('stroke', 'black')
        .attr('stroke-width', 0.3)
    
  
      svg.selectAll('text')
      .data(diamond_dat)
      .enter()
      .append('text')
      .filter(d => rin(chosen_types(diamond_dat), d.types.split(",")).some((x) => x === true))
      .text(d => d.types.split(",")[0])
      .attr("transform", d => `
        scale(1,-1) 
        rotate(-90) 
        rotate(-45, ${xyn(d.x1)}, ${xyn(d.y1)})
        translate(${d.which_sys === "right" ? xyn(Math.sqrt(d.cos_dist))*1.5 : -xyn(Math.sqrt(d.cos_dist))*1.5}, 0)`)
        .attr("x", (d) => xyn(d.x1))
        .attr("y", (d) => Number.isInteger(d.coord_on_diag) ? xyn(d.y1) : xyn(d.y1)-1)
        .attr("dy", 20)
        .attr("font-size", 15)
        .attr("text-anchor", d => d.x1 - d.y1 <= 0 ? "start" : "end");
        // .attr("dx", d => d.x1 - d.y1 <= 0 ? 10 : -10)
  
      // Draw the middle line
      svg.append('line')
       .style("stroke", "black")
       .style("stroke-width", 1)
       .attr("x1", 0)
       .attr("y1", 0)
       .attr("x2", visWidth-7)
       .attr("y2", visHeight-7)
  
    // Add the tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("opacity", 0.9)
      .style("background", "white");
    
    cells.call(Tooltips, tooltip) // not working with labels
    // console.log(diamond_dat_f)


    function xAxis(g, scale) {
      g
      .attr("transform", `translate(0, ${visHeight*canvas_mult_size})`)
      .call(d3.axisBottom(scale))
      .call((g) => g.select(".domain").remove()) // remove baseline
      // add label
      .selectAll('text')
      .attr('dy', 10)
      .attr('dx', 13)
      .attr('transform', 'scale(-1,1) rotate(45)')
      .attr('font-size', 10)
    }
    
    function xAxisLab(g, text, dx, dy, alpha) {
      g
        .append("text")
        .attr("x", visWidth / 2)
        .attr("fill", "black")
        .attr("font-size", 14)
        .attr("opacity", alpha)
        .attr("text-anchor", 'middle')
        .text(text)
        .attr('transform', `rotate(183) scale(1,-1) translate(-${dx}, ${dy})`)
    }
    
    function xGrid(g, scale) {
      g.append('g')
        .attr("transform", `translate(0, ${-visHeight-10})`)
        .call(d3.axisBottom(scale).ticks(ncells/2).tickFormat("")) // rm tick values
        .call((g) => g.select(".domain").remove())
        .call((g) =>
          g
            .selectAll(".tick line")
            .attr("stroke", "#d3d3d3")
              .style("stroke-dasharray", ("3, 3"))
            .attr("y1", visHeight)
            .attr("y2", 0)
        )
    }
    
    function yAxis(g, scale) {
      // add axis
      g
        .call(d3.axisRight(scale))
        .call((g) => g.select(".domain").remove())
        .attr("transform", `translate(${visHeight*canvas_mult_size}, 0) scale(-1, 1)`)
        .selectAll('text')
        .attr('dx', -28) // fiddling with ticks for Left system 
        .attr('dy', 15)  // fiddling with ticks for Left system 
        .attr('transform', 'rotate(45)')
        .attr('font-size', 10)
    }
    
    function yAxisLab(g, text, dx, dy, alpha) {
      g
        .append("text")
        .attr("x", visWidth / 2)
        .attr("fill", "black")
        .attr("font-size", 14)
        .attr("opacity", alpha)
        .attr("text-anchor", 'middle')
        .text(text)
        .attr('transform', `rotate(93) translate(${dx},${dy})`)
    }
    
    function yGrid(g, scale) {
      g
        .append("g")
        .call(d3.axisRight(scale).ticks(ncells/2).tickFormat(""))
        .call((g) => g.select(".domain").remove())
        .call((g) =>
          g
            .selectAll(".tick line")
            .attr("stroke", "#d3d3d3")
            .style("stroke-dasharray", ("3, 3"))
            .attr("x1", visWidth+7)
            .attr("x2", 10)
        )
    }

    function chosen_types(diamond_dat) {
      const cummulative_bin = d3.range(0, ncells, bin_size)
      const relevant_types = []
      
      
      for (let sys of ["right", "left"]) {
        
        for (let i=1; i < cummulative_bin.length; i++) {
        
          const filtered_dat = diamond_dat.filter(d => d.value > 0 && d.which_sys == sys)
                                          .filter(d => d.coord_on_diag >= cummulative_bin[i-1] && 
                                                  d.coord_on_diag < cummulative_bin[i])
          
          
          if (filtered_dat.length > 0) {
            const cos_dists = filtered_dat.map(d => d.cos_dist)
            
            const max_dist = cos_dists.reduce((a, b) => { return Math.max(a, b) })
            const max_dist_idx = cos_dists.indexOf(max_dist)
            const name = d3.shuffle(filtered_dat[max_dist_idx]['types'].split(","))[0]        
            relevant_types.push(name)
          }
      }
      }
      return relevant_types
    }    

    return svg.node()

}