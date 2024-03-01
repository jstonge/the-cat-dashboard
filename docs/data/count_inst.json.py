from kitty import catDB
import pandas as pd
from tqdm import tqdm

cat_db = catDB()

#### ROR ~ PDF_COUNT ####


count_inst = cat_db.count(agg_field="inst_id", collection="cc_catalog")
df = pd.DataFrame({'ror': count_inst.keys(), 'pdf_count': count_inst.values()})
df.to_parquet('count_inst.parquet')


#### PDF TOT PAGES vs PNG COUNTS  ####

out = []
for ror in tqdm(df.ror):
  # ror=df.ror[0]
  pdfs = cat_db.find(id=ror, agg_field="inst_id", collection="cc_pdf")
  for i,pdf in enumerate(pdfs):
      png_count = cat_db.count(id=pdf['id'], agg_field='pdf_id', collection='cc_png')
      text_count_fitz_pdf = cat_db._db._db['cc_text'].count_documents({
         'metadata.conversion': 'fitz', 'metadata.pdf_id': pdf['id']
         })-1 # 'full' page
      text_count_paddleocr_pdf = cat_db._db._db['cc_text'].count_documents({
         'metadata.conversion': 'paddleOCR', 'metadata.pdf_id': pdf['id']
         })-1 # 'full' page
      if 'tot_pages' in pdf['metadata']:
        pdf_tot_pages = pdf['metadata']['tot_pages']
        out.append((pdf_tot_pages, png_count, text_count_fitz_pdf, text_count_paddleocr_pdf, pdf['id']))
      
colnames = ['pdf_tot_pages', 'png_count', 'fitz_count', 'paddleocr_count', 'pdfid']
df2 = pd.DataFrame(out, columns=colnames)
df2 = df2.melt(id_vars=['pdfid'], value_vars=colnames[:4], var_name='type', value_name='value')
df2[['ror', 'cat_type', 'year_1', 'year_2']] = df2.pdfid.str.split("_", expand=True)

df2.to_parquet(f'pdf_pages_v_png_count.parquet')


## SPATIAL DATA
rors = list(cat_db.count(agg_field="inst_id", collection="cc_catalog").keys())
inst_obj = []
for ror in rors:
   inst_i = cat_db._db._db['institutions_oa'].find_one({"ror": f"https://ror.org/{ror}"})
   if inst_i is not None:
      inst_obj.append((inst_i['geo']['longitude'], inst_i['geo']['latitude'], inst_i['display_name']))

pd.DataFrame(inst_obj, columns=['lon', 'lat', 'name']).to_parquet("inst_geo.parquet")

## WARS
import pandas as pd

df1=pd.read_csv("List_of_wars_involving_the_United_States_3.csv")
df1['Event'] = df1.Conflict.str.split("\n").map(lambda x: x[0]) 
df1['Date'] = df1.Conflict.str.split("\n").map(lambda x: x[1])
df1['Start_Year'] = df1['Date'].str.findall("\d{4}").map(lambda x: f"{x[0]}")
df1['End_Year'] = df1['Date'].str.findall("\d{4}").map(lambda x: f"{x[1]}" if len(x) > 1 else x[0])
df1 = df1[['Event', 'End_Year', 'Start_Year']]
df1['Start_Year'] = pd.to_datetime(df1['Start_Year'])
df1['End_Year'] = pd.to_datetime(df1['End_Year'])

# Initialize an empty DataFrame for the interpolated dates
interpolated_df = pd.DataFrame()

# Iterate over each item in the series to concatenate them into one DataFrame
def interpolate_dates(row):
    # Generate date range
    dates = pd.date_range(row['Start_Year'], row['End_Year'])
    # Create a DataFrame for this row's date range
    temp_df = pd.DataFrame({
        'Date': dates,
        'event': row['Event'],
        'value': 1  # Assign the constant value
    })
    return temp_df

interpolated_df = pd.concat(df1.apply(interpolate_dates, axis=1).tolist(), ignore_index=True)

interpolated_df.to_parquet("us_wars.parquet")


## GET TIMESERIES DATA

rors = list(cat_db.count(agg_field="inst_id", collection="cc_catalog").keys())

def get_keyword(keyword):
   pol_sci_freq = []
   for ror in tqdm(rors):
      foo = cat_db.find(id=ror, agg_field="inst_id", collection="cc_catalog")
      for f in foo:
         if 'tokens' in f:
            pol_sci_count = f['tokens']['fitz'][keyword] if f['tokens']['fitz'].get(keyword) else 0
            tot = sum(f['tokens']['fitz'].values())
            if tot  == 0:
               continue
            freq = pol_sci_count / tot
            pol_sci_freq.append((keyword, pol_sci_count, f['metadata']['start_year'], freq, ror))

   df=pd.DataFrame(pol_sci_freq, columns=['keyword', 'count', 'year', 'freq', 'ror'])
   
   df['year'] = pd.to_datetime(df.year, format='%Y')
   
   df = df.sort_values("year").reset_index(drop=True)
   
   return df

df = get_keyword('political science')

df.to_parquet("pol_sci_freq.parquet")