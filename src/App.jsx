import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Dumbbell, Info, Trophy, AlertCircle, ChevronUp, ChevronDown, User, Flame, CheckCircle2, Share2, Clock } from 'lucide-react';
// --- 初始資料結構 ---
const initialMemberState = {
  name: '',
  gender: 'male',
  height: '',
  initialWeight: '',
  initialFat: '',
  currentWeight: '',
  currentFat: ''
};

const defaultMembers = [
  { ...initialMemberState, id: 0, name: '隊員 A' },
  { ...initialMemberState, id: 1, name: '隊員 B' },
  { ...initialMemberState, id: 2, name: '隊員 C' },
  { ...initialMemberState, id: 3, name: '隊員 D' },
];


// --- 寫在 defaultMembers 下方，export default function App() 的上方 ---
const getBmiInfo = (weight, height, gender) => {
  const w = parseFloat(weight);
  const h = parseFloat(height) / 100;
  if (!w || !h || h <= 0) return null;
  
  const bmi = w / (h * h);
  let zone = '標準';
  let colorClass = 'text-green-600 bg-green-100'; // 預設標準顏色

  if (gender === 'male') {
    if (bmi > 30) { zone = '紅區'; colorClass = 'text-red-600 bg-red-100'; }
    else if (bmi > 29) { zone = '橙區'; colorClass = 'text-orange-600 bg-orange-100'; }
    else if (bmi > 27) { zone = '黃區'; colorClass = 'text-yellow-600 bg-yellow-100'; }
  } else {
    if (bmi > 26) { zone = '紅區'; colorClass = 'text-red-600 bg-red-100'; }
    else if (bmi > 25) { zone = '橙區'; colorClass = 'text-orange-600 bg-orange-100'; }
    else if (bmi > 24) { zone = '黃區'; colorClass = 'text-yellow-600 bg-yellow-100'; }
  }
  return { bmi: bmi.toFixed(1), zone, colorClass };
};

