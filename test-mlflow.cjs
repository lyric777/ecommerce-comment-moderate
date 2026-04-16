const https = require('https');

const url = 'https://mlflow.ntdoc.site/api/2.0/mlflow/experiments/get-by-name?experiment_name=comment-moderate-traces';

console.log('=============================================');
console.log('🚀 开始独立环境网络测试');
console.log(`🎯 目标地址: ${url}`);
console.log('=============================================\n');

async function runTests() {
    // ---------------------------------------------------------
    // 测试 1: 使用 Node 18+ 原生 fetch
    // 特点：使用全新的 undici 引擎，并且伪装成正常的 Chrome 浏览器，
    // 专治被 Cloudflare 或 AWS WAF 拦截的 "ECONNRESET"。
    // ---------------------------------------------------------
    console.log('▶ 测试 1: 原生 Fetch (伪装浏览器特征)...');
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        console.log(`[Fetch] 状态码: ${response.status}`);
        if (response.ok) {
            const data = await response.json();
            console.log(`[Fetch] ✅ 连接成功! 收到实验 ID: ${data.experiment?.experiment_id || '已获取数据'}`);
        } else {
            console.log(`[Fetch] ❌ 连接建立，但服务器拒绝访问 (可能需要鉴权)`);
        }
    } catch (error) {
        console.log(`[Fetch] ❌ 底层网络被掐断: ${error.message}`);
    }

    console.log('\n---------------------------------------------\n');

    // ---------------------------------------------------------
    // 测试 2: 使用 Node.js 最传统的 https 模块
    // 特点：强制绕过所有的系统代理环境变量，强制使用 IPv4 解析，
    // 忽略 SSL 证书错误，直接与服务器建立最原始的 TCP 握手。
    // ---------------------------------------------------------
    console.log('▶ 测试 2: 传统 HTTPS (强制 IPv4 直连 + 忽略证书验证)...');
    
    const req = https.get(url, {
        agent: new https.Agent({ keepAlive: false }),
        family: 4,                  // 彻底屏蔽导致断连的 IPv6 路由
        rejectUnauthorized: false   // 忽略可能存在的 VPN 证书劫持
    }, (res) => {
        console.log(`[HTTPS] 状态码: ${res.statusCode}`);
        res.on('data', () => {}); // 消耗流数据以释放内存
        res.on('end', () => console.log(`[HTTPS] ✅ 原始 Socket 通信成功`));
    });

    req.on('error', (e) => {
        console.log(`[HTTPS] ❌ 原始 Socket 崩溃，详细错误:`);
        console.error(e);
    });

    req.end();
}

runTests();