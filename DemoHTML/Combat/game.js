// ==========================================
// 1. 虚拟控制台劫持 (Mobile Debug Support)
// ==========================================
const consoleOutput = document.getElementById('console-output');

// 保存原生方法以便在真实的开发者工具中依然可用
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

function appendToConsole(msg, className = '') {
    const logLine = document.createElement('div');
    logLine.textContent = msg;
    if (className) logLine.classList.add(className);
    consoleOutput.appendChild(logLine);
    // 强制滚动到最底部
    consoleOutput.scrollTop = consoleOutput.scrollHeight; 
}

// 覆写全局的 console 方法
console.log = function(...args) {
    originalLog.apply(console, args);
    appendToConsole(args.join(' '));
};
console.warn = function(...args) {
    originalWarn.apply(console, args);
    appendToConsole(args.join(' '), 'log-warn');
};
console.error = function(...args) {
    originalError.apply(console, args);
    appendToConsole(args.join(' '), 'log-error');
};

// ==========================================
// 2. 核心引擎类 (Game Engine)
// ==========================================
class GameEngine {
    constructor() {
        this.tickCount = 0;
        this.isRunning = false;
        this.tickInterval = null;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log("🚀 HEAT 底层逻辑引擎初始化...");
        console.log(`⏱️ 设定 Tick 频率: ${CONFIG.TICK_RATE} Hz (每 ${CONFIG.TICK_INTERVAL_MS}ms 一次)`);
        
        // 启动主循环，锁定在 10Hz
        this.tickInterval = setInterval(() => {
            this.tick();
        }, CONFIG.TICK_INTERVAL_MS);
    }

    stop() {
        this.isRunning = false;
        clearInterval(this.tickInterval);
        console.warn("⏸️ 引擎已暂停");
    }

    // 引擎心跳：所有的功率调度、开火和伤害判定未来都在这里执行
    tick() {
        this.tickCount++;
        // 打印 Tick 日志验证循环正常运行
        console.log(`Tick: [${this.tickCount}] - 系统心跳正常`);
    }
}

// ==========================================
// 3. 页面启动器 (Bootstrap)
// ==========================================
// 等待 HTML 彻底加载完毕后实例化并启动引擎
window.onload = () => {
    try {
        const engine = new GameEngine();
        engine.start();
    } catch (e) {
        console.error("引擎启动失败:", e.message);
    }
};
