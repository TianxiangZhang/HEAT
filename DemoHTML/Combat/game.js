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

function formatArgs(args) { return args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg).join(' '); }
console.log = function(...args) { originalLog.apply(console, args); appendToConsole(formatArgs(args)); };
console.warn = function(...args) { originalWarn.apply(console, args); appendToConsole(formatArgs(args), 'log-warn'); };
console.error = function(...args) { originalError.apply(console, args); appendToConsole(formatArgs(args), 'log-error'); };

// ==========================================
// 2. 实体类定义
// ==========================================
class Module {
    constructor(name, standardPower, capacity, baseHeat, damage = 0) {
        this.name = name; this.standardPower = standardPower; 
        this.capacity = capacity; this.baseHeat = baseHeat; this.damage = damage; this.currentCharge = 0;             
    }
}
class Compartment {
    constructor(name, hp, heatBuffer, dissipationRate, shockConduction = 0.2) {
        this.name = name; this.hp = hp; this.maxHp = hp;
        this.heatBuffer = heatBuffer; this.dissipationRate = dissipationRate; 
        this.shockConduction = shockConduction; this.currentHeat = 0; this.modules = [];                  
    }
    addModule(mod) { this.modules.push(mod); }
}
class Ship {
    constructor(name, globalHp, cpu, maxPower, baseSignature, shieldCap = 200, armor = 10) {
        this.name = name; this.globalHp = globalHp; this.maxHp = globalHp;
        this.cpu = cpu; this.maxPower = maxPower; this.baseSignature = baseSignature; 
        this.shieldCapacity = shieldCap; this.currentShield = shieldCap; this.armorHardness = armor;         
        this.compartments = []; this.isDestroyed = false;
    }
    addCompartment(comp) { this.compartments.push(comp); }
}

// ==========================================
// 3. 核心引擎类
// ==========================================
class GameEngine {
    constructor() {
        this.tickCount = 0; this.isRunning = false; this.tickInterval = null;
        this.playerShip = null; this.playerBay = null; this.playerCannon = null;
        this.enemyShip = null; this.enemyBay = null;
        this.currentResolution = 100;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log("🚀 HEAT 引擎启动：精准雷达公式加载完毕...");
        this.initBattle();
        this.tickInterval = setInterval(() => { this.tick(); }, window.CONFIG.TICK_INTERVAL_MS);
    }

    initBattle() {
        this.playerShip = new Ship("我方-雨燕级", 800, 100, 55, 30, 200, 10);
        this.playerBay = new Compartment("武器舱", 800, 150, 20, 0.2);
        this.playerCannon = new Module("动能机炮", 10, 30, 15, 100); 
        this.playerBay.addModule(this.playerCannon);
        this.playerShip.addCompartment(this.playerBay);

        this.enemyShip = new Ship("敌方-靶机", 800, 100, 55, 30, 200, 10);
        this.enemyBay = new Compartment("核心舱", 800, 150, 20, 0.2);
        this.enemyShip.addCompartment(this.enemyBay);
        this.updateUI();
    }

    stop() {
        this.isRunning = false;
        clearInterval(this.tickInterval);
    }

    tick() {
        if (this.playerShip.isDestroyed || this.enemyShip.isDestroyed) return;
        this.tickCount++;
        const dt = window.CONFIG.TICK_INTERVAL_MS / 1000; 

        // ---- Phase 6 核心：严格依据设计案公式解算雷达 ----
        const distSlider = document.getElementById('dist-slider');
        const speedSlider = document.getElementById('speed-slider');
        if (distSlider && speedSlider) {
            const distance = parseFloat(distSlider.value);
            const targetSpeed = parseFloat(speedSlider.value);

            const radarStrength = 15;        // 通用雷达强度
            const maxLockRange = 3000;       // 最远锁定距离
            const bandMatch = 1.0;           // 频段匹配 (默认区间内)

            // 1. 多普勒扰动系数 = V_threshold / MAX(V_current, V_threshold)
            const dopplerFactor = window.CONFIG.DOPPLER_THRESHOLD / Math.max(targetSpeed, window.CONFIG.DOPPLER_THRESHOLD);
            
            // 2. 距离断崖惩罚：1.0 (射程内)；若超出射程 = (最远锁定距离 / 实际距离)^2
            let distancePenalty = 1.0;
            if (distance > maxLockRange) {
                distancePenalty = Math.pow(maxLockRange / distance, 2);
            }

            // 3. 有效锁定值 = (雷达解析强度 * 频段匹配 * 距离惩罚 * 目标信号半径) * 多普勒扰动系数
            const effectiveLockValue = (radarStrength * bandMatch * distancePenalty * this.enemyShip.baseSignature) * dopplerFactor;
            
            // 4. 最终解析度 = 有效锁定值 / (有效锁定值 + 100)
            const resolutionValue = (effectiveLockValue / (effectiveLockValue + 100)) * 100;
            this.currentResolution = Math.min(100, Math.max(0, resolutionValue));
        }

        // ---- 武器充能与热量管理 (保持不变) ----
        const powerSlider = document.getElementById('power-slider');
        if (!powerSlider) return; 
        const pIn = parseFloat(powerSlider.value);
        let pEff = pIn <= this.playerCannon.standardPower ? pIn : this.playerCannon.standardPower + (pIn - this.playerCannon.standardPower) * window.CONFIG.GLOBAL_OVERLOAD_EFFICIENCY;
        let pWaste = pIn - pEff;

        this.playerCannon.currentCharge += pEff * dt;
        if (this.playerCannon.currentCharge >= this.playerCannon.capacity) {
            this.fireWeapon(pEff, pWaste);
        }

        this.playerBay.currentHeat = Math.max(0, this.playerBay.currentHeat - this.playerBay.dissipationRate * dt);
        if (this.playerBay.currentHeat > this.playerBay.heatBuffer) {
            const excessHeat = this.playerBay.currentHeat - this.playerBay.heatBuffer;
            const dmgPerSec = excessHeat * window.CONFIG.GLOBAL_OVERHEAT_DMG_COEFF;
            this.playerShip.globalHp -= dmgPerSec * dt;
            if (this.playerShip.globalHp <= 0) {
                this.playerShip.globalHp = 0; this.playerShip.isDestroyed = true;
                this.updateUI(); console.error("💥 我方过热殉爆！"); this.stop(); return;
            }
        }
        this.updateUI();
    }