export default function App() {
  // --- 狀態管理 ---
  const [teamName, setTeamName] = useState('');
  const [members, setMembers] = useState(defaultMembers);
  const [expandedId, setExpandedId] = useState(0); // 預設展開第一位
  const [showRules, setShowRules] = useState(false);
  const [showDatesModal, setShowDatesModal] = useState(false); // 新增：控制時程表彈出視窗
  const [copyStatus, setCopyStatus] = useState('');

  // --- 計算倒數天數 ---
  const daysLeft = useMemo(() => {
    // 假設最終後測截止日為 2026-05-31 (請依實際情況修改)
    const endDate = new Date('2026-05-31T23:59:59');
    const today = new Date();
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0; // 若已結束則顯示 0
  }, []);

  // --- LocalStorage 存取 ---
  useEffect(() => {
    const savedData = localStorage.getItem('health-leverage-3-data');
    if (savedData) {
      try {
        const { teamName: savedName, members: savedMembers } = JSON.parse(savedData);
        if (savedName) setTeamName(savedName);
        if (savedMembers && savedMembers.length === 4) setMembers(savedMembers);
      } catch (e) {
        console.error("Failed to parse saved data", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('health-leverage-3-data', JSON.stringify({ teamName, members }));
  }, [teamName, members]);

  // --- 核心運算邏輯 (即時計算) ---
  const teamStats = useMemo(() => {
    let validMembersCount = 0;
    let membersMeetingWeightGoal = 0;
    let totalFatDrop = 0;
    let totalPersonalScore = 0;

    const processedMembers = members.map(m => {
      const heightM = parseFloat(m.height) / 100;
      const initW = parseFloat(m.initialWeight);
      const currW = parseFloat(m.currentWeight);
      const initFat = parseFloat(m.initialFat);
      const currFat = parseFloat(m.currentFat);

      // 檢查是否填寫完整且數值合理
      const isValid = heightM > 0 && initW > 0 && currW > 0 && !isNaN(initFat) && !isNaN(currFat) && initFat > 0 && currFat > 0;

      if (!isValid) {
        return { ...m, isValid: false, stats: null };
      }

      validMembersCount++;
      const weightDrop = initW - currW;
      const initBMI = initW / (heightM * heightM);
      const currBMI = currW / (heightM * heightM);
      const bmiDrop = initBMI - currBMI;
      const fatDrop = initFat - currFat;

      const baseLeverage = m.gender === 'male' ? 24 : 21;
      const actualLeverage = Math.max(initBMI - baseLeverage, 2);
      
      const score = (bmiDrop * 10 * actualLeverage) + (fatDrop * 10);

      if (weightDrop >= 1) membersMeetingWeightGoal++;
      totalFatDrop += fatDrop;
      totalPersonalScore += score;

      return {
        ...m,
        isValid: true,
        stats: {
          weightDrop: weightDrop.toFixed(1),
          bmiDrop: bmiDrop.toFixed(2),
          fatDrop: fatDrop.toFixed(1),
          leverage: actualLeverage.toFixed(1),
          score: Math.max(0, Math.round(score)) // 分數不為負
        }
      };
    });

    const isWeightGoalMet = membersMeetingWeightGoal === 4;
    const isFatGoalMet = totalFatDrop > 15;

    let multiplier = 1.0;
    let teamTier = "參加獎";
    
    // 嚴格判定：必須 4 人都有效資料才給予加成判定
    if (validMembersCount === 4) {
      if (isWeightGoalMet && isFatGoalMet) {
        multiplier = 1.5;
        teamTier = "傳奇團隊";
      } else if (isWeightGoalMet) {
        multiplier = 1.3;
        teamTier = "精實團隊";
      }
    }

    // 平均分以 4 人計算 (強迫湊滿4人)
    const avgScore = validMembersCount === 4 ? (totalPersonalScore / 4) : 0;
    const finalScore = Math.round(avgScore * multiplier);

    return {
      members: processedMembers,
      validMembersCount,
      membersMeetingWeightGoal,
      totalFatDrop: totalFatDrop.toFixed(1),
      isWeightGoalMet,
      isFatGoalMet,
      multiplier,
      teamTier,
      finalScore
    };
  }, [members]);

  // --- 事件處理 ---
  const handleMemberChange = (id, field, value) => {
    const newMembers = [...members];
    newMembers[id] = { ...newMembers[id], [field]: value };
    setMembers(newMembers);
  };

  const generateShareText = () => {
    let text = `🏆【2026減重競賽】最新戰報！${teamName ? `\n🏷️ 隊伍：${teamName}` : ''}\n`;
    text += `🔥 目前團隊總分：${teamStats.finalScore} 分 (倍率 x${teamStats.multiplier})\n\n`;
    
    text += `📊 團隊加成任務：\n`;
    text += `${teamStats.isWeightGoalMet ? '✅' : '❌'} 全員減重大於 1kg (${teamStats.membersMeetingWeightGoal}/4達成)\n`;
    text += `${teamStats.isFatGoalMet ? '✅' : '❌'} 體脂降幅大於 15% (累計 ${teamStats.totalFatDrop}%)\n\n`;

    text += `👤 隊員個別貢獻：\n`;
    teamStats.members.forEach(m => {
      if (m.isValid) {
        text += `- ${m.name || '未命名'} (${m.gender === 'male' ? '男' : '女'}): 貢獻 ${m.stats.score}分 (槓桿 ${m.stats.leverage}x)\n`;
      } else {
        text += `- ${m.name || '未命名'}: 資料未齊全\n`;
      }
    });

    text += `\n💪 繼續加油，脂肪殺手們！\n👉 點此模擬分數：https://donald0124.github.io/JJBS/`;
    return text;
  };

  const handleCopy = () => {
    const text = generateShareText();
    // 使用 fallback 方法以支援 iframe 環境
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopyStatus('已複製到剪貼簿！');
      setTimeout(() => setCopyStatus(''), 3000);
    } catch (err) {
      console.error('複製失敗', err);
      setCopyStatus('複製失敗，請手動複製');
      setTimeout(() => setCopyStatus(''), 3000);
    }
    document.body.removeChild(textArea);
  };

  const clearData = () => {
      setTeamName('');
      setMembers(defaultMembers);
      setExpandedId(0);
  }

  // --- UI 元件 ---
  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-800">
      
      {/* --- Top Header --- */}
      <header className="bg-blue-600 text-white p-4 shadow-md rounded-b-2xl relative z-10">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Dumbbell className="w-6 h-6 text-blue-200" />
                2026減重競賽試算工具
              </h1>
              {/* 新增的倒數計時膠囊按鈕 */}
              <button 
                onClick={() => setShowDatesModal(true)}
                className="mt-2 bg-blue-500/40 hover:bg-blue-400 border border-blue-400/50 text-blue-50 text-[11px] py-1 px-3 rounded-full flex items-center gap-1.5 transition shadow-sm backdrop-blur-sm"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>距離最終結算還剩 <strong className="text-white text-sm">{daysLeft}</strong> 天</span>
              </button>
            </div>
            <button 
              onClick={() => setShowRules(true)}
              className="p-2 bg-blue-500/50 rounded-full hover:bg-blue-400 transition shrink-0"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
                    
          <div className="bg-white/10 rounded-xl p-4 text-center backdrop-blur-sm border border-white/20">
            <p className="text-blue-100 text-sm mb-1">團隊預估總分</p>
            <div className="text-5xl font-extrabold tracking-tight mb-2">
              {teamStats.finalScore}
            </div>
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className={`px-2 py-1 rounded-md font-bold ${
                teamStats.multiplier === 1.5 ? 'bg-yellow-400 text-yellow-900 shadow-[0_0_15px_rgba(250,204,21,0.5)]' :
                teamStats.multiplier === 1.3 ? 'bg-green-400 text-green-900' : 'bg-slate-400 text-slate-900'
              }`}>
                倍率 x {teamStats.multiplier.toFixed(1)}
              </span>
              <span className="text-blue-50 font-medium">({teamStats.teamTier})</span>
            </div>
          </div>

          <div className="mt-4">
            <input 
              type="text" 
              placeholder="輸入隊伍名稱 (選填)..." 
              className="w-full bg-white/10 border border-white/30 rounded-lg px-4 py-2 text-white placeholder-blue-200/70 focus:outline-none focus:ring-2 focus:ring-white/50"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {/* --- 團隊任務儀表板 --- */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            團隊加成任務
          </h2>
          
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-medium">任務 1：全員減重 &ge; 1kg</span>
                <span className={`font-bold ${teamStats.isWeightGoalMet ? 'text-green-500' : 'text-slate-500'}`}>
                  {teamStats.membersMeetingWeightGoal} / 4 人
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full ${teamStats.isWeightGoalMet ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${(teamStats.membersMeetingWeightGoal / 4) * 100}%` }}></div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-medium">任務 2：總降體脂 &gt; 15%</span>
                <span className={`font-bold ${teamStats.isFatGoalMet ? 'text-green-500' : 'text-slate-500'}`}>
                  {teamStats.totalFatDrop}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 relative">
                <div className={`h-2.5 rounded-full ${teamStats.isFatGoalMet ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, (parseFloat(teamStats.totalFatDrop) / 20) * 100)}%` }}></div>
              </div>
            </div>
          </div>
          {teamStats.validMembersCount < 4 && (
            <div className="mt-3 text-xs text-amber-600 flex items-center gap-1 bg-amber-50 p-2 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              需填滿 4 人完整資料才能觸發加成倍率
            </div>
          )}
        </section>

        {/* --- 隊員資料區 (手風琴) --- */}
        <section className="space-y-3">
          {teamStats.members.map((member, index) => {
            const isExpanded = expandedId === index;
            const hasWarning = member.isValid && parseFloat(member.stats.weightDrop) < 1;
            
            return (
              <div key={member.id} className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${hasWarning ? 'border-red-200' : 'border-slate-200'} ${isExpanded ? 'shadow-md ring-1 ring-blue-500/20' : 'shadow-sm'}`}>
                
                {/* Accordion Header */}
                <button 
                  className="w-full p-4 flex justify-between items-center bg-white text-left focus:outline-none"
                  onClick={() => setExpandedId(isExpanded ? null : index)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${member.gender === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{member.name || `隊員 ${index + 1}`}</span>
                        {hasWarning && <AlertCircle className="w-4 h-4 text-red-500" />}
                      </div>
                      <div className="text-xs text-slate-500">
                        {member.isValid ? (
                          <span>槓桿 {member.stats.leverage}x | 貢獻 <span className="font-bold text-blue-600">{member.stats.score}</span> 分</span>
                        ) : (
                          <span>請輸入資料</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>

                {/* Accordion Body */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-slate-50 bg-slate-50/50">
                    <div className="grid grid-cols-2 gap-3 mb-4 mt-3">
                      <div className="col-span-2 flex gap-2">
                        <input 
                          type="text" 
                          placeholder="姓名/暱稱"
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={member.name}
                          onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                        />
                        <select 
                          className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={member.gender}
                          onChange={(e) => handleMemberChange(index, 'gender', e.target.value)}
                        >
                          <option value="male">男生</option>
                          <option value="female">女生</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                         <label className="block text-xs text-slate-500 mb-1">身高 (cm)</label>
                         <input type="number" step="0.1" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" value={member.height} onChange={(e) => handleMemberChange(index, 'height', e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* 前測區塊 */}
                      <div className="bg-slate-100 p-3 rounded-xl border border-slate-200/60">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-slate-500">前測基準</span>
                          {(() => {
                            const info = getBmiInfo(member.initialWeight, member.height, member.gender);
                            if (!info) return null;
                            return (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${info.colorClass}`}>
                                BMI {info.bmi} ({info.zone})
                              </span>
                            );
                          })()}
                        </div>
                        <div className="space-y-2">
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-0.5">體重 (kg)</label>
                            <input type="number" step="0.1" className="w-full bg-white border-transparent rounded-md px-2 py-1.5 text-sm" value={member.initialWeight} onChange={(e) => handleMemberChange(index, 'initialWeight', e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-0.5">體脂 (%)</label>
                            <input type="number" step="0.1" className="w-full bg-white border-transparent rounded-md px-2 py-1.5 text-sm" value={member.initialFat} onChange={(e) => handleMemberChange(index, 'initialFat', e.target.value)} />
                          </div>
                        </div>
                      </div>

                      {/* 最新區塊 */}
                      <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                         <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-blue-600">最新進度</span>
                          {(() => {
                            const info = getBmiInfo(member.currentWeight, member.height, member.gender);
                            if (!info) return null;
                            return (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${info.colorClass}`}>
                                BMI {info.bmi} ({info.zone})
                              </span>
                            );
                          })()}
                        </div>
                        <div className="space-y-2">
                          <div>
                            <label className="block text-[11px] text-blue-400 mb-0.5">體重 (kg)</label>
                            <input type="number" step="0.1" className="w-full bg-white border-transparent rounded-md px-2 py-1.5 text-sm" value={member.currentWeight} onChange={(e) => handleMemberChange(index, 'currentWeight', e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-[11px] text-blue-400 mb-0.5">體脂 (%)</label>
                            <input type="number" step="0.1" className="w-full bg-white border-transparent rounded-md px-2 py-1.5 text-sm" value={member.currentFat} onChange={(e) => handleMemberChange(index, 'currentFat', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 個人成果統計 */}
                    {member.isValid && (
                      <div className="mt-4 bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center justify-between">
                        <div className="flex gap-4">
                          {/* 體重變化 */}
                          <div className="text-center">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">體重變化</div>
                            <div className={`text-sm font-bold ${parseFloat(member.stats.weightDrop) > 0 ? 'text-green-600' : parseFloat(member.stats.weightDrop) < 0 ? 'text-red-500' : 'text-slate-700'}`}>
                              {parseFloat(member.stats.weightDrop) > 0 ? `↓ ${member.stats.weightDrop}` : parseFloat(member.stats.weightDrop) < 0 ? `↑ ${Math.abs(member.stats.weightDrop).toFixed(1)}` : '0.0'} <span className="text-[10px] font-normal">kg</span>
                            </div>
                          </div>

                          {/* 體脂變化 */}
                          <div className="text-center">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">體脂變化</div>
                            <div className={`text-sm font-bold ${parseFloat(member.stats.fatDrop) > 0 ? 'text-green-600' : parseFloat(member.stats.fatDrop) < 0 ? 'text-red-500' : 'text-slate-700'}`}>
                              {parseFloat(member.stats.fatDrop) > 0 ? `↓ ${member.stats.fatDrop}` : parseFloat(member.stats.fatDrop) < 0 ? `↑ ${Math.abs(member.stats.fatDrop).toFixed(1)}` : '0.0'} <span className="text-[10px] font-normal">%</span>
                            </div>
                          </div>

                          {/* BMI 變化 */}
                          <div className="text-center">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">BMI變化</div>
                            <div className={`text-sm font-bold ${parseFloat(member.stats.bmiDrop) > 0 ? 'text-green-600' : parseFloat(member.stats.bmiDrop) < 0 ? 'text-red-500' : 'text-slate-700'}`}>
                              {parseFloat(member.stats.bmiDrop) > 0 ? `↓ ${member.stats.bmiDrop}` : parseFloat(member.stats.bmiDrop) < 0 ? `↑ ${Math.abs(member.stats.bmiDrop).toFixed(2)}` : '0.00'}
                            </div>
                          </div>
                        </div>

                        <div className="text-right pl-2 border-l border-slate-100">
                           <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider flex items-center justify-end gap-1">
                             <Flame className="w-3 h-3" /> 貢獻積分
                           </div>
                           <div className="text-xl font-extrabold text-blue-600">{member.stats.score}</div>
                        </div>
                      </div>
                    )}
                    
                    {hasWarning && (
                       <div className="mt-2 text-[11px] text-red-500 flex items-start gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>注意：此隊員減重未達 1kg，將導致全隊失去加成倍率。</span>
                       </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
        
        <div className="text-center pb-4">
           <button onClick={clearData} className="text-xs text-slate-400 hover:text-red-500 underline">清除所有資料 (重置)</button>
        </div>

      </main>

      {/* --- Bottom Sticky Bar --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 p-4 pb-safe z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="text-xs text-slate-500 font-medium">總結算分數</div>
            <div className="text-2xl font-black text-slate-800 flex items-baseline gap-1">
              {teamStats.finalScore} <span className="text-sm text-blue-500 font-bold">PTS</span>
            </div>
          </div>
          
          <button 
            onClick={handleCopy}
            className="bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30"
          >
            {copyStatus ? <CheckCircle2 className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
            {copyStatus || '一鍵複製戰報'}
          </button>
        </div>
      </div>

      {/* --- 規則彈出視窗 --- */}
      {showRules && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                 <Info className="w-5 h-5" /> 賽制規則說明
              </h3>
              <button onClick={() => setShowRules(false)} className="text-blue-200 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            
            {/* Content Body */}
            <div className="p-5 overflow-y-auto space-y-6 text-sm text-slate-700">
              
              {/* --- 1. 個人積分區塊 --- */}
              <section>
                <h4 className="font-bold text-blue-600 mb-3 border-b border-blue-100 pb-2 text-base">
                  🧮 1. 個人積分完全解析
                </h4>
                
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                  <p className="font-bold text-slate-800 text-xs mb-1">核心計算公式：</p>
                  <p className="text-blue-700 text-xs font-mono break-words">
                    [(BMI降幅 × 10) × 性別槓桿] + [體脂降幅 × 10]
                  </p>
                </div>

                <div className="space-y-4 text-xs leading-relaxed">
                  <div>
                    <strong className="text-slate-800 text-sm block mb-1">🔍 什麼是「性別槓桿」？</strong>
                    <p className="text-slate-600">你的初始體重距離「健康標準」越遠，減下來的每一公斤能為健康帶來越大的紅利，因此系統會給你越高的「加倍係數」。</p>
                    <div className="flex gap-4 mt-2 mb-2 font-medium text-slate-700">
                      <span className="bg-slate-100 px-2 py-1 rounded">👨 男性基準：BMI 24</span>
                      <span className="bg-slate-100 px-2 py-1 rounded">👩 女性基準：BMI 21</span>
                    </div>
                    <div className="bg-blue-50 text-blue-800 p-2.5 rounded-md border border-blue-100">
                      <strong>📍 算法：</strong>「初始 BMI」減去「性別基準線」。<br/>
                      <span className="text-blue-600/80 mt-1 block">例：男性初始 BMI 34，槓桿為 34 - 24 = <strong>10倍</strong>！</span>
                    </div>
                  </div>

                  <div>
                    <strong className="text-slate-800 text-sm block mb-1">🛡️ 最低保底 2 倍</strong>
                    <p className="text-slate-600">不管你多瘦，只要公式算出來小於 2，系統直接給你 <strong>2 倍</strong> 的基礎槓桿。確保身型標準的隊友努力也有分！</p>
                  </div>

                  <div>
                    <strong className="text-slate-800 text-sm block mb-1">🥓 體脂獎勵 (純累計)</strong>
                    <p className="text-slate-600">每降 1% 得 10 分 (不乘槓桿，一視同仁)。這是標準體型隊友最主要的得分來源！</p>
                  </div>
                </div>
              </section>

              {/* --- 2. 團隊加成區塊 --- */}
              <section>
                <h4 className="font-bold text-blue-600 mb-3 border-b border-blue-100 pb-2 text-base">
                  🚀 2. 團隊加成 (Team Multiplier)
                </h4>
                
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-3">
                  <p className="text-blue-700 text-xs font-mono break-words">
                    最終得分 = (全隊個人積分平均) × 加成倍率
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                    <strong className="text-yellow-800 text-sm flex items-center gap-1 mb-1">
                      🏆 x 1.5 傳奇團隊
                    </strong>
                    <ul className="list-disc pl-4 text-yellow-700 space-y-1">
                      <li>全員 4 人體重皆減少 &ge; 1kg</li>
                      <li>全隊「體脂率降幅總和」 &gt; 15%</li>
                    </ul>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                    <strong className="text-green-800 text-sm flex items-center gap-1 mb-1">
                      🔥 x 1.3 精實團隊
                    </strong>
                    <ul className="list-disc pl-4 text-green-700 space-y-1">
                      <li>全員 4 人體重皆減少 &ge; 1kg</li>
                    </ul>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                    <strong className="text-slate-700 text-sm flex items-center gap-1 mb-1">
                      😐 x 1.0 參加獎
                    </strong>
                    <p className="text-slate-500">只要有一人減重少於 1kg，即落入此區間。</p>
                  </div>
                </div>
              </section>
            </div>
            
            {/* Footer / Action */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
               <button 
                 onClick={() => setShowRules(false)} 
                 className="w-full bg-blue-100 text-blue-700 py-3 rounded-xl font-bold text-base hover:bg-blue-200 transition-colors active:scale-[0.98]"
               >
                 我了解了！
               </button>
            </div>
          </div>
        </div>
      )}


      {/* --- 賽程時間表彈出視窗 --- */}
      {showDatesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                 <Calendar className="w-5 h-5 text-blue-400" /> 重要賽程時刻表
              </h3>
              <button onClick={() => setShowDatesModal(false)} className="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
            </div>
            
            <div className="p-6">
              <div className="relative border-l-2 border-slate-200 ml-3 space-y-8">
                
                {/* 前測 */}
                <div className="relative">
                  <div className="absolute -left-[21px] bg-slate-200 w-4 h-4 rounded-full border-4 border-white"></div>
                  <div className="pl-6">
                    <h4 className="text-sm font-bold text-slate-500">🟢 階段一：前測基準</h4>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> 2026/03/04 - 03/10
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 bg-slate-50 p-1.5 rounded">雙主機測量體重、體脂取平均值</p>
                  </div>
                </div>

                {/* 期中 */}
                <div className="relative">
                  <div className="absolute -left-[21px] bg-blue-500 w-4 h-4 rounded-full border-4 border-white shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"></div>
                  <div className="pl-6">
                    <h4 className="text-sm font-bold text-blue-600">🔵 階段二：期中測量</h4>
                    <p className="text-xs text-slate-600 mt-1 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-blue-500" /> 2026/04/15 - 04/20
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 bg-blue-50 p-1.5 rounded">單機測量，檢視團隊目前加成進度</p>
                  </div>
                </div>

                {/* 後測結算 */}
                <div className="relative">
                  <div className="absolute -left-[21px] bg-amber-500 w-4 h-4 rounded-full border-4 border-white shadow-[0_0_0_2px_rgba(245,158,11,0.2)]"></div>
                  <div className="pl-6">
                    <h4 className="text-sm font-bold text-amber-600">🏆 階段三：最終後測結算</h4>
                    <p className="text-xs text-slate-600 mt-1 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-amber-500" /> 2026/05/25 - 05/31
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 bg-amber-50 p-1.5 rounded border border-amber-100">雙主機測量，一翻兩瞪眼！決定最終排行</p>
                  </div>
                </div>

              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50">
               <button onClick={() => setShowDatesModal(false)} className="w-full bg-slate-800 text-white py-2.5 rounded-xl font-bold hover:bg-slate-700 transition">
                 繼續努力！
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe area helper class for iOS */}
      <style dangerouslySetInnerHTML={{__html: `
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 1rem); }
      `}} />
    </div>
  );
}