---
theme: "cotton"
toc: false
title: Allotaxonometer
---

```js
import { diamond, rank_turbulence_divergence, mixedElems, sum } from 'https://cdn.skypack.dev/allotaxonometer@1.1.4?min'
import { DiamondChart } from "./components/allotax.js";
import { DivergingBarChartWordShift } from "./components/bar-chart-diverging-wordshift.js";
import { DivergingBarChartBalance } from "./components/bar-chart-diverging-balance.js";
import { myLegend } from "./components/legend-diamond-plot.js";
```

# Allotax


```js
let alpha = view(Inputs.range([0, alphas.length-1], {step: 1, label: "α", format: x => alphas[x]}))
```
```js
let zero = tex`\propto \sum_\tau \Big|\ln \frac{r_{\tau,1}}{r_{\tau,2}}\Big| `
let infinity = tex`\propto \sum_\tau (1 - \delta_{r_{\tau,1}, r_{\tau,2}}) \times\max\Big\{\frac{1}{r_{\tau,1}},\frac{1}{r_{\tau,2}} \Big\} `
let not_zero = tex`\propto \sum_\tau \Big| \frac{1}{r_{\tau,1}^{ ${ alphas[alpha] }} } - \frac{1}{r_{\tau,2}^{ ${ alphas[alpha] }}} \Big| `
```

```js
html`
    <div style="display:flex; align-items:center; gap: 10em; margin-left: -75px; justify-content: center; width: 100%; text-align: center; font-size: 22px; ">
      <div>${ tex`\Omega_1` }: ${ elem_names[form[0][0]] }</div> 
      <div>${ tex`\Omega_2` }: ${ elem_names[form[1][0]] }</div>  
    </div>
    <div style="opacity: 0.5;"">
      <div>${ tex`D_{${ alphas[alpha] === Infinity ? 
              "∞" : 
              alphas[alpha] }}^R(\Omega_1 || \Omega_2) = ${ sum(dat.deltas.map(d => +d)).toFixed(3) }` } </div> 
      <div>&nbsp&nbsp&nbsp&nbsp${ alphas[alpha] === Infinity ? infinity : alphas[alpha] === 0 ? zero : not_zero  }  </div>
    </div>
    <div style="display:flex; gap: 18em; ">
      <div>${ plot_diamond() }</div>
      <div>${ plot_word_shift() }</div>
    </div>
    <div style="display:flex; align-items:center; justify-content: space-around; margin:90px; margin-top:-150px; margin-right:500px;">
      <div>${ plot_legend() }</div>
      <div>${ plot_balance() }</div>
    </div>
`
```

```js
let form = view(Inputs.form(
  [
    Inputs.select(d3.range(elem_names.length), {label: "System 1", multiple: true, multiple: 3, value: [0], format: x => elem_names[x]}),
    Inputs.select(d3.range(elem_names.length), {label: "System 2", multiple: true, multiple: 3, value: [1], format: x => elem_names[x]}),
  ],
  {
    template: (inputs) => htl.html`<div style="display: flex; gap: 4em">
  <br>${inputs}
</div>`
  }
))
```

<!-- APPENDIX -->

```js
import * as duckdb from "npm:@duckdb/duckdb-wasm";
const db = DuckDBClient.of({ elem: FileAttachment("./data/allotax.parquet") })
```

```js
let elem_names = pdf_ids_db.map(d => d.pdf_id)
```

```js
let pdf_ids_db = db.query(`SELECT DISTINCT(pdf_id) as pdf_id FROM elem`)
```

```js
const elems1 = db.query(`
    SELECT * 
    FROM elem 
    WHERE pdf_id = '${elem_names[form[0][0]]}'
`)

const elems2 = db.query(`
    SELECT * 
    FROM elem 
    WHERE pdf_id = '${elem_names[form[1][0]]}'
`)
```

```js
let me_class = new mixedElems(elems1, elems2)
```

