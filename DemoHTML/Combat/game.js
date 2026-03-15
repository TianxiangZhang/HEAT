// ==========================================
// 1. 虚拟控制台劫持
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
// 2. Phase 5: 扩充实体类 (加入防御与伤害属性)
// ==========================================
class Module {
    constructor(name, standardPower, capacity, baseHeat, damage = 0) {
        this.name = name; 
        this.standardPower = standardPower; 
        this.capacity = capacity; 
        this.baseHeat = baseHeat; 
        this.damage = damage;         // 新增：武器单发伤害
        this.currentCharge = 0;             
    }
}

class Compartment {
    constructor(name, hp, heatBuffer, dissipationRate, shockConduction = 0.2) {
        this.name = name; 
        this.hp = hp;                 
        this.maxHp = hp;
        this.heatBuffer = heatBuffer;       
        this.dissipationRate = dissipationRate; 
        this.shockConduction = shockConduction; // 新增：冲击传导率 (默认 20%)
        this.currentHeat = 0;               
        this.modules = [];                  
    }
    addModule(mod) { this.modules.push(mod); }
}

class Ship {
    constructor(name, globalHp, cpu, maxPower, baseSignature, shieldCap = 200, armor = 10) {
        this.name = name; 
        this.globalHp = globalHp; 
        this.maxHp = globalHp;
        this.cpu = cpu;                     
        this.maxPower = maxPower;           
        this.baseSignature = baseSignature; 
        this.shieldCapacity = shieldCap;    // 新增：护盾容量
        this.currentShield = shieldCap;     // 新增：当前护盾
        this.armorHardness = armor;         // 新增：全局装甲硬度
        this.compartments = [];
        this.isDestroyed = false;
    }
    addCompartment(comp) { this.compartments.push(comp); }
}

// ==========================================
// 3. 核心引擎类 (实装伤害结算)
// ==========================================
class GameEngine {
    constructor() {
        this.tickCount = 0;
        this.isRunning = false;
        this.tickInterval = null;
        
        this.playerShip = null;
        this.playerBay = null;
        this.playerCannon = null;
        
        this.enemyShip = null;
        this.enemyBay = null;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log("🚀 HEAT 战斗结算引擎启动...");
        this.initBattle();
        this.tickInterval = setInterval(() => { this.tick(); }, window.CONFIG.TICK_INTERVAL_MS);
    }

    initBattle() {
        // 1. 初始化我方舰船 (包含一把 100 伤害的动能机炮)
        this.playerShip = new Ship("我方-雨燕级", 800, 100, 55, 30, 200, 10);
        this.playerBay = new Compartment("武器舱", 800, 150, 20, 0.2);
        this.playerCannon = new Module("动能机炮", 10, 30, 15, 100); 
        this.playerBay.addModule(this.playerCannon);
        this.playerShip.addCompartment(this.playerBay);

        // 2. 初始化敌方靶机 (无反击能力，单纯承伤)
        this.enemyShip = new Ship("敌方-靶机", 800, 100, 55, 30, 200, 10);
        this.enemyBay = new Compartment("核心舱", 800, 150, 20, 0.2);
        this.enemyShip.addCompartment(this.enemyBay);

        console.log("⚔️ 战斗初始化完毕。敌我双方护盾与装甲均已上线。");
        this.updateUI();
    }

    stop() {
        this.isRunning = false;
        clearInterval(this.tickInterval);
        console.warn("⏸️ 战斗结束，引擎停机");
    }

    tick() {
        if (this.playerShip.isDestroyed || this.enemyShip.isDestroyed) return;

        this.tickCount++;
        const dt = window.CONFIG.TICK_INTERVAL_MS / 1000; 
        
        // ---- 1. 我方武器充能与调度 ----
        const powerSlider = document.getElementById('power-slider');
        if (!powerSlider) return; 
        const pIn = parseFloat(powerSlider.value);
        
        let pEff = 0; let pWaste = 0;
        if (pIn <= this.playerCannon.standardPower) {
            pEff = pIn;
        } else {
            pEff = this.playerCannon.standardPower + (pIn - this.playerCannon.standardPower) * window.CONFIG.GLOBAL_OVERLOAD_EFFICIENCY;
        }
        pWaste = pIn - pEff;

        this.playerCannon.currentCharge += pEff * dt;
        if (this.playerCannon.currentCharge >= this.playerCannon.capacity) {
            this.fireWeapon(pEff, pWaste, this.playerCannon, this.playerBay, this.playerShip, this.enemyShip, this.enemyBay);
        }

        // ---- 2. 我方热量结算 ----
        this.playerBay.currentHeat -= this.playerBay.dissipationRate * dt;
        if (this.playerBay.currentHeat < 0) this.playerBay.currentHeat = 0;

        if (this.playerBay.currentHeat > this.playerBay.heatBuffer) {
            const excessHeat = this.playerBay.currentHeat - this.playerBay.heatBuffer;
            const dmgPerSec = excessHeat * window.CONFIG.GLOBAL_OVERHEAT_DMG_COEFF;
            this.playerShip.globalHp -= dmgPerSec * dt;

            if (this.tickCount % 10 === 0) {
                console.error(`⚠️ 我方过热受损！结构值: -${dmgPerSec.toFixed(1)}/秒`);
            }
            if (this.playerShip.globalHp <= 0) {
                this.playerShip.globalHp = 0;
                this.playerShip.isDestroyed = true;
                this.updateUI();
                console.error("💥 我方舰船过热殉爆！");
                this.stop(); 
                return;
            }
        }

        this.updateUI();
    }

