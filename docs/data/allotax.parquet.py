from kitty import catDB
import pandas as pd
from tqdm import tqdm

cat_db = catDB()

## EXPORT RAW ALLOTAX DATA


def extract_year(dictionary):
   # Split the string on underscores and take the third part (index 2), then split by "_" and take the first part for the year
   year_part = dictionary["id"].split("_")[2]
   # Extract the year (first 4 characters of the year_part)
   year = int(year_part[:4])
   return year

def get_df_allotax(ror: str, top_n:int = 10_000):
   # rors = list(cat_db.count(agg_field="inst_id", collection="cc_catalog").keys())
   pdfs = cat_db.find(id=ror, agg_field="inst_id", collection="cc_pdf")
   sorted_pdf_obj = sorted(pdfs, key=extract_year)

   converter = 'fitz'
   lexicon = None

   out = []
   # out_json = {}
   for i in tqdm(range(0, len(sorted_pdf_obj), 1), total=len(sorted_pdf_obj)//1):
      res=cat_db.find_one(pdfs[i]['id'], agg_field=None, collection="cc_catalog")
      if 'tokens' in res:
         if converter in res['tokens']:
            tot = sum(list(res['tokens'][converter].values()))
            totaluniq = len(list(res['tokens'][converter].keys()))
            # values = []
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

            #       values.append({
            #          "types": types,  
            #          "counts": counts, 
            #          "totalunique": totaluniq,
            #          "probs": round(counts/tot, 4),    
            #       })
               
            # out_json.update({ pdfs[i]['id'] : values })
      else:
          print("NOT tokenized")

   
   df = pd.DataFrame(out)

   # USEFUL COLUMNS
   df[["ror", "cat_type", "year_1", "year_2"]] = df.pdf_id.str.split("_", expand=True)

   # YEAR_1 AS INT
   df['year_1'] = df.year_1.astype(int)

   # NO NEED FOR THOSE COLUMNS
   df.drop(columns=["year_2"], inplace=True)

   # SORT BY YEAR AND COUNTS
   df.sort_values(["year_1", "counts"], ascending=[True, False], inplace=True)

   # TAKE TOP 10K
   df = df.groupby(["pdf_id", "year_1"]).head(top_n)

   # check the final shape
   df.groupby(["pdf_id", "year_1"]).count()

   return df


# FOR OBSERVABLE 
         
# import json
# out_json = {k: v for k, v in sorted(out_json.items(), key=lambda item: int(item[0].split("_")[2]))}
# with open("obs_data.json", "w") as fout:
#    json.dump(out_json, fout)


# FOR APP


df1 = get_df_allotax("0155zta11")
df2 = get_df_allotax("01an7q238")

df = pd.concat([df1, df2], axis=0)
# df.drop(["pdf_id", "probs"], axis=1, inplace=True)

df.to_parquet("allotax.parquet")
