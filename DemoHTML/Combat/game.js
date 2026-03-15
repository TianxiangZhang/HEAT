// ==========================================
// 1. 虚拟控制台劫持
// ==========================================
const consoleOutput = document.getElementById('console-output');
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

function appendToConsole(msg, className = '') {
    const logLine = document.createElement('div');
    // 如果是对象，将其转换为易读的字符串格式
    if (typeof msg === 'object') {
        logLine.textContent = JSON.stringify(msg, null, 2);
    } else {
        logLine.textContent = msg;
    }
    if (className) logLine.classList.add(className);
    consoleOutput.appendChild(logLine);
    consoleOutput.scrollTop = consoleOutput.scrollHeight; 
}

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
// 2. Phase 2: 实体类定义 (Entity Classes)
// ==========================================
class Module {
    constructor(name, standardPower, capacity, baseHeat) {
        this.name = name;
        this.standardPower = standardPower; // MW (标称工作功率)
        this.capacity = capacity;           // MJ (额定充能阈值)
        this.baseHeat = baseHeat;           // 基础单次产热
        this.currentCharge = 0;             // 当前充能
    }
}

class Compartment {
    constructor(name, hp, heatBuffer, dissipationRate) {
        this.name = name;
        this.hp = hp;                       // 局部结构值
        this.heatBuffer = heatBuffer;       // 热容上限
        this.dissipationRate = dissipationRate; // 局部散热效率
        this.currentHeat = 0;               // 当前热量
        this.modules = [];                  // 挂载的模块列表
    }
    addModule(mod) {
        this.modules.push(mod);
    }
}

class Ship {
    constructor(name, globalHp, cpu, maxPower, baseSignature) {
        this.name = name;
        this.globalHp = globalHp;           // 全局结构值
        this.cpu = cpu;                     // 总算力
        this.maxPower = maxPower;           // 反应堆总功率
        this.baseSignature = baseSignature; // 基础信号半径
        this.compartments = [];
    }
    addCompartment(comp) {
        this.compartments.push(comp);
    }
}

// ==========================================
// 3. 核心引擎类
// ==========================================
class GameEngine {
    constructor() {
        this.tickCount = 0;
        this.isRunning = false;
        this.tickInterval = null;
        this.playerShip = null;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log("🚀 HEAT 底层逻辑引擎初始化...");
        console.log(`⏱️ 设定 Tick 频率: ${window.CONFIG.TICK_RATE} Hz`);
        
        this.initTestShip();

        this.tickInterval = setInterval(() => {
            this.tick();
        }, window.CONFIG.TICK_INTERVAL_MS);
    }

    // 初始化测试靶机与静态拓扑
    initTestShip() {
        console.log("🛠️ 开始构建测试靶机：雨燕级轻型护卫舰...");
        
        // 1. 创建舰船本身
        this.playerShip = new Ship("雨燕级", 800, 100, 55, 30);
        
        // 2. 创建武器舱
        const weaponBay = new Compartment("武器舱", 800, 150, 20);
        
        // 3. 挂载 2 门动能机炮 (标称 10MW, 射速 3s 算出阈值 30MJ, 设基础产热 15)
        const cannon1 = new Module("动能机炮(左)", 10, 30, 15);
        const cannon2 = new Module("动能机炮(右)", 10, 30, 15);
        
        weaponBay.addModule(cannon1);
        weaponBay.addModule(cannon2);
        this.playerShip.addCompartment(weaponBay);

        console.log("✅ 测试靶机装配完成!");
        console.log(this.playerShip);
    }

    stop() {
        this.isRunning = false;
        clearInterval(this.tickInterval);
        console.warn("⏸️ 引擎已暂停");
    }

    tick() {
        this.tickCount++;
        // 为了避免刷屏太快导致手机端卡顿，这里改成每 10 个 Tick（即1秒）输出一次心跳
        if (this.tickCount % 10 === 0) {
            console.log(`Tick: [${this.tickCount}] - 系统心跳正常`);
        }
    }
}

// ==========================================
// 4. 页面启动器
// ==========================================
window.onload = () => {
    try {
        const engine = new GameEngine();
        engine.start();
    } catch (e) {
        console.error("引擎启动失败:", e.message);
    }
};