    // 执行开火与伤害结算链路
    fireWeapon(pEff, pWaste, weapon, sourceBay, sourceShip, targetShip, targetCompartment) {
        weapon.currentCharge = 0;
        const actualT = weapon.capacity / pEff;
        
        // 产热
        const heatGenerated = weapon.baseHeat + (pWaste * window.CONFIG.GLOBAL_WASTE_TO_HEAT_COEFF * actualT);
        sourceBay.currentHeat += heatGenerated;

        // ---- Phase 5 核心：伤害模型 ----
        let incomingDmg = weapon.damage;
        let logMsg = `🔥 命中！原始伤害: ${incomingDmg} -> `;

        // 1. 护盾削减
        if (targetShip.currentShield > 0) {
            if (incomingDmg <= targetShip.currentShield) {
                targetShip.currentShield -= incomingDmg;
                logMsg += `护盾吸收 ${incomingDmg}。`;
                incomingDmg = 0;
            } else {
                incomingDmg -= targetShip.currentShield;
                logMsg += `护盾破裂 (吸收 ${targetShip.currentShield.toFixed(0)})，残余穿透 -> `;
                targetShip.currentShield = 0;
            }
        }

        // 2. 装甲与结构承伤
        if (incomingDmg > 0) {
            // 装甲提供固定值减伤
            let netDmg = Math.max(0, incomingDmg - targetShip.armorHardness);
            logMsg += `装甲抵消 ${targetShip.armorHardness}，净伤害 ${netDmg}。`;

            if (netDmg > 0) {
                // 扣减局部舱段和全局结构值 1:1
                targetCompartment.hp -= netDmg;
                targetShip.globalHp -= netDmg;
                
                // 计算内透震荡伤害
                let shockDmg = netDmg * targetCompartment.shockConduction;
                logMsg += ` (触发内透震荡: ${shockDmg.toFixed(1)})`;
            }
        }

        console.log(logMsg);

        // 3. 击毁判定
        if (targetShip.globalHp <= 0) {
            targetShip.globalHp = 0;
            targetShip.isDestroyed = true;
            this.updateUI();
            console.error(`💥 敌舰【${targetShip.name}】结构值归零，发生解体！`);
            this.stop();
        }
    }

    updateUI() {
        // 敌舰 UI
        document.getElementById('enemy-shield-bar').value = this.enemyShip.currentShield;
        document.getElementById('enemy-shield-val').innerText = this.enemyShip.currentShield.toFixed(0);
        document.getElementById('enemy-hp-bar').value = this.enemyShip.globalHp;
        document.getElementById('enemy-hp-val').innerText = this.enemyShip.globalHp.toFixed(0);

        // 我舰 UI
        document.getElementById('player-shield-bar').value = this.playerShip.currentShield;
        document.getElementById('player-hp-bar').value = this.playerShip.globalHp;
        
        const heatBar = document.getElementById('player-heat-bar');
        const heatVal = document.getElementById('player-heat-val');
        heatBar.value = this.playerBay.currentHeat;
        heatVal.innerText = this.playerBay.currentHeat.toFixed(1);
        heatVal.style.color = this.playerBay.currentHeat > this.playerBay.heatBuffer ? '#ff3333' : '#ffcc00';

        // 武器 UI
        const chargeBar = document.getElementById('charge-bar');
        if (chargeBar) chargeBar.value = this.playerCannon.currentCharge;
    }
}

window.onload = () => {
    const engine = new GameEngine();
    engine.start();
};