```js
let me = me_class.combElems()
```

```js
let rtd = rank_turbulence_divergence(me, alphas[alpha])
```

```js
let alphas = d3.range(0,18).map(v => +(v/12).toFixed(2)).concat([1, 2, 5, Infinity])
```

```js
let dat = diamond(me, rtd)
```

```js
let diamond_dat = dat.counts
```

```js
let diamond_dat_f = diamond_dat.filter(d => d.types !== "")
```

```js
const max_shift = d3.max(wordshift_dat(), d => Math.abs(d.metric))
```


<!-- PLOTS -->

```js
function plot_word_shift() {
    return DivergingBarChartWordShift(wordshift_dat().slice(0, 30), {
        x: d => d.metric,
        y: d => d.type,
        xFormat: "%",
        xDomain: [-max_shift*1.5, max_shift*1.5], // [xmin, xmax]
        width: 300,
        yPadding: 0.2,
        height: 640,
        xLabel: "← System 1 · Divergence contribution · System 2 →",
        colors: ["lightgrey", "lightblue"]
})}
```


```js
function plot_diamond() {
    return DiamondChart(diamond_dat, {
    })
} 
```

```js
function plot_balance() {
    DivergingBarChartBalance(balance_dat(), {
      x: d => d.frequency,
      y: d => d.y_coord,
      xFormat: "%",
      xDomain: [-1, 1], // [xmin, xmax]
      xLabel: "",
      width: 300,
      yPadding: 0.5,
      colors: ["lightgrey", "lightblue"]
    })
} 
```

```js
function plot_legend() {
  const N_CATEGO = 20
  const ramp = d3.range(N_CATEGO).map(i => d3.rgb(d3.interpolateInferno(i / (N_CATEGO - 1))).hex())
  const color = d3.scaleOrdinal(d3.range(N_CATEGO), ramp)
  
  return myLegend(color, {
  tickSize: 0,
  marginTop:11,
  width: 370
})
}
```

<!-- DATA -->

```js
function wordshift_dat() { 
  const out = []
  for (let i=0; i < me[0]['types'].length; i++) {
    const rank_diff = me[0]['ranks'][i]-me[1]['ranks'][i]
    out.push({
      'type': `${me[0]['types'][i]} (${me[0]['ranks'][i]} ⇋ ${me[1]['ranks'][i]})` ,
      'rank_diff': rank_diff,
      'metric': rank_diff < 0 ? -dat.deltas[i] : dat.deltas[i], 
    })
  }
  
  return out.slice().sort((a, b) => d3.descending(Math.abs(a.metric), Math.abs(b.metric)))
}
```


```js
function balance_dat() {
  const setdiff = (x,y) => {
    let a = new Set(x);
    let b = new Set(y);
    return new Set(
      [...a].filter(x => !b.has(x)));
  } 
  const union = (x,y) => {
    let a = new Set(x);
    let b = new Set(y);
    return new Set([...a, ...b]);
  }
  const types_1 = me_class['elem1'].map(d => d.types)
  const types_2 = me_class['elem2'].map(d => d.types)
  
  const union_types = union(types_1, types_2)
  const tot_types = types_1.length+types_2.length

  return [ 
    { y_coord: "total count",     frequency: +(types_2.length / tot_types).toFixed(3) },
    { y_coord: "total count",     frequency: -(types_1.length / tot_types).toFixed(3) },
    { y_coord: "all names",       frequency: +(types_2.length / union_types.size).toFixed(3) },
    { y_coord: "all names",       frequency: -(types_1.length / union_types.size).toFixed(3) },
    { y_coord: "exclusive names", frequency: +(setdiff(types_2, types_1).size / types_2.length).toFixed(3) },
    { y_coord: "exclusive names", frequency: -(setdiff(types_1, types_2).size / types_1.length).toFixed(3) } 
  ]
}
```

```js
let title1 = elem_names[1]
let title2 = elem_names[2]
```