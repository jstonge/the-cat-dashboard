---
toc: false
---

<style>

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: var(--sans-serif);
  margin: 4rem 0 8rem;
  text-wrap: balance;
  text-align: center;
}

.hero h1 {
  margin: 2rem 0;
  max-width: none;
  font-size: 14vw;
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(30deg, var(--theme-foreground-focus), currentColor);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero h2 {
  margin: 0;
  max-width: 34em;
  font-size: 20px;
  font-style: initial;
  font-weight: 500;
  line-height: 1.5;
  color: var(--theme-foreground-muted);
}

@media (min-width: 640px) {
  .hero h1 {
    font-size: 90px;
  }
}

</style>

```js
import * as duckdb from "npm:@duckdb/duckdb-wasm";

const db = DuckDBClient.of({ 
    count_inst: FileAttachment("./data/count_inst.parquet"),
    png_v_pdf: FileAttachment("./data/pdf_pages_v_png_count.parquet"),
    failed_test: FileAttachment("./data/missing_tot_pages.parquet"),
    })
```

# The-CAT-DB
## The state of the catDB

```js
const dat = db.query(`SELECT * FROM count_inst`)
const dat2 = db.query(`SELECT * FROM png_v_pdf`)
const dat_test = db.query(`SELECT * FROM failed_test`)
const uniq_ror = db.query(`SELECT DISTINCT(ror) FROM png_v_pdf ORDER BY ror`)
const min_years = db.query(`SELECT MIN(year_1) as min_yr, ror FROM png_v_pdf GROUP BY ror`)
```

```js
let out = {};
min_years.forEach(row => {
    const ror = row.ror;
    const minYear = row.min_yr;
    out[ror] = +minYear;
});
```

```js
Plot.barX(dat, {x: 'pdf_count', y: "ror" }).plot({marginLeft: 100})
```

## Looking at specific institution

```js
const sel_inst = view(Inputs.select(uniq_ror.map(d => d['ror'])))
```
```js
const sel_yr = view(Inputs.range([ out[sel_inst], 2023], {step: 1, value: out[sel_inst]}))
const parseTime = d3.utcParse("%Y");
```

```js
Plot.plot({
    width: 1200,
    color: {legend: true},
    y: { grid: true, },
    x: {axis: null },
    fx: {tickRotate: 40, label: null },
    marks: [
        Plot.barY(
            dat2.filter(d => d.year_1 > sel_yr & d.ror == sel_inst),
            {x: "type", y:"value", fx: "year_1", fill: "type"},
        )
  ]
})
```

## Summary tests

- `catalog_count_equal_pdf_count`: same number of catalog entries and PDFs for a given ROR.
- `pdf_has_tot_pages_field`: PDF files have a `tot_pages` field in their metadata.
- `pdf_gridfs_integrity`: each PDF file is readable in the database. 
- `pdf_tot_pages_equal_png_count`: total number of pages in PDFs matches the number of PNGs for a given ROR.
- `png_count_equal_text_count`: count of text files is equal to the sum of PNG and PDF files for a given ROR and converter.
- `text_availability`: how much text is available for each pdf

Our tests they mostly follow the same file nameing patterns. They are trying to specify which _collection_ is being tested and how. There is some ordering in the testing order. 

```
catalog > pdf > png > text
```

This make sense. When a scraper fails, we still have the `catalog` entry. Thus we can test if `pdfs` are missing from the `catalog` entries. Similarly, something can happen with `png` failing to be uploaded if something is up with the corresponding `pdfs`. Finally, `text` entries are the last collection in that directed acyclic graphs, vulnerable to any mistake upstream.

## Failed tests

```js
view(Inputs.table(dat_test))
```

## Schema

```js
mermaid`
classDiagram
Catalog --|> Png
Pdf --|> Png
Pdf --|> Text
Png --|> Text 
Catalog : 🔤 id
Catalog : 🔤 metadata_inst_id
Catalog : 🔢 metadata_start_year
Catalog : 🔢 metadata_end_year
Catalog : 🔤 metadata_cat_type
Catalog : 🔢 metadata_semester
Catalog : 🔤 metadata_college
Pdf : 🔤 id
Pdf : 🔤 metadata_inst_id
Pdf : 🔤 metadata_catalog_id
Pdf : 🔤 metadata_ref
Pdf : 🔢 metadata_tot_pages
Png : 🔤 id
Png : 🔤 metadata_inst_id
Png : 🔤 metadata_catalog_id
Png : 🔤 metadata_pdf_id
Png : 🔢 metadata_page
Text : 🔤 id
Text : 🔤 text
Text : 🔤 metadata_inst_id
Text : 🔤 metadata_catalog_id
Text : 🔤 metadata_pdf_id
Text : 🔤 metadata_png_id
Text : 🔢 metadata_page
Text : 🔤 metadata_conversion
Text : 🔤 metadata_annotated
Institutions_oa : 🔤 id
Institutions_oa : 🔤 ror
Institutions_oa : 🔤 display_name
Institutions_oa : 🔤 country_code
Institutions_oa : 🔤 type
Institutions_oa : 🔤 geo_city
Institutions_oa : 🔤 geo_region
Institutions_oa : 🔢 geo_latitude
Institutions_oa : 🔢 geo_longitude
`
```

---