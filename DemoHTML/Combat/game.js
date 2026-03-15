// ==========================================
// 1. 虚拟控制台劫持 (已修复对象打印)
// ==========================================
const consoleOutput = document.getElementById('console-output');
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

function appendToConsole(msg, className = '') {
    const logLine = document.createElement('div');
    // 如果消息本身含有换行符（如 JSON.stringify 输出），保留其格式
    logLine.style.whiteSpace = 'pre-wrap'; 
    logLine.textContent = msg;
    if (className) logLine.classList.add(className);
    consoleOutput.appendChild(logLine);
    consoleOutput.scrollTop = consoleOutput.scrollHeight; 
}

// 修复点：在 join 之前，提前把对象 Stringify
function formatArgs(args) {
    return args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg).join(' ');
}

console.log = function(...args) {
    originalLog.apply(console, args);
    appendToConsole(formatArgs(args));
};
console.warn = function(...args) {
    originalWarn.apply(console, args);
    appendToConsole(formatArgs(args), 'log-warn');
};
console.error = function(...args) {
    originalError.apply(console, args);
    appendToConsole(formatArgs(args), 'log-error');
};

// ==========================================
// 2. 实体类定义 (保持不变)
// ==========================================
class Module {
    constructor(name, standardPower, capacity, baseHeat) {
        this.name = name;
        this.standardPower = standardPower; 
        this.capacity = capacity;           
        this.baseHeat = baseHeat;           
        this.currentCharge = 0;             
    }
}

class Compartment {
    constructor(name, hp, heatBuffer, dissipationRate) {
        this.name = name;
        this.hp = hp;                       
        this.heatBuffer = heatBuffer;       
        this.dissipationRate = dissipationRate; 
        this.currentHeat = 0;               
        this.modules = [];                  
    }
    addModule(mod) { this.modules.push(mod); }
}

class Ship {
    constructor(name, globalHp, cpu, maxPower, baseSignature) {
        this.name = name;
        this.globalHp = globalHp;           
        this.cpu = cpu;                     
        this.maxPower = maxPower;           
        this.baseSignature = baseSignature; 
        this.compartments = [];
    }
    addCompartment(comp) { this.compartments.push(comp); }
}

// ==========================================
// 3. 核心引擎类 (新增 Phase 3 开火逻辑)
// ==========================================
class GameEngine {
    constructor() {
        this.tickCount = 0;
        this.isRunning = false;
        this.tickInterval = null;
        this.playerShip = null;
        this.testCannon = null; // 用于快速引用的测试武器
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log("🚀 HEAT 底层引擎启动...");
        
        this.initTestShip();

        this.tickInterval = setInterval(() => {
            this.tick();
        }, window.CONFIG.TICK_INTERVAL_MS);
    }

    initTestShip() {
        this.playerShip = new Ship("雨燕级", 800, 100, 55, 30);
        const weaponBay = new Compartment("武器舱", 800, 150, 20);
        
        // 挂载 1 门主测试机炮
        this.testCannon = new Module("测试动能机炮", 10, 30, 15);
        weaponBay.addModule(this.testCannon);
        this.playerShip.addCompartment(weaponBay);

        console.log("✅ 靶机装配完成，数据如下：");
        console.log(this.playerShip);
    }

    tick() {
        this.tickCount++;
        
        // 1. 获取 UI 上的分配功率 (Pin)
        const powerSlider = document.getElementById('power-slider');
        if (!powerSlider) return; // UI还没加载完时跳过
        const pIn = parseFloat(powerSlider.value);
        
        // 2. 计算有效功率 (P_eff) 和 浪费功率 (P_waste)
        let pEff = 0;
        let pWaste = 0;
        if (pIn <= this.testCannon.standardPower) {
            pEff = pIn;
        } else {
            pEff = this.testCannon.standardPower + (pIn - this.testCannon.standardPower) * window.CONFIG.GLOBAL_OVERLOAD_EFFICIENCY;
        }
        pWaste = pIn - pEff;

        // 3. 增加充能 (每 Tick 增加 P_eff * 0.1秒)
        const chargeIncrement = pEff * (window.CONFIG.TICK_INTERVAL_MS / 1000);
        this.testCannon.currentCharge += chargeIncrement;

        // 4. 更新 UI 进度条
        const chargeBar = document.getElementById('charge-bar');
        if (chargeBar) {
            chargeBar.value = this.testCannon.currentCharge;
        }

        // 5. 触发开火判定
        if (this.testCannon.currentCharge >= this.testCannon.capacity) {
            this.fireWeapon(pEff, pWaste);
        }
    }

    fireWeapon(pEff, pWaste) {
        // 清零充能
        this.testCannon.currentCharge = 0;
        
        // 计算实际运作周期 T (用于后续热量计算)
        const actualT = this.testCannon.capacity / pEff;
        
        console.warn(`🔥 动能机炮开火！[有效功率: ${pEff.toFixed(1)} MW | 实际射速: ${actualT.toFixed(2)} 秒/发]`);
    }
}

window.onload = () => {
    const engine = new GameEngine();
    engine.start();
};
