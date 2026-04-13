import axios from 'axios';

const traceId = '6a154f172beb47d6bd9eca7ad5253da5';
const experimentId = '5';
const base = 'https://mlflow.ntdoc.site';

async function main() {
  // 1. Get trace info to see the actual mlflow.artifactLocation tag
  console.log('=== 1. Checking trace info (artifactLocation tag) ===');
  try {
    const r = await axios.get(`${base}/api/2.0/mlflow/traces`, { params: { experiment_ids: experimentId } });
    console.log('response keys:', Object.keys(r.data));
    const traces = r.data?.traces ?? [];
    console.log('total traces:', traces.length);
    // The API returns traces flat (no trace_info wrapper)
    const trace = traces.find((t: any) => t.request_id === traceId || t.trace_info?.request_id === traceId);
    if (trace) {
      const info = trace.trace_info ?? trace;
      console.log('trace status:', info?.status);
      const tags = info?.tags ?? [];
      console.log('tags count:', tags.length);
      const artifactTag = tags.find((t: any) => t.key === 'mlflow.artifactLocation');
      console.log('mlflow.artifactLocation:', artifactTag?.value ?? '(not found)');
      console.log('all tags:', JSON.stringify(tags, null, 2));
    } else {
      console.log('trace not in list');
    }
  } catch (e: any) {
    console.log('ERR:', e.response?.status, JSON.stringify(e.response?.data).substring(0, 300));
    // Try the search endpoint
    try {
      const r2 = await axios.post(`${base}/api/2.0/mlflow/traces/search`, { experiment_ids: [experimentId], max_results: 5 });
      const traces = r2.data?.traces ?? [];
      console.log('[search] total:', traces.length);
      const trace = traces.find((t: any) => t.trace_info?.request_id === traceId);
      if (trace) {
        const info = trace.trace_info;
        const tags = info?.tags ?? [];
        const artifactTag = tags.find((t: any) => t.key === 'mlflow.artifactLocation');
        console.log('[search] mlflow.artifactLocation:', artifactTag?.value ?? '(not found)');
        console.log('[search] all tags:', JSON.stringify(tags, null, 2));
      } else {
        console.log('[search] trace not found; first request_id:', traces[0]?.trace_info?.request_id);
      }
    } catch (e2: any) {
      console.log('[search] ERR:', e2.response?.status, JSON.stringify(e2.response?.data).substring(0, 300));
    }
  }

  // 2. Attempt PUT to the corrected path
  console.log('\n=== 2. Attempting PUT to artifacts path ===');
  const putUrl = `${base}/api/2.0/mlflow-artifacts/artifacts/${experimentId}/traces/${traceId}/artifacts/traces.json`;
  console.log('PUT URL:', putUrl);
  const body = JSON.stringify({
    spans: [{
      name: 'comment-moderation',
      context: {
        span_id: 'aabbccddeeff0011',
        trace_id: traceId.replace(/-/g, ''),
      },
      parent_id: null,
      start_time: Date.now() * 1_000_000,
      end_time: (Date.now() + 1000) * 1_000_000,
      status_code: 'OK',
      status_message: '',
      attributes: { 'test_token_count': '42' },
      events: [],
    }],
  });
  try {
    const r = await axios.put(putUrl, body, {
      headers: { 'Content-Type': 'application/json' },
      maxRedirects: 5,
    });
    console.log('PUT status:', r.status);
    console.log('PUT response:', JSON.stringify(r.data).substring(0, 300));
  } catch (e: any) {
    console.log('PUT ERR:', e.response?.status, JSON.stringify(e.response?.data).substring(0, 500));
  }

  // 3. Try GET after PUT
  console.log('\n=== 3. Checking get-trace-artifact after PUT ===');
  await new Promise(r => setTimeout(r, 2000));
  try {
    const r = await axios.get(`${base}/ajax-api/2.0/mlflow/get-trace-artifact`, {
      params: { request_id: traceId },
    });
    console.log('GET status:', r.status);
    console.log('spans count:', (r.data as any).spans?.length);
  } catch (e: any) {
    console.log('GET ERR:', e.response?.status, JSON.stringify(e.response?.data));
  }
}

main();
