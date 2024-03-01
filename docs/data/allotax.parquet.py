from kitty import catDB
import pandas as pd
from tqdm import tqdm

cat_db = catDB()

## EXPORT RAW ALLOTAX DATA

rors = list(cat_db.count(agg_field="inst_id", collection="cc_catalog").keys())
pdfs = cat_db.find(id="0155zta11", agg_field="inst_id", collection="cc_pdf")
def extract_year(dictionary):
   # Split the string on underscores and take the third part (index 2), then split by "_" and take the first part for the year
   year_part = dictionary["id"].split("_")[2]
   # Extract the year (first 4 characters of the year_part)
   year = int(year_part[:4])
   return year

sorted_pdf_obj = sorted(pdfs, key=extract_year)

converter = 'fitz'
lexicon = None

out = []
out_json = {}
for i in tqdm(range(2, len(sorted_pdf_obj), 10), total=len(sorted_pdf_obj)//10):
   res=cat_db.find_one(pdfs[i]['id'], agg_field=None, collection="cc_catalog")
   if 'tokens' in res:
      if converter in res['tokens']:
         tot = sum(list(res['tokens'][converter].values()))
         totaluniq = len(list(res['tokens'][converter].keys()))
         values = []
         for types, counts in res['tokens'][converter].items():
               # if counts > 1: # maybe i shouldn't do that
               out.append(
                     {
                        "types": types,  
                        "counts": counts, 
                        "totalunique": totaluniq,
                        "probs": round(counts/tot, 4),
                        "pdf_id": pdfs[i]['id'],
                     }
               )

               values.append({
                  "types": types,  
                  "counts": counts, 
                  "totalunique": totaluniq,
                  "probs": round(counts/tot, 4),    
               })
            
         out_json.update({ pdfs[i]['id'] : values })

# FOR OBSERVABLE 
         
import json

out_json = {k: v for k, v in sorted(out_json.items(), key=lambda item: int(item[0].split("_")[2]))}

with open("obs_data.json", "w") as fout:
   json.dump(out_json, fout)


# FOR APP


df = pd.DataFrame(out)
df[["ror", "cat_type", "year_1", "year_2"]] = df.pdf_id.str.split("_", expand=True)
df['year_1'] = df.year_1.astype(int)
df.drop(columns=["ror", "year_2"], inplace=True)
df.sort_values("year_1", inplace=True)
df.to_parquet("allotax.parquet")

# import json
# with open("elem_boys.json") as f:
#    d = json.loads(f.read())

# d1=d['1880-boys.tsv']
# d2=d['1885-boys.tsv']
# d3=d['2010-boys.tsv']

# pd.concat([
#    pd.DataFrame(d1).assign(pdf_id='1880-boys.tsv'),
#    pd.DataFrame(d2).assign(pdf_id='1885-boys.tsv'),
#    pd.DataFrame(d3).assign(pdf_id='2010-boys.tsv')
# ], axis=0).to_parquet("allotax.parquet")