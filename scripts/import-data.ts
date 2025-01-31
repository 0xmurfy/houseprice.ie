import { getDataSource } from "../lib/database";
import { PropertySale } from "../lib/entities/PropertySale";
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse";

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const parseDate = (dateStr: string): Date => {
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(year, month - 1, day);
};

function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;
  
  try {
    // Handle the specific euro symbol encoding (charCode 128)
    const cleanedStr = priceStr
      .replace(/[\u0080\u20AC€]/g, '') // Remove euro symbols (including char code 128)
      .trim()
      .replace('.00', '');
    
    // Remove commas and convert to number
    const price = parseFloat(cleanedStr.replace(/,/g, ''));
    
    if (isNaN(price) || price === 0) {
      console.error(`Failed to parse price: "${priceStr}" (cleaned: "${cleanedStr}")`);
      return 0;
    }
    return price;
  } catch (error) {
    console.error('Error parsing price:', error, 'Original string:', priceStr);
    return 0;
  }
}

const getYear = (dateStr: string): number => {
  const [, , year] = dateStr.split("/").map(Number);
  return year;
};

async function savePropertyWithRetry(repository: any, property: PropertySale, retries = MAX_RETRIES): Promise<void> {
  try {
    await repository.save(property);
  } catch (error) {
    if (retries > 0) {
      console.log(`Failed to save property. Retrying in ${RETRY_DELAY/1000} seconds... (${retries} retries left)`);
      await sleep(RETRY_DELAY);
      await savePropertyWithRetry(repository, property, retries - 1);
    } else {
      throw error;
    }
  }
}

async function processFile(filePath: string) {
  console.log(`Processing ${filePath}`);
  const fileStream = fs.createReadStream(filePath, { encoding: 'latin1' });
  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(PropertySale);

  const parser = parse({
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  let processed = 0;
  let errors = 0;
  
  for await (const row of fileStream.pipe(parser)) {
    try {
      // Get the price from the correct column name
      const priceField = row['Price (\x80)'];
      console.log('Raw price:', priceField);
      
      if (!priceField) {
        console.error('No price found for row:', row);
        errors++;
        continue;
      }

      // Remove euro symbol (both UTF-8 and hex 80 versions), commas, and .00
      const cleanPrice = priceField
        .replace(/[\x80€]/g, '')  // Remove euro symbols
        .replace(/,/g, '')       // Remove commas
        .replace(/\.00$/, '')    // Remove .00 at the end
        .trim();                 // Remove whitespace

      const price = parseFloat(cleanPrice);
      if (isNaN(price)) {
        console.error('Failed to parse price:', priceField, 'Cleaned:', cleanPrice);
        errors++;
        continue;
      }

      // Skip records with zero price
      if (price === 0) {
        console.error('Zero price found for row:', row);
        errors++;
        continue;
      }

      const saleDate = parseDate(row['Date of Sale (dd/mm/yyyy)']);
      const address = row['Address'].trim();
      const eircode = row['Eircode'] || null;

      // Check for existing record with the same address and sale date
      const existingProperty = await repository.findOne({
        where: {
          address,
          saleDate,
          eircode: eircode || null
        }
      });

      const property = existingProperty || new PropertySale();
      property.saleDate = saleDate;
      property.address = address;
      property.eircode = eircode;
      property.price = price;
      property.year = getYear(row['Date of Sale (dd/mm/yyyy)']);
      property.county = row['County'] || null;
      property.description = row['Description of Property'];
      property.fullAddress = `${address}${row['County'] ? ', ' + row['County'] : ''}`;

      await savePropertyWithRetry(repository, property);
      processed++;
      
      if (processed % 100 === 0) {
        console.log(`Processed ${processed} records (${errors} errors) in ${path.basename(filePath)}`);
      }
    } catch (error) {
      console.error('Error processing row:', error);
      console.error('Row data:', row);
      errors++;
    }
  }

  console.log(`Completed processing ${filePath}, processed ${processed} records (${errors} errors)`);
  return { processed, errors };
}

async function main() {
  try {
    const dataDir = path.join(process.cwd(), 'public', 'salesdata');
    const files = fs.readdirSync(dataDir)
      .filter(file => file.endsWith('.csv'))
      .sort(); // Process files in order
    
    let totalProcessed = 0;
    let totalErrors = 0;
    
    for (const file of files) {
      try {
        console.log(`\nStarting to process ${file}...`);
        const { processed, errors } = await processFile(path.join(dataDir, file));
        totalProcessed += processed;
        totalErrors += errors;
        console.log(`Completed ${file}. Running total: ${totalProcessed} records processed (${totalErrors} errors)`);
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
        // Continue with next file instead of stopping
        continue;
      }
    }
    
    console.log(`\nAll files completed. Total: ${totalProcessed} records processed (${totalErrors} errors)`);
    process.exit(0);
  } catch (error) {
    console.error('Error in main:', error);
    process.exit(1);
  }
}

main(); 