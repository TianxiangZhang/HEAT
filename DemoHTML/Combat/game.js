// ==========================================
// 1. 虚拟控制台劫持 (保持不变)
// ==========================================
const consoleOutput = document.getElementById('console-output');
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

function appendToConsole(msg, className = '') {
    const logLine = document.createElement('div');
    logLine.style.whiteSpace = 'pre-wrap'; 
    logLine.textContent = msg;
    if (className) logLine.classList.add(className);
    consoleOutput.appendChild(logLine);
    consoleOutput.scrollTop = consoleOutput.scrollHeight; 
}

function formatArgs(args) {
    return args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg).join(' ');
}

console.log = function(...args) { originalLog.apply(console, args); appendToConsole(formatArgs(args)); };
console.warn = function(...args) { originalWarn.apply(console, args); appendToConsole(formatArgs(args), 'log-warn'); };
console.error = function(...args) { originalError.apply(console, args); appendToConsole(formatArgs(args), 'log-error'); };

// ==========================================
// 2. 实体类定义 (保持不变)
// ==========================================
class Module {
    constructor(name, standardPower, capacity, baseHeat) {
        this.name = name; this.standardPower = standardPower; 
        this.capacity = capacity; this.baseHeat = baseHeat; this.currentCharge = 0;             
    }
}
class Compartment {
    constructor(name, hp, heatBuffer, dissipationRate) {
        this.name = name; this.hp = hp; this.heatBuffer = heatBuffer;       
        this.dissipationRate = dissipationRate; this.currentHeat = 0; this.modules = [];                  
    }
    addModule(mod) { this.modules.push(mod); }
}
class Ship {
    constructor(name, globalHp, cpu, maxPower, baseSignature) {
        this.name = name; this.globalHp = globalHp; this.cpu = cpu;                     
        this.maxPower = maxPower; this.baseSignature = baseSignature; this.compartments = [];
    }
    addCompartment(comp) { this.compartments.push(comp); }
}

// ==========================================
// 3. 核心引擎类 (新增 Phase 4 热量系统)
// ==========================================
class GameEngine {
    constructor() {
        this.tickCount = 0;
        this.isRunning = false;
        this.tickInterval = null;
        this.playerShip = null;
        this.testBay = null;    // 保存武器舱的快捷引用
        this.testCannon = null;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log("🚀 HEAT 热力学引擎启动...");
        this.initTestShip();
        this.tickInterval = setInterval(() => { this.tick(); }, window.CONFIG.TICK_INTERVAL_MS);
    }

    initTestShip() {
        this.playerShip = new Ship("雨燕级", 800, 100, 55, 30);
        this.testBay = new Compartment("武器舱", 800, 150, 20); // 散热 20/s，热容 150
        this.testCannon = new Module("测试动能机炮", 10, 30, 15);
        this.testBay.addModule(this.testCannon);
        this.playerShip.addCompartment(this.testBay);
        console.log("✅ 靶机装配完成，监控系统上线。");
    }

    stop() {
        this.isRunning = false;
        clearInterval(this.tickInterval);
        console.warn("⏸️ 引擎已停机");
    }

    tick() {
        this.tickCount++;
        const dt = window.CONFIG.TICK_INTERVAL_MS / 1000; // 0.1秒
        
        // 1. 读取 UI 滑块
        const powerSlider = document.getElementById('power-slider');
        if (!powerSlider) return; 
        const pIn = parseFloat(powerSlider.value);
        
        // 2. 功率分配计算
        let pEff = 0; let pWaste = 0;
        if (pIn <= this.testCannon.standardPower) {
            pEff = pIn;
        } else {
            pEff = this.testCannon.standardPower + (pIn - this.testCannon.standardPower) * window.CONFIG.GLOBAL_OVERLOAD_EFFICIENCY;
        }
        pWaste = pIn - pEff;

        // 3. 增加充能
        this.testCannon.currentCharge += pEff * dt;
        if (this.testCannon.currentCharge >= this.testCannon.capacity) {
            this.fireWeapon(pEff, pWaste);
        }

        // --- Phase 4 核心：热量衰减与熔断判定 ---
        
        // 4. 自然散热 (每 Tick 减少散热效率的 1/10)
        this.testBay.currentHeat -= this.testBay.dissipationRate * dt;
        if (this.testBay.currentHeat < 0) this.testBay.currentHeat = 0;

        // 5. 过热惩罚判定
        if (this.testBay.currentHeat > this.testBay.heatBuffer) {
            const excessHeat = this.testBay.currentHeat - this.testBay.heatBuffer;
            const dmgPerSec = excessHeat * window.CONFIG.GLOBAL_OVERHEAT_DMG_COEFF;
            
            // 将伤害均摊到每个 Tick 扣除
            this.playerShip.globalHp -= dmgPerSec * dt;

            // 每 10 个 Tick (1秒) 打印一次警告，避免刷屏卡顿
            if (this.tickCount % 10 === 0) {
                console.error(`⚠️ 武器舱过热！当前热量: ${this.testBay.currentHeat.toFixed(1)}，结构值受损: -${dmgPerSec.toFixed(1)}/秒`);
            }

            // 殉爆判定
            if (this.playerShip.globalHp <= 0) {
                this.playerShip.globalHp = 0;
                this.updateUI(); // 死亡前最后更新一次画面
                console.error("💥 舰船全局结构值归零，发生致命殉爆！");
                this.stop(); 
                return;
            }
        }

        // 6. 更新全部 UI
        this.updateUI();
    }

    fireWeapon(pEff, pWaste) {
        this.testCannon.currentCharge = 0;
        const actualT = this.testCannon.capacity / pEff;
        
        // --- Phase 4 核心：产热计算 ---
        // 公式：基础单次产热 + (浪费功率 * 产热倍率 * 实际运作周期时间)
        const heatGenerated = this.testCannon.baseHeat + (pWaste * window.CONFIG.GLOBAL_WASTE_TO_HEAT_COEFF * actualT);
        this.testBay.currentHeat += heatGenerated;

        console.warn(`🔥 开火！[射速: ${actualT.toFixed(2)}s | 产热: +${heatGenerated.toFixed(1)}]`);
    }

    updateUI() {
        const chargeBar = document.getElementById('charge-bar');
        const heatBar = document.getElementById('heat-bar');
        const heatVal = document.getElementById('heat-val');
        const hpBar = document.getElementById('hp-bar');
        const hpVal = document.getElementById('hp-val');

        if (chargeBar) chargeBar.value = this.testCannon.currentCharge;
        
        if (heatBar && heatVal) {
            heatBar.value = this.testBay.currentHeat;
            heatVal.innerText = this.testBay.currentHeat.toFixed(1);
            // 超过阈值变红警告
            heatVal.style.color = this.testBay.currentHeat > this.testBay.heatBuffer ? '#ff3333' : '#ffcc00';
        }
        
        if (hpBar && hpVal) {
            hpBar.value = this.playerShip.globalHp;
            hpVal.innerText = this.playerShip.globalHp.toFixed(0);
        }
    }
}

window.onload = () => {
    const engine = new GameEngine();
    engine.start();
};
