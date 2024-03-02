---
toc: false
theme: "cotton"
---

```js
import * as duckdb from "npm:@duckdb/duckdb-wasm";

const db = DuckDBClient.of({ 
    wars: FileAttachment("./data/us_wars.parquet"),
    key_words: FileAttachment("./data/pol_sci_freq.parquet")
    })
```

# Timeseries

```js
let sel_war = view(Inputs.select(distinct_wars.map(d=>d.event), {
    multiple:true, label: "Select one", value: ["World War II","Vietnam War"]
    }))
```

```js
let distinct_wars = db.query("SELECT Event FROM wars GROUP BY Event")
```

```js
let wars = db.query(`SELECT Date, Event, value FROM wars WHERE event in ${"("+sel_war.map(x => `'${x}'`).join(", ")+")"}`)
```

```js
let dat_keywords = db.query("SELECT * FROM key_words")
```

```js
Inputs.table(wars)
```

```js
Plot.plot({
  width: 1000, 
  height: 350,
  marginLeft: 50,
  marginRight: 50,
  marginTop: 50,
  facet: {data: dat_keywords, x: "keyword"},
  fx: { label: null },
  y: {grid: true, percent: true},
  marks: [
    Plot.areaY(wars, {
        x: "Date", y: max_val, fill: "event",
      }),
    // Plot.tip(["Kosovo War"], {
    //     x: new Date("1998-05-01"),
    //     y: max_val,
    //     anchor: "bottom",
    //   }),
    Plot.tip(["Vietnam War"], {
        x: new Date(wars.map(d=>d.Date)[wars.length/2]),
        y: max_val,
        anchor: "bottom",
      }),
    Plot.lineY(dat_keywords, Plot.windowY(
        {k: 5, reduce: "median"}, {x: "year", y: "freq", stroke: "ror"})
        ),
    // Plot.text(dat_keywords, Plot.selectLast(
    //     {x: "year", y: "freq", z: "ror", text: "ror", textAnchor: "start", dx: 3}
    //     )),
    Plot.frame()
  ]
})
```

```js
let max_val = d3.max(dat_keywords, d=>d.freq)
```
