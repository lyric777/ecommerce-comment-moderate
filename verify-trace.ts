import axios from 'axios';

const traceId = '4919bd97e15d403f90fd13889dbb1f17';
const base = 'https://mlflow.ntdoc.site';

axios.get(base + '/ajax-api/2.0/mlflow/get-trace-artifact', { params: { request_id: traceId } })
  .then(r => {
    console.log('STATUS:', r.status);
    const d = r.data as any;
    console.log('spans count:', d.spans?.length);
    if (d.spans?.[0]) {
      const s = d.spans[0];
      console.log('span name:', s.name);
      console.log('status_code:', s.status?.status_code ?? s.status_code);
      console.log('attributes keys:', Object.keys(s.attributes || {}));
    }
  })
  .catch((e: any) => console.log('ERR', e.response?.status, JSON.stringify(e.response?.data)));
