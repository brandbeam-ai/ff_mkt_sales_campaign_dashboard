import Airtable from 'airtable';

function getBase() {
  if (!process.env.AIRTABLE_API_KEY) {
    throw new Error('AIRTABLE_API_KEY is not set. Please make sure it is set in your .env.local file.');
  }

  return new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID || 'app0YMWSt1LtrGu7S'
  );
}

// Lazy initialization - only create base when needed
let baseInstance: ReturnType<typeof getBase> | null = null;

const base = new Proxy({} as ReturnType<typeof getBase>, {
  get(_target, prop) {
    if (!baseInstance) {
      baseInstance = getBase();
    }
    return (baseInstance as any)[prop];
  },
});

export default base;

