import axios from 'axios';

const base = 'https://mlflow.ntdoc.site';

async function main() {
  // Try GET on the artifact we just PUT to see if the proxy can read it back
  const traceId = '6a154f172beb47d6bd9eca7ad5253da5';
  const experimentId = '5';
  
  const getUrl = `${base}/api/2.0/mlflow-artifacts/artifacts/${experimentId}/traces/${traceId}/artifacts/traces.json`;
  console.log('GET:', getUrl);
  try {
    const r = await axios.get(getUrl);
    console.log('GET status:', r.status);
    console.log('GET response type:', typeof r.data);
    console.log('GET response:', JSON.stringify(r.data).substring(0, 300));
  } catch (e: any) {
    console.log('GET ERR:', e.response?.status, String(e.response?.data ?? e.message).substring(0, 200));
  }

  // List artifacts to see if anything was uploaded
  const listUrl = `${base}/api/2.0/mlflow-artifacts/artifacts`;
  console.log('\nLIST root:', listUrl);
  try {
    const r = await axios.get(listUrl);
    console.log('LIST status:', r.status);
    console.log('LIST response:', JSON.stringify(r.data).substring(0, 500));
  } catch (e: any) {
    console.log('LIST ERR:', e.response?.status, String(e.response?.data ?? e.message).substring(0, 200));
  }
  
  // List at the experiment level 
  const listExpUrl = `${base}/api/2.0/mlflow-artifacts/artifacts/${experimentId}/traces/${traceId}/artifacts`;
  console.log('\nLIST trace level:', listExpUrl);
  try {
    const r = await axios.get(listExpUrl);
    console.log('LIST status:', r.status);
    console.log('LIST files:', JSON.stringify(r.data));
  } catch (e: any) {
    console.log('LIST ERR:', e.response?.status, String(e.response?.data ?? e.message).substring(0, 200));
  }
}

main().catch(e => console.error('FATAL:', e.message));
