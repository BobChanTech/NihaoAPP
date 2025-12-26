// Service Worker 注册器 - 强力修复版
// 功能：彻底解决更新弹窗和数据库更新问题
if ('serviceWorker' in navigator) {
console.log('页面: 开始注册Service Worker');

window.addEventListener('load', () => {
navigator.serviceWorker.register('sw.js')
.then(registration => {
console.log('Service Worker 注册成功:', registration.scope);

// 监听Service Worker更新
registration.addEventListener('updatefound', () => {
console.log('页面: 发现Service Worker更新');
const newWorker = registration.installing;
if (newWorker) {
newWorker.addEventListener('statechange', () => {
console.log('页面: Service Worker状态变化:', newWorker.state);
if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
console.log('页面: Service Worker更新完成');
// 刷新页面以使用新的Service Worker
window.location.reload();
}
});
}
});

// 监听Service Worker消息
navigator.serviceWorker.addEventListener('message', (event) => {
console.log('页面收到Service Worker消息:', event.data);

if (event.data && event.data.type === 'VERSION_CHECK_REQUEST') {
console.log('页面: Service Worker请求版本检查');
// 发送版本检查请求
if (registration.active) {
registration.active.postMessage({ type: 'CHECK_UPDATE' });
}
}

if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
console.log('页面: 收到更新可用通知');
const newVersion = event.data.newVersion;
// 获取当前应用版本
const currentVersion = window.appInstance?.dataVersion || '1.0.4';
// 如果版本相同，不显示更新提示
if (newVersion === currentVersion) {
console.log('页面: 已是最新版本，跳过更新提示');
return;
}
showUpdatePrompt(event.data);
}
});

// 发送版本检查请求
if (registration.active) {
console.log('页面: 发送初始版本检查请求');
registration.active.postMessage({ type: 'CHECK_UPDATE' });
}

})
.catch(error => {
console.error('Service Worker 注册失败:', error);
});
});
}

// 显示更新提示的函数
function showUpdatePrompt(updateData) {
const { newVersion, updateInfo, forceUpdate } = updateData;

// 获取当前应用版本
const currentVersion = window.appInstance?.dataVersion || '1.0.4';

// 检查是否已经显示了更新提示
if (document.getElementById('update-prompt')) {
console.log('页面: 更新提示已存在，跳过显示');
return;
}

console.log('页面: 显示更新提示，当前版本:', currentVersion, '新版本:', newVersion, '强制更新:', forceUpdate);

// 创建更新提示元素
const updatePrompt = document.createElement('div');
updatePrompt.id = 'update-prompt';
updatePrompt.style.cssText = `
position: fixed;
top: 20px;
left: 50%;
transform: translateX(-50%);
background: ${forceUpdate ? '#f44336' : '#4CAF50'};
color: white;
padding: 16px 24px;
border-radius: 8px;
box-shadow: 0 4px 12px rgba(0,0,0,0.3);
z-index: 10000;
display: flex;
align-items: center;
gap: 12px;
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
animation: slideDown 0.3s ease-out;
max-width: 90%;
min-width: 300px;
${forceUpdate ? 'border: 2px solid #d32f2f;' : ''}
`;

updatePrompt.innerHTML = `
<div style="flex: 1;">
<div style="font-weight: 600; margin-bottom: 4px;">
${forceUpdate ? '⚠️ 强制更新' : '🎉 发现新版本'}
</div>
<div style="font-size: 14px; opacity: 0.9;">
版本 ${currentVersion} → ${newVersion}
${updateInfo?.description ? `<br>${updateInfo.description}` : ''}
</div>
<div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">
${forceUpdate ? '此更新必须安装以继续使用' : '点击"立即更新"将下载最新数据和功能'}
</div>
</div>
<div style="display: flex; gap: 8px;">
${!forceUpdate ? `
<button id="update-later" style="
background: rgba(255,255,255,0.2);
border: 1px solid rgba(255,255,255,0.3);
color: white;
padding: 8px 16px;
border-radius: 4px;
cursor: pointer;
font-size: 14px;
">稍后</button>
` : ''}
<button id="update-now" style="
background: white;
color: ${forceUpdate ? '#f44336' : '#4CAF50'};
border: none;
padding: 8px 16px;
border-radius: 4px;
cursor: pointer;
font-weight: 600;
font-size: 14px;
">${forceUpdate ? '立即更新' : '立即更新'}</button>
</div>
`;

// 添加动画样式
if (!document.getElementById('update-animation-styles')) {
const style = document.createElement('style');
style.id = 'update-animation-styles';
style.textContent = `
@keyframes slideDown {
from {
transform: translateX(-50%) translateY(-100%);
opacity: 0;
}
to {
transform: translateX(-50%) translateY(0);
opacity: 1;
}
}
@keyframes slideUp {
from {
transform: translateX(-50%) translateY(0);
opacity: 1;
}
to {
transform: translateX(-50%) translateY(-100%);
opacity: 0;
}
}
@keyframes pulse {
0% { transform: scale(1); }
50% { transform: scale(1.05); }
100% { transform: scale(1); }
}
`;
document.head.appendChild(style);
}

// 添加到页面
document.body.appendChild(updatePrompt);

// 如果是强制更新，添加脉动动画
if (forceUpdate) {
updatePrompt.style.animation = 'pulse 1.5s infinite';
}

// 绑定按钮事件
const laterBtn = updatePrompt.querySelector('#update-later');
const nowBtn = updatePrompt.querySelector('#update-now');

if (laterBtn) {
laterBtn.addEventListener('click', () => {
console.log('页面: 用户选择稍后更新');
hideUpdatePrompt(updatePrompt);
});
}

nowBtn.addEventListener('click', async () => {
console.log('页面: 用户选择立即更新');
nowBtn.disabled = true;
nowBtn.textContent = forceUpdate ? '更新中...' : '更新中...';
await performUpdate();
hideUpdatePrompt(updatePrompt);
});

// 非强制更新时15秒后自动隐藏，强制更新不自动隐藏
if (!forceUpdate) {
setTimeout(() => {
if (document.getElementById('update-prompt')) {
console.log('页面: 更新提示自动隐藏');
hideUpdatePrompt(updatePrompt);
}
}, 15000);
}
}

