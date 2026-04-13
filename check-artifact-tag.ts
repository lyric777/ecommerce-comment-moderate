import axios from 'axios';

const traceId = '6a154f172beb47d6bd9eca7ad5253da5';
const experimentId = '5';
const base = 'https://mlflow.ntdoc.site';

async function main() {
  // Get trace list and find our trace
  const r = await axios.get(`${base}/api/2.0/mlflow/traces`, { params: { experiment_ids: experimentId } });
  const traces: any[] = r.data?.traces ?? [];
  const trace = traces.find(t => t.request_id === traceId);
  if (!trace) {
    console.log('TRACE NOT FOUND. IDs:', traces.map(t => t.request_id));
    return;
  }
  
  console.log('Found trace, tags count:', trace.tags?.length);
  const artifactTag = (trace.tags ?? []).find((t: any) => t.key === 'mlflow.artifactLocation');
  console.log('mlflow.artifactLocation:', artifactTag?.value ?? '(not found)');
  console.log('All tags:', JSON.stringify(trace.tags ?? [], null, 2));
}

main().catch(e => console.error('FATAL:', e.message, e.response?.status, JSON.stringify(e.response?.data)));
