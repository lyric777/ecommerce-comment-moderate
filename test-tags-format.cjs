require('dotenv').config();
const crypto = require('crypto');
const axios = require('./node_modules/axios/index.js');
const base = process.env.MLFLOW_TRACKING_URI;

const traceId = 'tr-' + crypto.randomBytes(16).toString('hex');
console.log('Trace ID:', traceId);

axios.default.post(base + '/api/3.0/mlflow/traces', {
  trace: {
    trace_info: {
      trace_id: traceId,
      trace_location: {
        type: "MLFLOW_EXPERIMENT",
        mlflow_experiment: { experiment_id: "5" }
      },
      request_time: new Date().toISOString(),
      execution_duration: "12.3s",
      state: "OK",
      trace_metadata: {
        "mlflow.trace_schema.version": "3",
        "mlflow.source.name": "comment-moderate-langgraph",
        "mlflow.traceInputs": '{"test":"v3-with-id"}',
        "mlflow.traceOutputs": '{"ok":true}',
        "final_status": "approved",
        "llm_model": "kimi-k2-0711-preview",
        "llm_input_tokens": "244",
        "llm_output_tokens": "45",
        "llm_total_tokens": "289",
        "llm_duration_ms": "7877",
        "thinking_process": "The agent approved this review after verifying it was relevant and safe.",
      },
      tags: {
        "mlflow.traceName": "comment-moderation",
      },
      request_preview: '{"test":"v3-with-id"}',
      response_preview: '{"ok":true}',
    }
  }
}).then(r => {
  console.log('Created! trace_id:', r.data.trace?.trace_info?.trace_id);
  console.log('tags:', JSON.stringify(r.data.trace?.trace_info?.tags));
}).catch(e => {
  console.log('ERR', e.response?.status, JSON.stringify(e.response?.data).substring(0, 500));
});
