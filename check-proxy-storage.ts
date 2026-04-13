import axios from 'axios';

const base = 'https://mlflow.ntdoc.site';
const traceId = '6a154f172beb47d6bd9eca7ad5253da5';
const experimentId = '5';

async function main() {
  // The mlflow.artifactLocation = s3://ceramicraft-mlflow/5/traces/{traceId}/artifacts
  // The server calls _get_artifact_repo_mlflow_artifacts() which uses ARTIFACTS_DESTINATION env var
  // If ARTIFACTS_DESTINATION = s3://ceramicraft-mlflow, then proxy PUT path IS correct
  // But the GET on proxy returns 500 -- let's debug more

  // Try listing artifacts via the legacy list endpoint
  console.log('=== List via GET /mlflow-artifacts/artifacts?path=... ===');
  try {
    const r = await axios.get(`${base}/api/2.0/mlflow-artifacts/artifacts`, {
      params: { path: `${experimentId}/traces/${traceId}/artifacts` }
    });
    console.log('LIST status:', r.status);
    console.log('LIST response:', JSON.stringify(r.data));
  } catch (e: any) {
    console.log('LIST ERR:', e.response?.status, JSON.stringify(e.response?.data ?? e.message).substring(0, 300));
  }

  // Try the pre-signed URL endpoint for upload  
  console.log('\n=== Try create multipart upload for a pre-signed URL ===');
  const artifactPath = `${experimentId}/traces/${traceId}/artifacts/traces.json`;
  try {
    const r = await axios.post(`${base}/api/2.0/mlflow-artifacts/mpu/create/${artifactPath}`, {
      path: 'traces.json',
      num_parts: 1,
    });
    console.log('MPU CREATE status:', r.status, JSON.stringify(r.data).substring(0, 400));
  } catch (e: any) {
    console.log('MPU CREATE ERR:', e.response?.status, JSON.stringify(e.response?.data ?? e.message).substring(0, 300));
  }

  // Try downloading what we uploaded to see what's there
  console.log('\n=== GET download of uploaded file ===');
  try {
    const r = await axios.get(`${base}/api/2.0/mlflow-artifacts/artifacts/${artifactPath}`);
    console.log('DOWNLOAD status:', r.status);
    console.log('DOWNLOAD response:', JSON.stringify(r.data).substring(0, 300));
  } catch (e: any) {
    console.log('DOWNLOAD ERR:', e.response?.status, String(e.response?.data ?? e.message).substring(0, 300));
  }
}

main().catch(e => console.error('FATAL:', e.message));