    fireWeapon(pEff, pWaste) {
        this.playerCannon.currentCharge = 0;
        const actualT = this.playerCannon.capacity / pEff;
        const heatGenerated = this.playerCannon.baseHeat + (pWaste * window.CONFIG.GLOBAL_WASTE_TO_HEAT_COEFF * actualT);
        this.playerBay.currentHeat += heatGenerated;

        if (this.currentResolution < 20) {
            console.warn(`💨 信号丢失！解析度仅为 ${this.currentResolution.toFixed(1)}%，火控脱锁，攻击偏离！`);
            return; 
        }

        const roll = Math.random() * 100;
        if (roll > this.currentResolution) {
            console.warn(`🎲 差之毫厘！(解析度 ${this.currentResolution.toFixed(1)}%，掷出 ${roll.toFixed(1)})`);
            return;
        }

        let incomingDmg = this.playerCannon.damage;
        let logMsg = `🔥 命中！原始伤害: ${incomingDmg} -> `;

        if (this.enemyShip.currentShield > 0) {
            if (incomingDmg <= this.enemyShip.currentShield) {
                this.enemyShip.currentShield -= incomingDmg;
                logMsg += `护盾吸收 ${incomingDmg}。`; incomingDmg = 0;
            } else {
                incomingDmg -= this.enemyShip.currentShield;
                logMsg += `护盾破裂，残余穿透 -> `; this.enemyShip.currentShield = 0;
            }
        }

        if (incomingDmg > 0) {
            let netDmg = Math.max(0, incomingDmg - this.enemyShip.armorHardness);
            logMsg += `装甲抵消 ${this.enemyShip.armorHardness}，净伤害 ${netDmg}。`;
            if (netDmg > 0) {
                this.enemyBay.hp -= netDmg; this.enemyShip.globalHp -= netDmg;
            }
        }
        console.log(logMsg);

        if (this.enemyShip.globalHp <= 0) {
            this.enemyShip.globalHp = 0; this.enemyShip.isDestroyed = true;
            this.updateUI(); console.error(`💥 敌舰解体！`); this.stop();
        }
    }

    updateUI() {
        document.getElementById('enemy-shield-bar').value = this.enemyShip.currentShield;
        document.getElementById('enemy-hp-bar').value = this.enemyShip.globalHp;
        document.getElementById('player-shield-bar').value = this.playerShip.currentShield;
        document.getElementById('player-hp-bar').value = this.playerShip.globalHp;
        
        const heatBar = document.getElementById('player-heat-bar');
        const heatVal = document.getElementById('player-heat-val');
        if (heatBar) heatBar.value = this.playerBay.currentHeat;
        if (heatVal) {
            heatVal.innerText = this.playerBay.currentHeat.toFixed(1);
            heatVal.style.color = this.playerBay.currentHeat > this.playerBay.heatBuffer ? '#ff3333' : '#ffcc00';
        }

        const chargeBar = document.getElementById('charge-bar');
        if (chargeBar) chargeBar.value = this.playerCannon.currentCharge;

        const resBar = document.getElementById('res-bar');
        const resVal = document.getElementById('res-val');
        if (resBar) resBar.value = this.currentResolution;
        if (resVal) {
            resVal.innerText = this.currentResolution.toFixed(1);
            if (this.currentResolution < 20) resVal.style.color = '#ff3333';
            else if (this.currentResolution < 80) resVal.style.color = '#ffcc00';
            else resVal.style.color = '#00ffcc';
        }
    }
}

window.onload = () => { const engine = new GameEngine(); engine.start(); };