function hideUpdatePrompt(promptElement) {
if (!promptElement || !promptElement.parentNode) return;

promptElement.style.animation = 'slideUp 0.3s ease-out';
setTimeout(() => {
if (promptElement.parentNode) {
promptElement.parentNode.removeChild(promptElement);
}
}, 300);
}

async function performUpdate() {
try {
console.log('页面: 开始执行更新');

// 显示更新进度
showUpdateProgress('正在清除缓存...');

// 清除更新提示
const updatePrompt = document.getElementById('update-prompt');
if (updatePrompt) {
updatePrompt.remove();
}

// 清除本地存储
showUpdateProgress('正在清除本地数据...');
localStorage.removeItem('vocab_last_update');
localStorage.removeItem('vocab_data_version');
localStorage.removeItem('vocab_fallback_data');

// 清除IndexedDB
showUpdateProgress('正在清除数据库...');
if (window.indexedDB && window.indexedDB.databases) {
try {
const databases = await window.indexedDB.databases();
await Promise.all(databases.map(db => {
if (db.name) {
return window.indexedDB.deleteDatabase(db.name);
}
}));
} catch (error) {
console.warn('清除IndexedDB失败:', error);
}
}

// 获取Service Worker注册
const registration = await navigator.serviceWorker.getRegistration();

// 发送清除缓存请求
if (registration && registration.active) {
console.log('页面: 发送清除数据库缓存请求');
registration.active.postMessage({ type: 'CLEAR_DATABASE_CACHE' });
}

showUpdateProgress('正在更新应用...');

if (registration && registration.waiting) {
console.log('页面: 发送SKIP_WAITING消息');
// 发送消息给Service Worker更新
registration.waiting.postMessage({ type: 'SKIP_WAITING' });

// 等待Service Worker激活
await new Promise((resolve) => {
navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
});

console.log('页面: Service Worker更新完成，准备刷新页面');
} else {
console.log('页面: 没有等待的Service Worker，直接刷新页面');
}

// 延迟刷新页面以确保所有清理完成
setTimeout(() => {
console.log('页面: 刷新页面以应用更新');
window.location.reload();
}, 3000);

} catch (error) {
console.error('页面: 更新过程中发生错误:', error);
hideUpdateProgress();

// 如果更新失败，显示错误信息
showUpdateError(error.message);

// 3秒后刷新页面重试
setTimeout(() => {
window.location.reload();
}, 3000);
}
}

function showUpdateProgress(message) {
hideUpdateProgress();

const progressDiv = document.createElement('div');
progressDiv.id = 'update-progress';
progressDiv.style.cssText = `
position: fixed;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
background: white;
padding: 30px;
border-radius: 8px;
box-shadow: 0 4px 20px rgba(0,0,0,0.3);
z-index: 10001;
text-align: center;
min-width: 250px;
border: 2px solid #4CAF50;
`;

progressDiv.innerHTML = `
<div style="margin-bottom: 15px; font-size: 16px; font-weight: 600; color: #4CAF50;">
🔄 正在更新应用
</div>
<div style="font-size: 14px; color: #666; margin-bottom: 20px;">
${message}
</div>
<div style="margin-top: 15px;">
<div style="width: 100%; height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden;">
<div style="width: 0%; height: 100%; background: #4CAF50; animation: progress 3s infinite;"></div>
</div>
</div>
<div style="font-size: 12px; color: #999; margin-top: 10px;">
请稍候，页面将自动刷新
</div>
`;

// 添加进度条动画样式
if (!document.getElementById('update-progress-styles')) {
const style = document.createElement('style');
style.id = 'update-progress-styles';
style.textContent = `
@keyframes progress {
0% { width: 0%; }
25% { width: 30%; }
50% { width: 60%; }
75% { width: 85%; }
100% { width: 100%; }
}
`;
document.head.appendChild(style);
}

document.body.appendChild(progressDiv);
}

function hideUpdateProgress() {
const progressDiv = document.getElementById('update-progress');
if (progressDiv) {
progressDiv.remove();
}
}

function showUpdateError(message) {
hideUpdateProgress();

const errorDiv = document.createElement('div');
errorDiv.id = 'update-error';
errorDiv.style.cssText = `
position: fixed;
top: 20px;
left: 50%;
transform: translateX(-50%);
background: #f44336;
color: white;
padding: 15px 20px;
border-radius: 4px;
z-index: 10001;
font-size: 14px;
border: 2px solid #d32f2f;
`;

errorDiv.textContent = `更新失败: ${message}，正在重试...`;
document.body.appendChild(errorDiv);

setTimeout(() => {
if (errorDiv.parentNode) {
errorDiv.remove();
}
}, 5000);
}

// 页面可见性变化时的处理
document.addEventListener('visibilitychange', () => {
if (!document.hidden && navigator.serviceWorker.controller) {
console.log('页面: 可见性变化，检查更新');
navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
}
});

// 页面卸载前的处理
window.addEventListener('beforeunload', () => {
// 重置更新标志
if (navigator.serviceWorker.controller) {
navigator.serviceWorker.controller.postMessage({ type: 'RESET_UPDATE_FLAG' });
}

});
