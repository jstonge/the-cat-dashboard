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

