// 全局常数设定字典
const CONFIG = {
    // 能源与热量管理核心参数
    [span_0](start_span)GLOBAL_OVERLOAD_EFFICIENCY: 0.5,   // 全局过载折损系数：50%[span_0](end_span)
    [span_1](start_span)GLOBAL_WASTE_TO_HEAT_COEFF: 2.0,   // 全局过载转化系数：2.0 热量/MW[span_1](end_span)
    [span_2](start_span)GLOBAL_OVERHEAT_DMG_COEFF: 0.5,    // 全局过热伤害系数：0.5[span_2](end_span)
    
    // 空间与锁定博弈参数
    [span_3](start_span)DOPPLER_THRESHOLD: 100,            // 多普勒起效阈值：100 m/s[span_3](end_span)
    
    // 引擎底层运行参数
    [span_4](start_span)TICK_RATE: 10,                     // 每秒运行 10 次的底层 AI 决策频率[span_4](end_span)
    TICK_INTERVAL_MS: 100              // 每个 Tick 对应 100 毫秒 (1000ms / 10)
};
