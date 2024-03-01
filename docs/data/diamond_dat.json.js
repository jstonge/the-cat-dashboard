
// PRECOMPUTE DIAMOND DATA FROM RAW ALLOTAX PARQUET FILE

import { diamond, rank_turbulence_divergence, mixedElems } from 'https://cdn.skypack.dev/allotaxonometer@1.1.4?min'

import * as duckdb from "npm:@duckdb/duckdb-wasm";
const db = DuckDBClient.of({ elem: FileAttachment("./data/allotax.parquet") })

// PAIRWISE COMPARISON OF TWO PDFS HARDCODED

const elems1 = db.query(`
    SELECT * 
    FROM elem WHERE pdf_id = '1880-boys.tsv' 
    LIMIT 10000
`)

const elems2 = db.query(`
    SELECT * 
    FROM elem WHERE pdf_id = '1885-boys.tsv'
    LIMIT 10000
`)

let me_class = new mixedElems(elems1, elems2)
let me = me_class.combElems()
let alpha = 0.92 // alpha hardcoded
let rtd = rank_turbulence_divergence(me, alpha)
let dat = diamond(me, rtd)
let diamond_dat = dat.counts
// let diamond_dat_f = diamond_dat.filter(d => d.types !== "")
// const max_shift = d3.max(wordshift_dat(), d => Math.abs(d.metric))

process.stdout.write(JSON.stringify(diamond_dat));