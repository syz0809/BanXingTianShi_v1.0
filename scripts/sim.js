/* 仿真数据引擎：随机生成车内状态，并驱动 UI 绑定 */
(function(){
  const binders = Array.from(document.querySelectorAll("[data-bind]"));
  const warnList = document.getElementById("warnings");

  const state = {
    engineOn: true,
    childPresent: true,
    seatbeltOn: true,
    posture: "upright", // upright | lean | away
    drowsy: false,
    temp: 26,
    time: 0
  };

  function rand(n){ return Math.random()*n; }
  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  // Controls (safety.html)
  const ctrlIds = ["engine","present","belt"];
  ctrlIds.forEach(id=>{
    const el = document.getElementById("ctrl-"+id);
    if(!el) return;
    el.addEventListener("switch-change", (e)=>{
      const v = e.detail.checked;
      if(id==="engine") state.engineOn = v;
      if(id==="present") state.childPresent = v;
      if(id==="belt") state.seatbeltOn = v;
      render(); 
    });
  });

  // Start/Stop on index
  const startBtn = document.getElementById("btn-start-sim");
  const stopBtn = document.getElementById("btn-stop-sim");
  let timer = null;
  startBtn && startBtn.addEventListener("click",()=>{ if(timer) return; timer = setInterval(tick, 1200); angelToast("仿真已启动"); });
  stopBtn && stopBtn.addEventListener("click",()=>{ clearInterval(timer); timer=null; angelToast("仿真已暂停"); });

  function tick(){
    state.time += 1;
    // temp drift
    const drift = state.engineOn ? (Math.random()-.5)*0.6 : (Math.random())*1.2;
    state.temp = Math.max(-5, Math.min(50, state.temp + drift));
    // posture / drowsy random flip
    if(rand(1) > .7) state.posture = pick(["upright","lean","away"]);
    state.drowsy = rand(1) > .85;
    render();
  }

  function render(){
    binders.forEach(el=>{
      const k = el.getAttribute("data-bind");
      let v = state[k];
      if(k==="temp") v = Math.round(state.temp*10)/10 + "℃";
      if(k==="engineOn") v = state.engineOn ? "运行中" : "已熄火";
      if(k==="childPresent") v = state.childPresent ? "在座" : "不在座";
      if(k==="seatbeltOn") v = state.seatbeltOn ? "已系好" : "未系好";
      if(k==="posture"){
        v = state.posture==="upright"?"端正":state.posture==="lean"?"倾斜":"疑似离座";
      }
      if(k==="drowsy") v = state.drowsy ? "可能昏睡" : "清醒";
      el.textContent = v;
    });

    // Warn rules
    const warns = [];
    if(!state.seatbeltOn && state.childPresent) warns.push("安全带未系好");
    if(state.temp>=35) warns.push("高温风险");
    if(state.temp<=5) warns.push("低温风险");
    if(state.posture==="away") warns.push("疑似离座");
    if(!state.engineOn && state.childPresent) warns.push("车辆熄火仍检测到在座");
    if(state.drowsy) warns.push("可能昏睡");

    if(warnList){
      warnList.innerHTML = "";
      if(!warns.length){
        const li = document.createElement("li"); li.textContent="无告警";
        warnList.appendChild(li);
      }else{
        warns.forEach(w=>{ const li = document.createElement("li"); li.textContent=w; warnList.appendChild(li); });
      }
    }
  }

  // initial
  render();
  // Auto start on index
  if(document.getElementById("btn-start-sim")){ setTimeout(()=>{ const e = new Event("click"); document.getElementById("btn-start-sim").dispatchEvent(e); }, 300); }
})();
